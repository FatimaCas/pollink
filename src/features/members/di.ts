import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { MembersInMemoryDataSource } from "./data/datasources/MembersInMemoryDataSource";
import { MembersRemoteDataSource } from "./data/datasources/MembersRemoteDataSource";
import { MembersRepositoryImpl } from "./data/repositories/MembersRepositoryImpl";

// Las dependencias de la feature `members` (responsable: D).

export function registerMembers(c: Container, client: RobleClient): void {
  c.register(TOKENS.MembersRepo, new MembersRepositoryImpl(new MembersRemoteDataSource(client)));
}

export function registerMembersLocal(c: Container, data: DummyData): void {
  c.register(TOKENS.MembersRepo, new MembersRepositoryImpl(new MembersInMemoryDataSource(data)));
}
