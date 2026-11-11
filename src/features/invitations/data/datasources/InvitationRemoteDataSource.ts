import { RobleClient } from "@/src/core/roble/RobleClient";
import { Row } from "@/src/core/roble/guard";
import { QUERIES, TABLES } from "@/src/core/roble/tables";
import { InvitationDataSource } from "./InvitationDataSource";

// Habla con Roble sobre invitaciones. No decide nada y deja subir las excepciones.
export class InvitationRemoteDataSource implements InvitationDataSource {
  constructor(private readonly client: RobleClient) {}

  async findUserByEmail(email: string) {
    const result = await this.client.db.executeQueryByName(QUERIES.userByEmail, [email]);
    return (result.rows[0] as Row | undefined) ?? null;
  }

  readInvitations(filters: Row) {
    return this.client.db.read(TABLES.projectInvitation, filters);
  }

  // El servidor responde 200 aunque rechace filas: devuelve solo las que entraron
  // y el repositorio compara cuántas pidió.
  async createInvitations(rows: Row[]) {
    const result = await this.client.db.createMany(TABLES.projectInvitation, rows);
    return result.inserted;
  }

  async updateInvitation(id: string, fields: Row) {
    await this.client.db.update(TABLES.projectInvitation, id, fields);
  }

  async deleteInvitation(id: string) {
    await this.client.db.delete(TABLES.projectInvitation, id);
  }
}
