import { useCallback, useEffect, useRef, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { DiscoverProject } from "../../domain/entities/DiscoverProject";
import { sortForMode } from "../../domain/entities/FeedMode";
import { FilterOption } from "../../domain/entities/ProjectFilter";
import { DiscoverRepository } from "../../domain/repositories/DiscoverRepository";
import { FEED_PAGE_SIZE } from "./useDiscoverViewModel";
import { useSavedToggle } from "./useSavedToggle";

// Los chips de Explorar: «Todos», «Destacados» (los de más avance primero) o
// una carrera (su clave normalizada).
export type ExploreChip = { kind: "all" } | { kind: "featured" } | { kind: "career"; key: string };

// Cuántas carreras se ofrecen como chip: las de más proyectos.
export const EXPLORE_CAREER_CHIPS = 6;
// Espera tras la última tecla antes de buscar.
export const SEARCH_DEBOUNCE_MS = 300;

// Estado de Explorar: el texto, el chip elegido y los resultados paginados.
// Sin texto y con «Todos» no se busca nada: la pantalla muestra la abeja.
export function useExploreViewModel() {
  const repo = useInject<DiscoverRepository>(TOKENS.DiscoverRepo);
  const snackbar = useSnackbar();
  const { savedIds, toggleSaved } = useSavedToggle();

  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<ExploreChip>({ kind: "all" });
  const [careers, setCareers] = useState<FilterOption[]>([]);
  const [loaded, setLoaded] = useState<DiscoverProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada búsqueda lleva un número: si llega una vieja después de una nueva, se ignora.
  const ticket = useRef(0);
  const loadedCount = useRef(0);
  useEffect(() => {
    loadedCount.current = loaded.length;
  }, [loaded]);

  const career = chip.kind === "career" ? chip.key : null;
  const idle = query.trim() === "" && chip.kind === "all";

  // Las carreras con más proyectos, para los chips. Si fallan, quedan «Todos» y «Destacados».
  useEffect(() => {
    let cancelled = false;
    repo
      .filterOptions({ career: null, onlyOpen: false })
      .then((options) => {
        if (cancelled) return;
        const top = [...options.careers]
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
          .slice(0, EXPLORE_CAREER_CHIPS);
        setCareers(top);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [repo]);

  // El texto se busca cuando se deja de escribir.
  useEffect(() => {
    const id = setTimeout(() => setQuery(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text]);

  // La búsqueda que toca (`null` en reposo) y la última que respondió: mientras
  // no coinciden, se está cargando.
  const searchKey = idle ? null : `${career ?? ""}|${query}`;
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const loading = searchKey !== null && resolvedKey !== searchKey;

  const search = useCallback(
    async (q: string, c: string | null, key: string) => {
      const mine = ++ticket.current;
      try {
        const page = await repo.searchPage({ text: q, career: c, limit: FEED_PAGE_SIZE, offset: 0 });
        if (mine !== ticket.current) return;
        setLoaded(page.projects);
        setTotal(page.total);
        setError(null);
      } catch (e) {
        if (mine !== ticket.current) return;
        setLoaded([]);
        setTotal(0);
        setError(messageOf(e));
      }
      setResolvedKey(key);
    },
    [repo],
  );

  useEffect(() => {
    // En reposo no se busca, y una búsqueda en vuelo queda descartada. Lo que
    // quedó cargado no se ve (`projects` sale vacío) y la próxima búsqueda lo
    // reemplaza.
    if (searchKey === null) {
      ticket.current++;
      return;
    }
    (async () => {
      await search(query, career, searchKey);
    })();
  }, [searchKey, query, career, search]);

  const retry = useCallback(() => {
    if (searchKey === null) return;
    setResolvedKey(null);
    return search(query, career, searchKey);
  }, [search, query, career, searchKey]);

  const loadMore = useCallback(async () => {
    if (idle || loading || loadingMore || loadedCount.current >= total) return;
    const mine = ticket.current;
    setLoadingMore(true);
    try {
      const page = await repo.searchPage({ text: query, career, limit: FEED_PAGE_SIZE, offset: loadedCount.current });
      if (mine !== ticket.current) return;
      setLoaded((current) => {
        const seen = new Set(current.map((p) => p.id));
        return [...current, ...page.projects.filter((p) => !seen.has(p.id))];
      });
      setTotal(page.total);
    } catch (e) {
      if (mine === ticket.current) snackbar(messageOf(e), { error: true });
    } finally {
      setLoadingMore(false);
    }
  }, [repo, idle, query, career, loading, loadingMore, total, snackbar]);

  const projects = idle ? [] : chip.kind === "featured" ? sortForMode(loaded, "featured") : loaded;

  return {
    text,
    setText,
    chip,
    setChip,
    careers,
    idle,
    projects,
    total,
    loading,
    loadingMore,
    error,
    retry,
    loadMore,
    savedIds,
    toggleSaved,
  };
}
