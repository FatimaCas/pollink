import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { JoinRequestInMemoryDataSource } from "./data/datasources/JoinRequestInMemoryDataSource";
import { JoinRequestRemoteDataSource } from "./data/datasources/JoinRequestRemoteDataSource";
import { JoinRequestRepositoryImpl } from "./data/repositories/JoinRequestRepositoryImpl";

// Las dependencias de la feature `requests` (responsable: A).

export function registerRequests(c: Container, client: RobleClient): void {
  c.register(TOKENS.JoinRequestRepo, new JoinRequestRepositoryImpl(new JoinRequestRemoteDataSource(client)));
}

export function registerRequestsLocal(c: Container, data: DummyData): void {
  c.register(TOKENS.JoinRequestRepo, new JoinRequestRepositoryImpl(new JoinRequestInMemoryDataSource(data)));
}
