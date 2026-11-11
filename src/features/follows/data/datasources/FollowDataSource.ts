import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre `user_follow`.
// Devuelve filas tal como llegan; decidir es del repositorio.
export interface FollowDataSource {
  // Filas de `user_follow` que cumplen los filtros (`follower_id`, `followed_id`).
  readFollows(filters: Row): Promise<Row[]>;
  createFollow(row: Row): Promise<void>;
  deleteFollow(id: string): Promise<void>;
}
