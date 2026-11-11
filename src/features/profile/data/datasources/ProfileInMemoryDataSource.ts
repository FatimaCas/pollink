import { DummyData } from "@/src/core/data/dummyData";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { ProfileDataSource } from "./ProfileDataSource";

// `profile` en memoria: las mismas filas que devolvería Roble.
export class ProfileInMemoryDataSource implements ProfileDataSource {
  constructor(private readonly data: DummyData) {}

  currentUserId() {
    return (this.data.session?.userId as string | undefined) ?? null;
  }

  async readRowOf(userId: string) {
    await this.data.delay();
    const row = this.data.table(TABLES.profile).find((r) => r._owner === userId);
    return row ? { ...row } : null;
  }

  async readRowsOf(userIds: string[]) {
    await this.data.delay();
    return this.data
      .table(TABLES.profile)
      .filter((r) => userIds.includes(r._owner))
      .map((r) => ({ ...r }));
  }

  async createRow(row: Row) {
    await this.data.delay();
    // Roble pone `_owner` con la persona de la sesión; aquí igual.
    const created = { _id: this.data.nextId("pf"), _owner: this.currentUserId(), ...row };
    this.data.table(TABLES.profile).push(created);
    return { ...created };
  }

  async updateRow(id: string, fields: Row) {
    await this.data.delay();
    const row = this.data.table(TABLES.profile).find((r) => r._id === id);
    if (!row) throw new Error("La fila de perfil no existe.");
    Object.assign(row, fields);
  }
}
