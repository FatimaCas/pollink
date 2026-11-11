import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { TABLES } from "@/src/core/roble/tables";
import { ProfileInMemoryDataSource } from "./data/datasources/ProfileInMemoryDataSource";
import { ProfileRemoteDataSource } from "./data/datasources/ProfileRemoteDataSource";
import { ProfileRepositoryImpl } from "./data/repositories/ProfileRepositoryImpl";

// Las dependencias de la feature `profile` (responsable: B).

export function registerProfile(c: Container, client: RobleClient): void {
  c.register(TOKENS.ProfileRepo, new ProfileRepositoryImpl(new ProfileRemoteDataSource(client)));
}

export function registerProfileLocal(c: Container, data: DummyData): void {
  // Un perfil de demo por cada cuenta de demo.
  const careers = [
    { program: "Ingeniería de Sistemas", institution: "Universidad del Norte" },
    { program: "Diseño Gráfico", institution: "Universidad del Norte" },
    { program: "Ingeniería Industrial", institution: "Universidad del Norte" },
  ];
  const rows = data.table(TABLES.profile);
  if (rows.length === 0) {
    data.users.forEach((u, i) =>
      rows.push({
        _id: `pf_${i + 1}`,
        _owner: u.userId,
        name: u.name,
        career: careers[i % careers.length],
        skills: [],
        profilePicture: "",
        description: "",
      }),
    );
  }
  c.register(TOKENS.ProfileRepo, new ProfileRepositoryImpl(new ProfileInMemoryDataSource(data)));
}
