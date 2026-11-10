import { AuthRemoteDataSource } from "@/src/features/auth/data/datasources/AuthRemoteDataSource";
import { AuthRepositoryImpl } from "@/src/features/auth/data/repositories/AuthRepositoryImpl";
import { robleConfig } from "../roble/robleConfig";
import { RobleClient } from "../roble/RobleClient";
import { Container } from "./container";
import { TOKENS } from "./tokens";

// Composition root: the only place that knows which implementation backs each interface.
// What is chosen here is the data source; there is one repository per feature.
export function createAppContainer(): Container {
  const c = new Container();

  // Un solo cliente para toda la app: uno por pantalla daría a cada copia su propia sesión.
  const client = new RobleClient(robleConfig);

  return c
    .register(TOKENS.RobleClient, client)
    .register(TOKENS.AuthRepo, new AuthRepositoryImpl(new AuthRemoteDataSource(client)));
}
