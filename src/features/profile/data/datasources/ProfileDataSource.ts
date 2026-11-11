import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre `profile`.
// Devuelve filas tal como llegan; convertirlas y decidir es del repositorio.
export interface ProfileDataSource {
  // El `userId` de la sesión, o `null` si no hay.
  currentUserId(): string | null;
  // La fila de `userId` (cualquier persona), o `null` si no tiene.
  readRowOf(userId: string): Promise<Row | null>;
  // Las filas de varias personas, una por cada una que tenga.
  readRowsOf(userIds: string[]): Promise<Row[]>;
  createRow(row: Row): Promise<Row>;
  // Escribe solo las columnas de `fields` en la fila `id`.
  updateRow(id: string, fields: Row): Promise<void>;
}
