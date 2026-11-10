import { AuthInMemoryDataSource } from "@/src/features/auth/data/datasources/AuthInMemoryDataSource";
import { AuthRepositoryImpl } from "@/src/features/auth/data/repositories/AuthRepositoryImpl";
import { DummyData } from "../data/dummyData";
import { Container } from "./container";
import { TOKENS } from "./tokens";

// Los mismos repositorios, con los datasources de memoria. Es lo que usa la
// prueba de integración y sirve para trabajar en la UI sin servidor
// (`EXPO_PUBLIC_DATA_SOURCE=local`). Que solo cambie el datasource es la prueba
// de que la separación vale. Solo se registran las features que tienen
// datasource en memoria.
export function createLocalContainer(data: DummyData = new DummyData()): Container {
  return new Container().register(TOKENS.AuthRepo, new AuthRepositoryImpl(new AuthInMemoryDataSource(data)));
}
