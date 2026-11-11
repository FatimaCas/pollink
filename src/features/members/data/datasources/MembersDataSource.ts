import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre `project_member`.
// Devuelve filas tal como llegan; convertirlas y decidir es del repositorio.
export interface MembersDataSource {
  // Filas de `project_member`: las de un proyecto, o todas si no se indica.
  readMembers(projectId?: string): Promise<Row[]>;
  createMember(row: Row): Promise<Row>;
  // Escribe solo las columnas de `fields` en la fila `id`.
  updateMember(id: string, fields: Row): Promise<void>;
  // La fila del proyecto (para saber quién es su creador: `_owner`), o `null`.
  readProject(projectId: string): Promise<Row | null>;
}
