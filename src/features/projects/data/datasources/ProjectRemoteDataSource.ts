import { RobleClient } from "@/src/core/roble/RobleClient";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { encodeLists } from "./encodeLists";
import { ProjectDataSource } from "./ProjectDataSource";

// Habla con Roble sobre proyectos. No decide nada y deja subir las excepciones.
// `project` es pública: sin cuenta o como invitado se lee con `publicRead`.
export class ProjectRemoteDataSource implements ProjectDataSource {
  constructor(private readonly client: RobleClient) {}

  async readProject(projectId: string) {
    const rows = await this.client.readPublicOrPrivate(TABLES.project, { _id: projectId });
    return rows[0] ?? null;
  }

  readProjects(filters?: Row) {
    return this.client.readPublicOrPrivate(TABLES.project, filters);
  }

  createProject(row: Row) {
    return this.client.db.create(TABLES.project, encodeLists(row));
  }

  async updateProject(id: string, fields: Row) {
    await this.client.db.update(TABLES.project, id, encodeLists(fields));
  }

  async deleteProject(id: string) {
    await this.client.db.delete(TABLES.project, id);
  }

  async readMembers(filters?: Row) {
    // `project_member` es pública: un invitado o quien no inició sesión también la lee.
    return this.client.readPublicOrPrivate(TABLES.projectMember, filters);
  }
}
