import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { AuthInMemoryDataSource } from "./data/datasources/AuthInMemoryDataSource";
import { AuthRemoteDataSource } from "./data/datasources/AuthRemoteDataSource";
import { AuthRepositoryImpl } from "./data/repositories/AuthRepositoryImpl";

// Las dependencias de la feature `auth` (responsable: A).

export function registerAuth(c: Container, client: RobleClient): void {
  c.register(TOKENS.AuthRepo, new AuthRepositoryImpl(new AuthRemoteDataSource(client)));
}

export function registerAuthLocal(c: Container, data: DummyData): void {
  c.register(TOKENS.AuthRepo, new AuthRepositoryImpl(new AuthInMemoryDataSource(data)));
}
