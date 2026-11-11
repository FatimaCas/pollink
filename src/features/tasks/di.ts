import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { TaskInMemoryDataSource } from "./data/datasources/TaskInMemoryDataSource";
import { TaskRemoteDataSource } from "./data/datasources/TaskRemoteDataSource";
import { TaskRepositoryImpl } from "./data/repositories/TaskRepositoryImpl";

// Las dependencias de la feature `tasks` (responsable: D). Los contenedores
// llaman a `registerMembers` antes que a esta función: el repositorio de tareas
// escribe los contadores de las estancias a través de `MembersRepository`.

export function registerTasks(c: Container, client: RobleClient): void {
  c.register(
    TOKENS.TaskRepo,
    new TaskRepositoryImpl(new TaskRemoteDataSource(client), c.resolve<MembersRepository>(TOKENS.MembersRepo)),
  );
}

export function registerTasksLocal(c: Container, data: DummyData): void {
  c.register(
    TOKENS.TaskRepo,
    new TaskRepositoryImpl(new TaskInMemoryDataSource(data), c.resolve<MembersRepository>(TOKENS.MembersRepo)),
  );
}
