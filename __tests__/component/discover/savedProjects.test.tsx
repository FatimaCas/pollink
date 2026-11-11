import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import ProjectsScreen from "@/src/features/projects/presentation/screens/ProjectsScreen";
import { project } from "../../support/discoverFixtures";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";

const mockNavigate = jest.fn();
let mockSessionOver: Record<string, unknown> = {};
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../../support/sessionMock").fakeSession(mockSessionOver),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, addListener: () => () => {}, setOptions: () => {} }),
}));

function setup(repo: Partial<DiscoverRepository>) {
  const c = new Container().register(TOKENS.DiscoverRepo, fake<DiscoverRepository>(repo, "DiscoverRepo"));
  return renderScreen(ProjectsScreen, c);
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockSessionOver = {};
});

test("«Guardados» aparece junto a «Mis proyectos» y «Otros proyectos»", () => {
  setup({});
  expect(screen.getByTestId(`${ProjectsScreen.tabsKey}.mine`)).toBeTruthy();
  expect(screen.getByTestId(`${ProjectsScreen.tabsKey}.others`)).toBeTruthy();
  expect(screen.getByTestId(`${ProjectsScreen.tabsKey}.saved`)).toBeTruthy();
});

test("lista los guardados y abre el proyecto al tocar", async () => {
  setup({ savedProjects: async () => [project({ id: "a", title: "Fresitas" })] });
  fireEvent.press(screen.getByTestId(`${ProjectsScreen.tabsKey}.saved`));
  expect(await screen.findByText("Fresitas")).toBeTruthy();
  fireEvent.press(screen.getByTestId("saved.card.a"));
  expect(mockNavigate).toHaveBeenCalledWith("ProjectDetail", { projectId: "a" });
});

test("quitar un guardado lo saca de la lista al instante", async () => {
  const unsave = jest.fn().mockResolvedValue(undefined);
  setup({ savedProjects: async () => [project({ id: "a", title: "Fresitas" })], unsave });
  fireEvent.press(screen.getByTestId(`${ProjectsScreen.tabsKey}.saved`));
  fireEvent.press(await screen.findByTestId("saved.card.a.save"));
  await waitFor(() => expect(screen.queryByText("Fresitas")).toBeNull());
  expect(unsave).toHaveBeenCalledWith({ userId: "u2", projectId: "a" });
  expect(await screen.findByText("Aún no guardas proyectos")).toBeTruthy();
});

test("si falla al quitar, el proyecto vuelve a la lista", async () => {
  const unsave = jest.fn().mockRejectedValue(new Error("sin red"));
  setup({ savedProjects: async () => [project({ id: "a", title: "Fresitas" })], unsave });
  fireEvent.press(screen.getByTestId(`${ProjectsScreen.tabsKey}.saved`));
  fireEvent.press(await screen.findByTestId("saved.card.a.save"));
  expect(await screen.findByText("Fresitas")).toBeTruthy();
});

test("si falla la carga ofrece reintentar", async () => {
  const savedProjects = jest.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue([project({ title: "Fresitas" })]);
  setup({ savedProjects });
  fireEvent.press(screen.getByTestId(`${ProjectsScreen.tabsKey}.saved`));
  fireEvent.press(await screen.findByTestId("saved.retry"));
  expect(await screen.findByText("Fresitas")).toBeTruthy();
});

test("sin sesión muestra el vacío sin leer nada", async () => {
  mockSessionOver = { user: null, currentUser: () => null };
  const savedProjects = jest.fn();
  setup({ savedProjects });
  fireEvent.press(screen.getByTestId(`${ProjectsScreen.tabsKey}.saved`));
  expect(await screen.findByText("Aún no guardas proyectos")).toBeTruthy();
  expect(savedProjects).not.toHaveBeenCalled();
});
