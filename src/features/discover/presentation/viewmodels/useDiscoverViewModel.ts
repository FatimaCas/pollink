import { useCallback, useEffect, useRef, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { DiscoverProject } from "../../domain/entities/DiscoverProject";
import { FeedMode, sortForMode } from "../../domain/entities/FeedMode";
import { activeCount, FilterLabels, NO_FILTER, ProjectFilter } from "../../domain/entities/ProjectFilter";
import { DiscoverRepository } from "../../domain/repositories/DiscoverRepository";

export const FEED_PAGE_SIZE = 10;

// Estado del feed de Descubrir: la lista paginada, los filtros puestos, el modo
// («Para ti», «Destacados», «Comunidad») y cuáles proyectos están guardados.
export function useDiscoverViewModel() {
  const repo = useInject<DiscoverRepository>(TOKENS.DiscoverRepo);
  const session = useSession();
  const snackbar = useSnackbar();
  const userId = session.user?.userId ?? null;

  const [loaded, setLoaded] = useState<DiscoverProject[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilterState] = useState<ProjectFilter>(NO_FILTER);
  const [labels, setLabels] = useState<FilterLabels>({});
  const [mode, setMode] = useState<FeedMode>("forYou");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // El error de la primera página (sin lista que conservar).
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());

  // Cada carga lleva un número: si llega una vieja después de una nueva, se ignora.
  const ticket = useRef(0);
  const filterRef = useRef(filter);
  const loadedCount = useRef(0);
  useEffect(() => {
    loadedCount.current = loaded.length;
  }, [loaded]);

  const loadFirst = useCallback(
    // Quien llama decide si se ve el indicador de carga (`setLoading(true)`);
    // aquí solo se pide la página y se apaga al terminar.
    async (next: ProjectFilter, { silent = false }: { silent?: boolean } = {}) => {
      const mine = ++ticket.current;
      try {
        const page = await repo.feedPage({ filter: next, limit: FEED_PAGE_SIZE, offset: 0 });
        if (mine !== ticket.current) return;
        setLoaded(page.projects);
        setTotal(page.total);
        setError(null);
      } catch (e) {
        if (mine !== ticket.current) return;
        // Con la lista ya cargada, el fallo de una recarga no la borra.
        if (silent && loadedCount.current > 0) snackbar(messageOf(e), { error: true });
        else setError(messageOf(e));
      } finally {
        if (mine === ticket.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [repo, snackbar],
  );

  // La pantalla se monta con `key` = la persona de la sesión: cerrar o cambiar
  // de sesión la remonta, así que los filtros vuelven a su valor por defecto
  // (F-08) y el feed se recarga sin resetear estado a mano.
  useEffect(() => {
    (async () => {
      await loadFirst(NO_FILTER, { silent: true });
    })();
  }, [loadFirst]);
  // (arranca con `loading` en true: el primer indicador ya está puesto)

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    repo
      .savedIds(userId)
      .then((ids) => !cancelled && setSavedIds(new Set(ids)))
      .catch(() => !cancelled && setSavedIds(new Set()));
    return () => {
      cancelled = true;
    };
  }, [repo, userId]);

  const setFilter = useCallback(
    (next: ProjectFilter, nextLabels: FilterLabels = {}) => {
      filterRef.current = next;
      setFilterState(next);
      setLabels(nextLabels);
      setLoading(true);
      loadFirst(next);
    },
    [loadFirst],
  );

  const clearFilter = useCallback(() => setFilter(NO_FILTER), [setFilter]);

  // Quitar un chip conserva las etiquetas de los que quedan.
  const changeFilter = useCallback(
    (next: ProjectFilter) =>
      setFilter(next, { career: next.career ? labels.career : undefined, skill: next.skill ? labels.skill : undefined }),
    [setFilter, labels],
  );

  const reload = useCallback(() => {
    setRefreshing(true);
    return loadFirst(filterRef.current, { silent: true });
  }, [loadFirst]);

  const retry = useCallback(() => {
    setLoading(true);
    return loadFirst(filterRef.current);
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || loadedCount.current >= total) return;
    const mine = ticket.current;
    setLoadingMore(true);
    try {
      const page = await repo.feedPage({ filter: filterRef.current, limit: FEED_PAGE_SIZE, offset: loadedCount.current });
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
  }, [repo, loading, loadingMore, total, snackbar]);

  // Guardar no pide cuenta: a quien no tiene sesión se le abre una de invitado.
  const toggleSaved = useCallback(
    async (project: DiscoverProject) => {
      if (!(await session.ensureWritableSession())) return;
      const me = session.currentUser()?.userId;
      if (!me) return;
      const wasSaved = savedIds.has(project.id);
      const flip = (on: boolean) =>
        setSavedIds((current) => {
          const next = new Set(current);
          if (on) next.add(project.id);
          else next.delete(project.id);
          return next;
        });
      flip(!wasSaved);
      try {
        if (wasSaved) await repo.unsave({ userId: me, projectId: project.id });
        else await repo.save({ userId: me, projectId: project.id });
      } catch (e) {
        flip(wasSaved);
        snackbar(messageOf(e), { error: true });
      }
    },
    [repo, session, savedIds, snackbar],
  );

  const projects = sortForMode(loaded, mode);
  const filtered = activeCount(filter) > 0;

  return {
    projects,
    total,
    filter,
    filtered,
    labels,
    mode,
    setMode,
    setFilter,
    clearFilter,
    changeFilter,
    loading,
    loadingMore,
    refreshing,
    error,
    retry,
    reload,
    loadMore,
    savedIds,
    toggleSaved,
  };
}
