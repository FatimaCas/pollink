import { guardRoble } from "@/src/core/roble/guard";
import { Clock, systemClock } from "@/src/core/utils/clock";
import { FollowsFailure } from "../../domain/FollowsFailure";
import { FollowRepository } from "../../domain/repositories/FollowRepository";
import { FollowDataSource } from "../datasources/FollowDataSource";

// Reglas de «seguir»: decide y traduce, no habla con Roble.
export class FollowRepositoryImpl implements FollowRepository {
  constructor(
    private readonly source: FollowDataSource,
    private readonly clock: Clock = systemClock,
  ) {}

  async follow({ followerId, followedId }: { followerId: string; followedId: string }) {
    if (!followerId || !followedId) throw new FollowsFailure("Falta la persona.");
    if (followerId === followedId) throw new FollowsFailure("No puedes seguirte a ti mismo.");
    // Lectura estricta: si falla, la excepción sube y no se inserta a ciegas.
    const rows = await this.rows({ follower_id: followerId, followed_id: followedId });
    if (rows.length > 0) return;
    await this.guard(() =>
      this.source.createFollow({ follower_id: followerId, followed_id: followedId, createdAt: this.clock().toISOString() }),
    );
  }

  async unfollow({ followerId, followedId }: { followerId: string; followedId: string }) {
    const rows = await this.rows({ follower_id: followerId, followed_id: followedId });
    for (const row of rows) await this.guard(() => this.source.deleteFollow(String(row._id)));
  }

  async isFollowing({ followerId, followedId }: { followerId: string; followedId: string }) {
    return (await this.rows({ follower_id: followerId, followed_id: followedId })).length > 0;
  }

  async followingIds(userId: string) {
    const rows = await this.rows({ follower_id: userId });
    return [...new Set(rows.map((r) => String(r.followed_id ?? "")).filter(Boolean))];
  }

  async followersCount(userId: string) {
    const rows = await this.rows({ followed_id: userId });
    return new Set(rows.map((r) => String(r.follower_id ?? "")).filter(Boolean)).size;
  }

  private rows(filters: Record<string, unknown>) {
    return this.guard(() => this.source.readFollows(filters));
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new FollowsFailure(message));
  }
}
