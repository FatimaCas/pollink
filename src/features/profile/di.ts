import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { RobleClient } from "@/src/core/roble/RobleClient";

// Las dependencias de la feature `profile` (responsable: B). `appContainer` y
// `localContainer` ya llaman a estas funciones: registrar el repositorio de la
// feature se hace aquí, sin tocar los contenedores.
//
// Pendiente (tarea B1): registrar `TOKENS.ProfileRepo`, por ejemplo
//   c.register(TOKENS.ProfileRepo, new XxxRepositoryImpl(new XxxRemoteDataSource(client)));

export function registerProfile(c: Container, client: RobleClient): void {}

// Lo mismo con el datasource en memoria (opcional). Si la feature lo tiene,
// siembra aquí sus filas: `data.table(TABLES.xxx).push(...)`.
export function registerProfileLocal(c: Container, data: DummyData): void {}
