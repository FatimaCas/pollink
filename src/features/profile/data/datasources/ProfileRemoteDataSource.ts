import { RobleClient } from "@/src/core/roble/RobleClient";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { ProfileDataSource } from "./ProfileDataSource";

// Habla con Roble sobre `profile`. No decide nada y deja subir las excepciones.
// La fila de una persona es la que tiene `_owner` igual a su `userId`.
export class ProfileRemoteDataSource implements ProfileDataSource {
  constructor(private readonly client: RobleClient) {}

  currentUserId() {
    return this.client.currentUserId;
  }

  async readRowOf(userId: string) {
    const rows = await this.client.db.read(TABLES.profile, { _owner: userId });
    // El servidor ya filtra; esto evita devolver la fila de otra persona si el
    // filtro no se aplicara.
    return rows.find((r: Row) => String(r._owner) === userId) ?? null;
  }

  async readRowsOf(userIds: string[]) {
    const rows = await Promise.all(userIds.map((id) => this.readRowOf(id)));
    return rows.filter((r): r is Row => r !== null);
  }

  createRow(row: Row) {
    return this.client.db.create(TABLES.profile, row);
  }

  async updateRow(id: string, fields: Row) {
    await this.client.db.update(TABLES.profile, id, fields);
  }
}
