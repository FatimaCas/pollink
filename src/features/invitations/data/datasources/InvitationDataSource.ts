import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre `project_invitation`
// (y buscar cuentas por correo). Devuelve filas tal como llegan; convertirlas y
// decidir es del repositorio.
export interface InvitationDataSource {
  // La cuenta con ese correo (`{ user_id, email }`), o `null` si no existe.
  findUserByEmail(email: string): Promise<Row | null>;
  // Filas de `project_invitation` que cumplen `filters`.
  readInvitations(filters: Row): Promise<Row[]>;
  // Inserta varias filas de una vez y devuelve las creadas.
  createInvitations(rows: Row[]): Promise<Row[]>;
  // Escribe solo las columnas de `fields` en la fila `id`.
  updateInvitation(id: string, fields: Row): Promise<void>;
  deleteInvitation(id: string): Promise<void>;
}
