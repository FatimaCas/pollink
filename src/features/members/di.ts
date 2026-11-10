import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { RobleClient } from "@/src/core/roble/RobleClient";

// Las dependencias de la feature `members` (responsable: D). `appContainer` y
// `localContainer` ya llaman a estas funciones: registrar el repositorio de la
// feature se hace aquí, sin tocar los contenedores.
//
// Pendiente (tarea D1): registrar `TOKENS.MembersRepo`, por ejemplo
//   c.register(TOKENS.MembersRepo, new XxxRepositoryImpl(new XxxRemoteDataSource(client)));

export function registerMembers(c: Container, client: RobleClient): void {}

// Lo mismo con el datasource en memoria (opcional). Si la feature lo tiene,
// siembra aquí sus filas: `data.table(TABLES.xxx).push(...)`.
export function registerMembersLocal(c: Container, data: DummyData): void {}
