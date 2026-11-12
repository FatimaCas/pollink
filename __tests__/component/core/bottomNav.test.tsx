import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import RootNavigator, { HomeTabKeys } from "@/src/navigation/RootNavigator";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";

jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../../support/sessionMock").fakeSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function setup() {
  const c = new Container()
    .register(
      TOKENS.DiscoverRepo,
      fake<DiscoverRepository>(
        {
          savedIds: async () => [],
          filterOptions: async () => ({ careers: [], skills: [] }),
          feedPage: async () => ({ projects: [], total: 0 }),
        },
        "DiscoverRepo",
      ),
    )
    .register(TOKENS.ProjectRepo, fake<ProjectRepository>({}, "ProjectRepo"))
    .register(TOKENS.InvitationRepo, fake<InvitationRepository>({}, "InvitationRepo"))
    .register(TOKENS.MembersRepo, fake<MembersRepository>({}, "MembersRepo"));
  return renderScreen(RootNavigator, c);
}

test("la barra lleva cuatro íconos sin texto, cada uno con su nombre accesible", async () => {
  setup();
  const names = {
    [HomeTabKeys.discover]: "Descubrir",
    [HomeTabKeys.create]: "Crear proyecto",
    [HomeTabKeys.projects]: "Proyectos",
    [HomeTabKeys.profile]: "Perfil",
  };
  for (const [key, label] of Object.entries(names)) {
    expect((await screen.findByTestId(key)).props.accessibilityLabel).toBe(label);
  }
  // Sin etiquetas: «Proyectos» y «Perfil» solo están como nombre accesible.
  expect(screen.queryByText("Proyectos")).toBeNull();
  expect(screen.queryByText("Perfil")).toBeNull();
});

test("el «+» abre Crear proyecto en vez de cambiar de pestaña", async () => {
  setup();
  const plus = await screen.findByTestId(HomeTabKeys.create);
  expect(screen.queryByText("Crear proyecto")).toBeNull();
  fireEvent.press(plus);
  expect((await screen.findAllByText("Crear proyecto")).length).toBeGreaterThan(0);
});
