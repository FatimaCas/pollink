import { DummyData, matchesRow } from "@/src/core/data/dummyData";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { FollowDataSource } from "./FollowDataSource";

// `user_follow` en memoria: las mismas filas que devolvería Roble.
export class FollowInMemoryDataSource implements FollowDataSource {
  constructor(private readonly data: DummyData) {}

  async readFollows(filters: Row) {
    await this.data.delay();
    return this.data
      .table(TABLES.userFollow)
      .filter((r) => matchesRow(r, filters))
      .map((r) => ({ ...r }));
  }

  async createFollow(row: Row) {
    await this.data.delay();
    this.data.table(TABLES.userFollow).push({ _id: this.data.nextId("fl"), ...row });
  }

  async deleteFollow(id: string) {
    await this.data.delay();
    const rows = this.data.table(TABLES.userFollow);
    const index = rows.findIndex((r) => r._id === id);
    if (index >= 0) rows.splice(index, 1);
  }
}
