import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { TrustInMemoryDataSource } from "./data/datasources/TrustInMemoryDataSource";
import { TrustRemoteDataSource } from "./data/datasources/TrustRemoteDataSource";
import { TrustRepositoryImpl } from "./data/repositories/TrustRepositoryImpl";

// Las dependencias de la feature `trust` (responsable: B).

export function registerTrust(c: Container, client: RobleClient): void {
  c.register(TOKENS.TrustRepo, new TrustRepositoryImpl(new TrustRemoteDataSource(client)));
}

// Los indicadores salen de las estancias, los proyectos y las tareas que
// siembran `members`, `projects` y `tasks`: aquí no se siembra nada.
export function registerTrustLocal(c: Container, data: DummyData): void {
  c.register(TOKENS.TrustRepo, new TrustRepositoryImpl(new TrustInMemoryDataSource(data)));
}
