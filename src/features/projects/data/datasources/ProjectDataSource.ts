import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre `project` (y leer de
// `project_member`, para contar miembros y saber en qué anda una persona).
// Devuelve filas tal como llegan; convertirlas y decidir es del repositorio.
export interface ProjectDataSource {
  // La fila del proyecto, o `null` si no existe.
  readProject(projectId: string): Promise<Row | null>;
  // Filas de `project` que cumplen `filters` (todas si no se pasa).
  readProjects(filters?: Row): Promise<Row[]>;
  createProject(row: Row): Promise<Row>;
  // Escribe solo las columnas de `fields` en la fila `id`.
  updateProject(id: string, fields: Row): Promise<void>;
  deleteProject(id: string): Promise<void>;
  // Filas de `project_member` que cumplen `filters`. Vacío para quien no puede
  // leer la tabla (un invitado: `project_member` no es pública).
  readMembers(filters?: Row): Promise<Row[]>;
}
