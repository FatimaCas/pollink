import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import ProjectsScreen from "@/src/features/projects/presentation/screens/ProjectsScreen";
import { fake } from "../support/fake";
import { ownProject } from "../support/projectFixtures";
import { renderScreen } from "../support/renderScreen";

const mockNavigate = jest.fn();
const mockSignIn = jest.fn(() => false);
let mockSessionOver: Record<string, unknown> = {};
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../support/sessionMock").fakeSession({ ensureLoggedIn: mockSignIn, ...mockSessionOver }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, addListener: () => () => {}, setOptions: () => {} }),
}));

const K = ProjectsScreen;

function setup(getProjectsOfPerson: ProjectRepository["getProjectsOfPerson"]) {
  const c = new Container()
    .register(TOKENS.ProjectRepo, fake<ProjectRepository>({ getProjectsOfPerson }, "ProjectRepo"))
    .register(TOKENS.DiscoverRepo, fake<DiscoverRepository>({ savedProjects: async () => [] }, "DiscoverRepo"));
  return renderScreen(ProjectsScreen, c);
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockSignIn.mockClear();
  mockSessionOver = {};
});

test("«Mis proyectos» lista los creados y abre su ficha", async () => {
  setup(async () => [ownProject({ id: "a", title: "Huerta", memberCount: 3, progress: 40 })]);
  fireEvent.press(await screen.findByTestId("myProjectCard.a"));
  expect(mockNavigate).toHaveBeenCalledWith("ProjectInfo", { projectId: "a" });
  expect(screen.getByTestId("myProjectCard.a.members")).toHaveTextContent("3 integrantes");
  expect(screen.getByTestId("myProjectCard.a.percent")).toHaveTextContent("40%");
});

test("«Nuevo proyecto» abre el formulario", async () => {
  setup(async () => [ownProject({ id: "a" })]);
  fireEvent.press(await screen.findByTestId(K.createKey));
  expect(mockNavigate).toHaveBeenCalledWith("CreateProject");
});

test("sin proyectos propios invita a crear el primero", async () => {
  setup(async () => []);
  fireEvent.press(await screen.findByTestId(K.createFirstKey));
  expect(mockNavigate).toHaveBeenCalledWith("CreateProject");
});

test("«Otros proyectos» muestra aquellos en los que colabora y marca los cerrados", async () => {
  setup(async () => [ownProject({ id: "mio" }), ownProject({ id: "ajeno", ownerId: "u9", title: "App del bus", status: "closed" })]);
  fireEvent.press(screen.getByTestId(`${K.tabsKey}.others`));
  expect(await screen.findByText("App del bus")).toBeTruthy();
  expect(screen.queryByTestId("myProjectCard.mio")).toBeNull();
  expect(screen.getByTestId("myProjectCard.ajeno.closed")).toBeTruthy();
});

test("sin colaboraciones ofrece explorar", async () => {
  setup(async () => [ownProject({ id: "mio" })]);
  fireEvent.press(screen.getByTestId(`${K.tabsKey}.others`));
  fireEvent.press(await screen.findByTestId(K.exploreKey));
  expect(mockNavigate).toHaveBeenCalledWith("Tabs", { screen: "Discover" });
});

test("un invitado ve el aviso y puede ir a crear su cuenta", () => {
  mockSessionOver = { hasAccount: false, isGuest: true };
  const getProjectsOfPerson = jest.fn();
  setup(getProjectsOfPerson);
  fireEvent.press(screen.getByTestId(K.signInKey));
  expect(mockSignIn).toHaveBeenCalled();
  expect(getProjectsOfPerson).not.toHaveBeenCalled();
});

test("si falla la carga ofrece reintentar", async () => {
  const getProjectsOfPerson = jest.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue([ownProject({ title: "Huerta" })]);
  setup(getProjectsOfPerson);
  fireEvent.press(await screen.findByTestId(K.retryKey));
  expect(await screen.findByText("Huerta")).toBeTruthy();
});
