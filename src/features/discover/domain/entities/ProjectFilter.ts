import { normalizeLabel } from "@/src/core/utils/normalizeLabel";
import { DiscoverProject, isOpen } from "./DiscoverProject";

// Los filtros de Descubrir (spec 04). `career` y `skill` son claves
// normalizadas; `null` es «Todas».
export interface ProjectFilter {
  career: string | null;
  skill: string | null;
  onlyOpen: boolean;
}

export const NO_FILTER: ProjectFilter = { career: null, skill: null, onlyOpen: false };

export interface FilterOption {
  key: string;
  // La variante visible: la más frecuente, y en empate la primera alfabéticamente.
  label: string;
  count: number;
}

export interface FilterOptions {
  careers: FilterOption[];
  skills: FilterOption[];
}

// Las etiquetas visibles de lo elegido, para los chips de la barra.
export interface FilterLabels {
  career?: string;
  skill?: string;
}

export const EMPTY_OPTIONS: FilterOptions = { careers: [], skills: [] };

// Cuántos filtros hay puestos, de 0 a 3.
export function activeCount(filter: ProjectFilter): number {
  return (filter.career ? 1 : 0) + (filter.skill ? 1 : 0) + (filter.onlyOpen ? 1 : 0);
}

// ¿El proyecto cumple el filtro? Misma regla que el SQL del servidor; sirve para
// pruebas y para el modo en memoria.
export function matchesFilter(project: DiscoverProject, filter: ProjectFilter): boolean {
  if (filter.onlyOpen && !isOpen(project)) return false;
  if (filter.career && !project.jobs.some((j) => normalizeLabel(j) === filter.career)) return false;
  if (filter.skill && !project.skills.some((s) => normalizeLabel(s) === filter.skill)) return false;
  return true;
}
