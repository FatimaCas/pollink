import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { ProjectInMemoryDataSource } from "./data/datasources/ProjectInMemoryDataSource";
import { ProjectRemoteDataSource } from "./data/datasources/ProjectRemoteDataSource";
import { ProjectRepositoryImpl } from "./data/repositories/ProjectRepositoryImpl";

// Las dependencias de la feature `projects` (responsable: C).

export function registerProjects(c: Container, client: RobleClient): void {
  c.register(TOKENS.ProjectRepo, new ProjectRepositoryImpl(new ProjectRemoteDataSource(client)));
}

// Los proyectos de demo (con la estancia de su creador) los siembra
// `registerDiscoverLocal`, que corre antes: aquí no se siembra nada.
export function registerProjectsLocal(c: Container, data: DummyData): void {
  c.register(TOKENS.ProjectRepo, new ProjectRepositoryImpl(new ProjectInMemoryDataSource(data)));
}
