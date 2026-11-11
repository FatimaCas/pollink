import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { emptyProfile } from "@/src/features/profile/domain/entities/UserProfile";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { ProfileProjects } from "@/src/features/profile/presentation/components/ProfileProjects";
import { ProfileView } from "@/src/features/profile/presentation/components/ProfileView";
import ProfileScreen from "@/src/features/profile/presentation/screens/ProfileScreen";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { fake } from "../support/fake";
import { profile } from "../support/profileFixtures";
import { ownProject } from "../support/projectFixtures";
import { renderScreen } from "../support/renderScreen";

const mockNavigate = jest.fn();
let mockSessionOver: Record<string, unknown> = {};
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../support/sessionMock").fakeSession(mockSessionOver),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, addListener: () => () => {}, setOptions: () => {} }),
}));

function setup({ me = profile(), projects = [] as ReturnType<typeof ownProject>[], getMyProfile }: { me?: ReturnType<typeof profile>; projects?: ReturnType<typeof ownProject>[]; getMyProfile?: ProfileRepository["getMyProfile"] } = {}) {
  const c = new Container()
    .register(TOKENS.ProfileRepo, fake<ProfileRepository>({ ensureMyProfile: async () => {}, getMyProfile: getMyProfile ?? (async () => me) }, "ProfileRepo"))
    .register(TOKENS.ProjectRepo, fake<ProjectRepository>({ getProjectsOfPerson: async () => projects }, "ProjectRepo"));
  return renderScreen(ProfileScreen, c);
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockSessionOver = {};
});

test("muestra nombre, carrera, institución, sobre mí y habilidades", async () => {
  setup();
  expect(await screen.findByTestId(ProfileView.nameKey)).toHaveTextContent("Laura Pérez");
  expect(screen.getByTestId(ProfileView.programKey)).toHaveTextContent("Diseño Gráfico");
  expect(screen.getByTestId(ProfileView.institutionKey)).toHaveTextContent("Universidad del Norte");
  expect(screen.getByTestId(ProfileView.bioKey)).toHaveTextContent("Me gusta el diseño.");
  expect(screen.getByTestId(`${ProfileView.skillKeyPrefix}.Figma`)).toBeTruthy();
});

test("«Editar perfil» abre el formulario", async () => {
  setup();
  fireEvent.press(await screen.findByTestId(ProfileScreen.editKey));
  expect(mockNavigate).toHaveBeenCalledWith("EditProfile");
});

test("el engranaje abre Ajustes", async () => {
  setup();
  fireEvent.press(await screen.findByTestId(ProfileScreen.settingsKey));
  expect(mockNavigate).toHaveBeenCalledWith("Settings");
});

test("con el perfil completo no aparece «Completa tu perfil»", async () => {
  setup();
  await screen.findByTestId(ProfileView.nameKey);
  expect(screen.queryByTestId(ProfileScreen.completeKey)).toBeNull();
});

test("sin carrera ni habilidades pide completar el perfil y lleva a editar", async () => {
  setup({ me: emptyProfile("u2", "Laura Pérez") });
  fireEvent.press(await screen.findByTestId(`${ProfileScreen.completeKey}.action`));
  expect(mockNavigate).toHaveBeenCalledWith("EditProfile");
  // El nombre sale de la sesión cuando la fila no lo trae.
  expect(screen.getByTestId(ProfileView.nameKey)).toHaveTextContent("Laura Pérez");
});

test("sin cuenta muestra el panel para entrar, no el perfil", async () => {
  mockSessionOver = { user: null, hasAccount: false };
  setup();
  expect(await screen.findByText("No has entrado")).toBeTruthy();
  expect(screen.queryByTestId(ProfileView.nameKey)).toBeNull();
});

test("si el perfil no carga, ofrece reintentar", async () => {
  let fail = true;
  setup({
    getMyProfile: async () => {
      if (fail) throw new Error("Sin conexión.");
      return profile();
    },
  });
  expect(await screen.findByText("Sin conexión.")).toBeTruthy();
  fail = false;
  fireEvent.press(screen.getByTestId(ProfileScreen.retryKey));
  expect(await screen.findByTestId(ProfileView.nameKey)).toBeTruthy();
});

describe("proyectos", () => {
  const projects = [
    ownProject({ id: "a", title: "Huerta", status: "open" }),
    ownProject({ id: "b", title: "Radio", status: "closed" }),
    ownProject({ id: "c", title: "Feria", status: "open" }),
  ];

  test("cuenta todos y abre el proyecto al tocarlo", async () => {
    setup({ projects });
    expect(await screen.findByText("Todo (3)")).toBeTruthy();
    fireEvent.press(await screen.findByTestId("profileProject.a"));
    expect(mockNavigate).toHaveBeenCalledWith("ProjectInfo", { projectId: "a" });
  });

  test("«En desarrollo» muestra los abiertos y «Finalizados» los cerrados", async () => {
    setup({ projects });
    fireEvent.press(await screen.findByText("En desarrollo"));
    await waitFor(() => expect(screen.queryByTestId("profileProject.b")).toBeNull());
    expect(screen.getByTestId("profileProject.a")).toBeTruthy();
    expect(screen.getByTestId("profileProject.c")).toBeTruthy();
    fireEvent.press(screen.getByText("Finalizados"));
    await waitFor(() => expect(screen.getByTestId("profileProject.b")).toBeTruthy());
    expect(screen.queryByTestId("profileProject.a")).toBeNull();
  });

  test("sin proyectos lo dice", async () => {
    setup({ projects: [] });
    expect(await screen.findByTestId(ProfileProjects.emptyKey)).toBeTruthy();
  });
});
