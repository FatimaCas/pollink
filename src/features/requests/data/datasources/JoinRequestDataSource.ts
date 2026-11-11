import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre `project_join_request`.
// Devuelve filas tal como llegan; convertirlas y decidir es del repositorio.
export interface JoinRequestDataSource {
  // Filas de la tabla que cumplen los filtros de igualdad.
  readRequests(filters?: Row): Promise<Row[]>;
  createRequest(row: Row): Promise<Row>;
  // Escribe solo las columnas de `fields` en la fila `id`.
  updateRequest(id: string, fields: Row): Promise<void>;
  // La fila del proyecto (para saber si está cerrado), o `null`.
  readProject(projectId: string): Promise<Row | null>;
}
