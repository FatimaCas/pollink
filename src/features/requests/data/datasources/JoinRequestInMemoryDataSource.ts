import { DummyData, matchesRow } from "@/src/core/data/dummyData";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { JoinRequestDataSource } from "./JoinRequestDataSource";

// Solicitudes en memoria: las mismas filas que devolvería Roble.
export class JoinRequestInMemoryDataSource implements JoinRequestDataSource {
  constructor(private readonly data: DummyData) {}

  async readRequests(filters?: Row) {
    await this.data.delay();
    return this.data
      .table(TABLES.projectJoinRequest)
      .filter((r) => matchesRow(r, filters))
      .map((r) => ({ ...r }));
  }

  async createRequest(row: Row) {
    await this.data.delay();
    const created = { _id: this.data.nextId("jr"), _owner: this.data.session?.userId ?? null, ...row };
    this.data.table(TABLES.projectJoinRequest).push(created);
    return { ...created };
  }

  async updateRequest(id: string, fields: Row) {
    await this.data.delay();
    const row = this.data.table(TABLES.projectJoinRequest).find((r) => r._id === id);
    if (!row) throw new Error("La solicitud no existe.");
    Object.assign(row, fields);
  }

  async readProject(projectId: string) {
    await this.data.delay();
    const row = this.data.table(TABLES.project).find((r) => r._id === projectId);
    return row ? { ...row } : null;
  }
}
