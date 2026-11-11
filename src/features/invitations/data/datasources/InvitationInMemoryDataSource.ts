import { DummyData, matchesRow } from "@/src/core/data/dummyData";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { InvitationDataSource } from "./InvitationDataSource";

// `project_invitation` en memoria. Las cuentas salen de `DummyData.users`.
export class InvitationInMemoryDataSource implements InvitationDataSource {
  constructor(private readonly data: DummyData) {}

  async findUserByEmail(email: string) {
    await this.data.delay();
    const user = this.data.users.find((u) => String(u.email).toLowerCase() === email.toLowerCase());
    return user ? { user_id: user.userId, email: user.email } : null;
  }

  async readInvitations(filters: Row) {
    await this.data.delay();
    return this.data
      .table(TABLES.projectInvitation)
      .filter((r) => matchesRow(r, filters))
      .map((r) => ({ ...r }));
  }

  async createInvitations(rows: Row[]) {
    await this.data.delay();
    // Roble pone `_owner` con quien crea la fila.
    const owner = this.data.session?.userId ?? null;
    const created = rows.map((row) => ({ _id: this.data.nextId("inv"), _owner: owner, ...row }));
    this.data.table(TABLES.projectInvitation).push(...created);
    return created.map((r) => ({ ...r }));
  }

  async updateInvitation(id: string, fields: Row) {
    await this.data.delay();
    const row = this.data.table(TABLES.projectInvitation).find((r) => r._id === id);
    if (!row) throw new Error("La invitación no existe.");
    Object.assign(row, fields);
  }

  async deleteInvitation(id: string) {
    await this.data.delay();
    const rows = this.data.table(TABLES.projectInvitation);
    const index = rows.findIndex((r) => r._id === id);
    if (index >= 0) rows.splice(index, 1);
  }
}
