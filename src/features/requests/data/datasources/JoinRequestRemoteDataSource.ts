import { RobleClient } from "@/src/core/roble/RobleClient";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { JoinRequestDataSource } from "./JoinRequestDataSource";

// Habla con Roble sobre `project_join_request`. No decide nada y deja subir las excepciones.
export class JoinRequestRemoteDataSource implements JoinRequestDataSource {
  constructor(private readonly client: RobleClient) {}

  readRequests(filters?: Row) {
    return this.client.db.read(TABLES.projectJoinRequest, filters);
  }

  createRequest(row: Row) {
    return this.client.db.create(TABLES.projectJoinRequest, row);
  }

  async updateRequest(id: string, fields: Row) {
    await this.client.db.update(TABLES.projectJoinRequest, id, fields);
  }

  async readProject(projectId: string) {
    const rows = await this.client.readPublicOrPrivate(TABLES.project, { _id: projectId });
    return rows[0] ?? null;
  }
}
