import { useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { EMPTY_OPTIONS, FilterOptions, NO_FILTER, ProjectFilter } from "../../domain/entities/ProjectFilter";
import { DiscoverRepository } from "../../domain/repositories/DiscoverRepository";

// El estado de la hoja de filtros: un borrador que solo se aplica con el botón
// primario, las opciones de los selectores y cuántos proyectos dará el borrador
// antes de aplicarlo. Vive mientras la hoja está abierta (se monta al abrirla),
// así que cerrarla descarta el borrador y abrirla parte de lo aplicado.
export function useFilterSheetViewModel(applied: ProjectFilter) {
  const repo = useInject<DiscoverRepository>(TOKENS.DiscoverRepo);
  const [draft, setDraft] = useState<ProjectFilter>(applied);
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  // El conteo lleva la clave del borrador al que pertenece: uno viejo no se muestra.
  const [counted, setCounted] = useState<{ key: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { career, skill, onlyOpen } = draft;
  const draftKey = `${career ?? ""}|${skill ?? ""}|${onlyOpen}`;

  // Las habilidades dependen de la carrera, y las dos del «solo abiertos».
  useEffect(() => {
    let cancelled = false;
    repo
      .filterOptions({ career, onlyOpen })
      .then((loaded) => {
        if (cancelled) return;
        setOptions(loaded);
        setError(null);
        // Una habilidad que ya no existe con esa carrera se limpia sola.
        setDraft((d) => (d.skill && !loaded.skills.some((s) => s.key === d.skill) ? { ...d, skill: null } : d));
      })
      .catch((e) => !cancelled && setError(messageOf(e)));
    return () => {
      cancelled = true;
    };
  }, [repo, career, onlyOpen]);

  useEffect(() => {
    let cancelled = false;
    repo
      .feedPage({ filter: { career, skill, onlyOpen }, limit: 1, offset: 0 })
      .then((page) => !cancelled && setCounted({ key: draftKey, total: page.total }))
      .catch(() => !cancelled && setCounted(null));
    return () => {
      cancelled = true;
    };
  }, [repo, career, skill, onlyOpen, draftKey]);

  return {
    draft,
    options,
    resultCount: counted?.key === draftKey ? counted.total : null,
    error,
    // Cambiar la carrera suelta la habilidad: sus opciones cambian.
    setCareer: (key: string | null) => setDraft((d) => ({ ...d, career: key, skill: null })),
    setSkill: (key: string | null) => setDraft((d) => ({ ...d, skill: key })),
    setOnlyOpen: (value: boolean) => setDraft((d) => ({ ...d, onlyOpen: value })),
    clear: () => setDraft(NO_FILTER),
  };
}
