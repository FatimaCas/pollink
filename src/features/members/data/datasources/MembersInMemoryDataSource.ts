import { DummyData, matchesRow } from "@/src/core/data/dummyData";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { MembersDataSource } from "./MembersDataSource";

// `project_member` en memoria: las mismas filas que devolvería Roble.
export class MembersInMemoryDataSource implements MembersDataSource {
  constructor(private readonly data: DummyData) {}

  async readMembers(projectId?: string) {
    await this.data.delay();
    return this.data
      .table(TABLES.projectMember)
      .filter((r) => matchesRow(r, projectId ? { project_id: projectId } : undefined))
      .map((r) => ({ ...r }));
  }

  async createMember(row: Row) {
    await this.data.delay();
    const created = { _id: this.data.nextId("pm"), ...row };
    this.data.table(TABLES.projectMember).push(created);
    return { ...created };
  }

  async updateMember(id: string, fields: Row) {
    await this.data.delay();
    const row = this.data.table(TABLES.projectMember).find((r) => r._id === id);
    if (!row) throw new Error("La fila de miembro no existe.");
    Object.assign(row, fields);
  }

  async readProject(projectId: string) {
    await this.data.delay();
    const row = this.data.table(TABLES.project).find((r) => r._id === projectId);
    return row ? { ...row } : null;
  }
}
