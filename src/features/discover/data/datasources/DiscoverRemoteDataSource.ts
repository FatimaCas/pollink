import { RobleClient } from "@/src/core/roble/RobleClient";
import { Row } from "@/src/core/roble/guard";
import { QUERIES, TABLES } from "@/src/core/roble/tables";
import { DiscoverDataSource } from "./DiscoverDataSource";

// Habla con Roble. No decide nada y deja subir las excepciones.
export class DiscoverRemoteDataSource implements DiscoverDataSource {
  constructor(private readonly client: RobleClient) {}

  async queryFeed({ career, skill, onlyOpen, limit, offset }: Parameters<DiscoverDataSource["queryFeed"]>[0]) {
    const result = await this.client.db.executeQueryByName(QUERIES.filteredProjects, [
      career,
      skill,
      onlyOpen ? "true" : "false",
      limit,
      offset,
    ]);
    return result.rows;
  }

  async querySearch({ text, career, limit, offset }: Parameters<DiscoverDataSource["querySearch"]>[0]) {
    const result = await this.client.db.executeQueryByName(QUERIES.searchProjects, [text, career, limit, offset]);
    return result.rows;
  }

  async queryFilterOptions({ career, onlyOpen }: Parameters<DiscoverDataSource["queryFilterOptions"]>[0]) {
    const result = await this.client.db.executeQueryByName(QUERIES.filterOptions, [career, onlyOpen ? "true" : "false"]);
    return result.rows;
  }

  async readProject(projectId: string) {
    const rows = await this.client.readPublicOrPrivate(TABLES.project, { _id: projectId });
    return rows[0] ?? null;
  }

  readSaved(userId: string) {
    return this.client.db.read(TABLES.projectSaved, { user_id: userId });
  }

  async createSaved(row: Row) {
    await this.client.db.create(TABLES.projectSaved, row);
  }

  async deleteSaved(id: string) {
    await this.client.db.delete(TABLES.projectSaved, id);
  }
}
