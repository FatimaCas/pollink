import { RobleClient } from "@/src/core/roble/RobleClient";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { FollowDataSource } from "./FollowDataSource";

// Habla con Roble sobre `user_follow` (pública para lectura: se cuentan
// seguidores ajenos). No decide nada y deja subir las excepciones.
export class FollowRemoteDataSource implements FollowDataSource {
  constructor(private readonly client: RobleClient) {}

  readFollows(filters: Row) {
    return this.client.readPublicOrPrivate(TABLES.userFollow, filters);
  }

  async createFollow(row: Row) {
    await this.client.db.create(TABLES.userFollow, row);
  }

  async deleteFollow(id: string) {
    await this.client.db.delete(TABLES.userFollow, id);
  }
}
