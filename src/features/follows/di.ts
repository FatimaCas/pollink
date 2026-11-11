import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { FollowInMemoryDataSource } from "./data/datasources/FollowInMemoryDataSource";
import { FollowRemoteDataSource } from "./data/datasources/FollowRemoteDataSource";
import { FollowRepositoryImpl } from "./data/repositories/FollowRepositoryImpl";

// Las dependencias de la feature `follows`.

export function registerFollows(c: Container, client: RobleClient): void {
  c.register(TOKENS.FollowRepo, new FollowRepositoryImpl(new FollowRemoteDataSource(client)));
}

export function registerFollowsLocal(c: Container, data: DummyData): void {
  c.register(TOKENS.FollowRepo, new FollowRepositoryImpl(new FollowInMemoryDataSource(data)));
}
