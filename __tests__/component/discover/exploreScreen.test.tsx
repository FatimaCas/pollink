import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import ExploreScreen from "@/src/features/discover/presentation/screens/ExploreScreen";
import { fake } from "../../support/fake";
import { project } from "../../support/discoverFixtures";
import { renderScreen } from "../../support/renderScreen";

const mockNavigate = jest.fn();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../../support/sessionMock").fakeSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, addListener: () => () => {}, setOptions: () => {} }),
}));

const options = {
  careers: [
    { key: "diseno", label: "Diseño", count: 1 },
    { key: "moda", label: "Moda", count: 3 },
  ],
  skills: [],
};

function setup(repo: Partial<DiscoverRepository>) {
  const c = new Container().register(
    TOKENS.DiscoverRepo,
    fake<DiscoverRepository>({ savedIds: async () => [], filterOptions: async () => options, ...repo }, "DiscoverRepo"),
  );
  return renderScreen(ExploreScreen, c);
}

beforeEach(() => mockNavigate.mockClear());

test("en reposo muestra la abeja y no busca; las carreras salen como chips, la de más proyectos primero", async () => {
  const searchPage = jest.fn();
  setup({ searchPage });
  expect(screen.getByTestId(ExploreScreen.idleKey)).toBeTruthy();
  await screen.findByTestId(`${ExploreScreen.chipKey}.career.moda`);
  const labels = screen.getAllByText(/^(Todos|Destacados|Moda|Diseño)$/).map((n) => n.props.children);
  expect(labels).toEqual(["Todos", "Destacados", "Moda", "Diseño"]);
  expect(searchPage).not.toHaveBeenCalled();
});

test("escribir busca por texto y tocar un resultado abre el proyecto", async () => {
  const searchPage = jest.fn().mockResolvedValue({ projects: [project({ id: "a", title: "Fresitas" })], total: 1 });
  setup({ searchPage });
  fireEvent.changeText(screen.getByTestId(ExploreScreen.searchKey), "fresas");
  expect(await screen.findByText("Fresitas")).toBeTruthy();
  expect(searchPage).toHaveBeenCalledTimes(1);
  expect(searchPage).toHaveBeenCalledWith({ text: "fresas", career: null, limit: 10, offset: 0 });
  fireEvent.press(screen.getByTestId("projectCard.a"));
  expect(mockNavigate).toHaveBeenCalledWith("ProjectDetail", { projectId: "a" });
});

test("un chip de carrera busca sin texto; «Todos» vuelve a la abeja", async () => {
  const searchPage = jest.fn().mockResolvedValue({ projects: [project({ id: "m", title: "Pasarela" })], total: 1 });
  setup({ searchPage });
  fireEvent.press(await screen.findByTestId(`${ExploreScreen.chipKey}.career.moda`));
  expect(await screen.findByText("Pasarela")).toBeTruthy();
  expect(searchPage).toHaveBeenCalledWith({ text: "", career: "moda", limit: 10, offset: 0 });
  fireEvent.press(screen.getByTestId(`${ExploreScreen.chipKey}.all`));
  expect(screen.getByTestId(ExploreScreen.idleKey)).toBeTruthy();
  expect(screen.queryByText("Pasarela")).toBeNull();
});

test("«Destacados» pone primero el de más avance", async () => {
  const projects = [project({ id: "low", title: "Bajo", progress: 5 }), project({ id: "high", title: "Alto", progress: 95 })];
  setup({ searchPage: async () => ({ projects, total: 2 }) });
  fireEvent.press(screen.getByTestId(`${ExploreScreen.chipKey}.featured`));
  await screen.findByText("Bajo");
  const titles = screen.getAllByText(/^(Bajo|Alto)$/).map((n) => n.props.children);
  expect(titles).toEqual(["Alto", "Bajo"]);
});

test("sin resultados lo dice", async () => {
  setup({ searchPage: async () => ({ projects: [], total: 0 }) });
  fireEvent.changeText(screen.getByTestId(ExploreScreen.searchKey), "xyz");
  expect(await screen.findByText("Ningún proyecto coincide")).toBeTruthy();
});

test("un error ofrece reintentar", async () => {
  const searchPage = jest
    .fn()
    .mockRejectedValueOnce(new Error("Sin conexión"))
    .mockResolvedValue({ projects: [project({ id: "a", title: "Fresitas" })], total: 1 });
  setup({ searchPage });
  fireEvent.changeText(screen.getByTestId(ExploreScreen.searchKey), "fresas");
  fireEvent.press(await screen.findByTestId(ExploreScreen.retryKey));
  expect(await screen.findByText("Fresitas")).toBeTruthy();
  await waitFor(() => expect(searchPage).toHaveBeenCalledTimes(2));
});
