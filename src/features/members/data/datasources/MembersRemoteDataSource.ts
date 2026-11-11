import { RobleClient } from "@/src/core/roble/RobleClient";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { MembersDataSource } from "./MembersDataSource";

// Habla con Roble sobre `project_member`. No decide nada y deja subir las excepciones.
export class MembersRemoteDataSource implements MembersDataSource {
  constructor(private readonly client: RobleClient) {}

  readMembers(projectId?: string) {
    return this.client.readPublicOrPrivate(TABLES.projectMember, projectId ? { project_id: projectId } : undefined);
  }

  createMember(row: Row) {
    return this.client.db.create(TABLES.projectMember, row);
  }

  async updateMember(id: string, fields: Row) {
    await this.client.db.update(TABLES.projectMember, id, fields);
  }

  async readProject(projectId: string) {
    const rows = await this.client.readPublicOrPrivate(TABLES.project, { _id: projectId });
    return rows[0] ?? null;
  }
}
