import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { RobleClient } from "@/src/core/roble/RobleClient";

// Las dependencias de la feature `discover` (responsable: A). `appContainer` y
// `localContainer` ya llaman a estas funciones: registrar el repositorio de la
// feature se hace aquí, sin tocar los contenedores.
//
// Pendiente (tarea A5): registrar `TOKENS.DiscoverRepo`, por ejemplo
//   c.register(TOKENS.DiscoverRepo, new XxxRepositoryImpl(new XxxRemoteDataSource(client)));

export function registerDiscover(c: Container, client: RobleClient): void {}

// Lo mismo con el datasource en memoria (opcional). Si la feature lo tiene,
// siembra aquí sus filas: `data.table(TABLES.xxx).push(...)`.
export function registerDiscoverLocal(c: Container, data: DummyData): void {}
