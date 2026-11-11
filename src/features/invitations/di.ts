import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { InvitationInMemoryDataSource } from "./data/datasources/InvitationInMemoryDataSource";
import { InvitationRemoteDataSource } from "./data/datasources/InvitationRemoteDataSource";
import { InvitationRepositoryImpl } from "./data/repositories/InvitationRepositoryImpl";

// Las dependencias de la feature `invitations` (responsable: C).

export function registerInvitations(c: Container, client: RobleClient): void {
  c.register(TOKENS.InvitationRepo, new InvitationRepositoryImpl(new InvitationRemoteDataSource(client)));
}

export function registerInvitationsLocal(c: Container, data: DummyData): void {
  c.register(TOKENS.InvitationRepo, new InvitationRepositoryImpl(new InvitationInMemoryDataSource(data)));
}
