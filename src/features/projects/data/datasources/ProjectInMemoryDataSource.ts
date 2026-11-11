import { DummyData, matchesRow } from "@/src/core/data/dummyData";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { encodeLists } from "./encodeLists";
import { ProjectDataSource } from "./ProjectDataSource";

// `project` en memoria: las mismas filas que devolvería Roble (con `jobs` y
// `skills` como texto JSON).
export class ProjectInMemoryDataSource implements ProjectDataSource {
  constructor(private readonly data: DummyData) {}

  async readProject(projectId: string) {
    await this.data.delay();
    const row = this.data.table(TABLES.project).find((r) => r._id === projectId);
    return row ? { ...row } : null;
  }

  async readProjects(filters?: Row) {
    await this.data.delay();
    return this.data
      .table(TABLES.project)
      .filter((r) => matchesRow(r, filters))
      .map((r) => ({ ...r }));
  }

  async createProject(row: Row) {
    await this.data.delay();
    // Roble pone `_owner` con quien crea la fila.
    const created = { _id: this.data.nextId("p"), _owner: this.data.session?.userId ?? null, ...encodeLists(row) };
    this.data.table(TABLES.project).push(created);
    return { ...created };
  }

  async updateProject(id: string, fields: Row) {
    await this.data.delay();
    const row = this.data.table(TABLES.project).find((r) => r._id === id);
    if (!row) throw new Error("El proyecto no existe.");
    Object.assign(row, encodeLists(fields));
  }

  async deleteProject(id: string) {
    await this.data.delay();
    const rows = this.data.table(TABLES.project);
    const index = rows.findIndex((r) => r._id === id);
    if (index >= 0) rows.splice(index, 1);
  }

  async readMembers(filters?: Row) {
    await this.data.delay();
    return this.data
      .table(TABLES.projectMember)
      .filter((r) => matchesRow(r, filters))
      .map((r) => ({ ...r }));
  }
}
