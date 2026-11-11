import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre `project` (lectura) y
// `project_saved`. Devuelve filas tal como llegan; convertirlas es del repositorio.
export interface DiscoverDataSource {
  // `proyectos_filtrados`: claves normalizadas o '' para «todas».
  queryFeed(params: { career: string; skill: string; onlyOpen: boolean; limit: number; offset: number }): Promise<Row[]>;
  // `opciones_filtros_proyectos`.
  queryFilterOptions(params: { career: string; onlyOpen: boolean }): Promise<Row[]>;
  readProject(projectId: string): Promise<Row | null>;
  readSaved(userId: string): Promise<Row[]>;
  createSaved(row: Row): Promise<void>;
  deleteSaved(id: string): Promise<void>;
}
