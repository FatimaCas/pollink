import { RobleApiHttpException } from "roble-client";
import { DummyData } from "@/src/core/data/dummyData";
import { TABLES } from "@/src/core/roble/tables";
import { FollowInMemoryDataSource } from "@/src/features/follows/data/datasources/FollowInMemoryDataSource";
import { FollowRepositoryImpl } from "@/src/features/follows/data/repositories/FollowRepositoryImpl";
import { FollowsFailure } from "@/src/features/follows/domain/FollowsFailure";

function setup() {
  const data = new DummyData({ latencyMs: 0 });
  const repo = new FollowRepositoryImpl(new FollowInMemoryDataSource(data), () => new Date("2026-05-01T10:00:00Z"));
  return { data, repo };
}

test("seguir guarda una fila y isFollowing lo refleja", async () => {
  const { repo, data } = setup();
  await repo.follow({ followerId: "a", followedId: "b" });
  expect(await repo.isFollowing({ followerId: "a", followedId: "b" })).toBe(true);
  expect(await repo.isFollowing({ followerId: "b", followedId: "a" })).toBe(false);
  expect(data.table(TABLES.userFollow)[0]).toMatchObject({ follower_id: "a", followed_id: "b", createdAt: "2026-05-01T10:00:00.000Z" });
});

test("seguir dos veces no duplica la fila", async () => {
  const { repo, data } = setup();
  await repo.follow({ followerId: "a", followedId: "b" });
  await repo.follow({ followerId: "a", followedId: "b" });
  expect(data.table(TABLES.userFollow)).toHaveLength(1);
});

test("no se puede seguir a uno mismo", async () => {
  const { repo } = setup();
  await expect(repo.follow({ followerId: "a", followedId: "a" })).rejects.toBeInstanceOf(FollowsFailure);
});

test("dejar de seguir borra la fila, y si no la había no hace nada", async () => {
  const { repo } = setup();
  await repo.unfollow({ followerId: "a", followedId: "b" });
  await repo.follow({ followerId: "a", followedId: "b" });
  await repo.unfollow({ followerId: "a", followedId: "b" });
  expect(await repo.isFollowing({ followerId: "a", followedId: "b" })).toBe(false);
});

test("followingIds y followersCount cuentan por persona", async () => {
  const { repo } = setup();
  await repo.follow({ followerId: "a", followedId: "b" });
  await repo.follow({ followerId: "a", followedId: "c" });
  await repo.follow({ followerId: "d", followedId: "b" });
  expect((await repo.followingIds("a")).sort()).toEqual(["b", "c"]);
  expect(await repo.followersCount("b")).toBe(2);
  expect(await repo.followersCount("a")).toBe(0);
});

test("si Roble falla, el error llega como FollowsFailure", async () => {
  const failing = { readFollows: async () => { throw new RobleApiHttpException(500, "boom"); }, createFollow: async () => {}, deleteFollow: async () => {} };
  const repo = new FollowRepositoryImpl(failing);
  await expect(repo.isFollowing({ followerId: "a", followedId: "b" })).rejects.toBeInstanceOf(FollowsFailure);
});
