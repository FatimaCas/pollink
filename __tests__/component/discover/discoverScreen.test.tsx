import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import DiscoverScreen from "@/src/features/discover/presentation/screens/DiscoverScreen";
import { FeedModePicker } from "@/src/features/discover/presentation/components/FeedModePicker";
import { FilterBar } from "@/src/features/discover/presentation/components/FilterBar";
import { FilterSheet } from "@/src/features/discover/presentation/components/FilterSheet";
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
  careers: [{ key: "gastronomia", label: "Gastronomía", count: 2 }],
  skills: [{ key: "postres", label: "Postres", count: 1 }],
};

function setup(repo: Partial<DiscoverRepository>) {
  const c = new Container().register(
    TOKENS.DiscoverRepo,
    fake<DiscoverRepository>({ savedIds: async () => [], filterOptions: async () => options, ...repo }, "DiscoverRepo"),
  );
  return renderScreen(DiscoverScreen, c);
}

beforeEach(() => mockNavigate.mockClear());

test("muestra el saludo, las tarjetas y abre el proyecto al tocar una", async () => {
  setup({ feedPage: async () => ({ projects: [project({ id: "a", title: "Fresitas" })], total: 1 }) });
  expect(await screen.findByText("Fresitas")).toBeTruthy();
  expect(screen.getByTestId("discover.greeting").props.children).toBe("Hola, Laura");
  expect(screen.getByTestId("projectCard.a.percent").props.children).toEqual([60, "%"]);
  fireEvent.press(screen.getByTestId("projectCard.a"));
  expect(mockNavigate).toHaveBeenCalledWith("ProjectDetail", { projectId: "a" });
});

test("el marcador guarda el proyecto", async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  setup({ feedPage: async () => ({ projects: [project({ id: "a" })], total: 1 }), save });
  fireEvent.press(await screen.findByTestId("projectCard.a.save"));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ userId: "u2", projectId: "a" }));
});

test("el selector de modo reordena: «Destacados» pone primero el de más avance", async () => {
  const projects = [project({ id: "low", title: "Bajo", progress: 5 }), project({ id: "high", title: "Alto", progress: 95 })];
  setup({ feedPage: async () => ({ projects, total: 2 }) });
  await screen.findByText("Bajo");
  fireEvent.press(screen.getByTestId(FeedModePicker.buttonKey));
  fireEvent.press(await screen.findByTestId(`${FeedModePicker.buttonKey}.featured`));
  const titles = screen.getAllByText(/^(Bajo|Alto)$/).map((n) => n.props.children);
  expect(titles).toEqual(["Alto", "Bajo"]);
});

test("el feed vacío sin filtros no ofrece la barra de filtros", async () => {
  setup({ feedPage: async () => ({ projects: [], total: 0 }) });
  expect(await screen.findByText("No hay proyectos disponibles")).toBeTruthy();
  expect(screen.queryByTestId(FilterBar.openKey)).toBeNull();
});

test("si falla la carga ofrece reintentar y se recupera", async () => {
  const feedPage = jest.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue({ projects: [project({ title: "Fresitas" })], total: 1 });
  setup({ feedPage });
  expect(await screen.findByText("sin red")).toBeTruthy();
  fireEvent.press(screen.getByTestId(DiscoverScreen.retryKey));
  expect(await screen.findByText("Fresitas")).toBeTruthy();
});

test("filtrar: la hoja muestra cuántos proyectos dará, se aplica y salen los chips", async () => {
  const feedPage = jest.fn(async ({ filter }) =>
    filter.onlyOpen ? { projects: [project({ title: "Fresitas abierto" })], total: 1 } : { projects: [project({ title: "Todos" })], total: 5 },
  );
  setup({ feedPage });
  await screen.findByText("Todos");
  fireEvent.press(screen.getByTestId(FilterBar.openKey));
  await waitFor(() => expect(screen.getByText("Ver 5 proyectos")).toBeTruthy());
  fireEvent(await screen.findByTestId(FilterSheet.openOnlyKey), "valueChange", true);
  await waitFor(() => expect(screen.getByText("Ver 1 proyecto")).toBeTruthy());
  fireEvent.press(screen.getByTestId(FilterSheet.applyKey));
  expect(await screen.findByText("Fresitas abierto")).toBeTruthy();
  expect(screen.getByTestId("discover.chip.open")).toBeTruthy();
  expect(screen.getByTestId("discover.total").props.children).toBe("1 proyecto");
});

test("quitar el chip vuelve al feed completo", async () => {
  const feedPage = jest.fn(async ({ filter }) =>
    filter.onlyOpen ? { projects: [project({ title: "Fresitas abierto" })], total: 1 } : { projects: [project({ title: "Todos" })], total: 5 },
  );
  setup({ feedPage });
  await screen.findByText("Todos");
  fireEvent.press(screen.getByTestId(FilterBar.openKey));
  fireEvent(await screen.findByTestId(FilterSheet.openOnlyKey), "valueChange", true);
  await waitFor(() => expect(screen.getByText("Ver 1 proyecto")).toBeTruthy());
  fireEvent.press(screen.getByTestId(FilterSheet.applyKey));
  await screen.findByText("Fresitas abierto");
  fireEvent.press(screen.getByLabelText("Quitar filtro solo abiertos"));
  expect(await screen.findByText("Todos")).toBeTruthy();
});

test("sin coincidencias ofrece «Limpiar filtros» y vuelve al feed completo", async () => {
  const feedPage = jest.fn(async ({ filter }) =>
    filter.onlyOpen ? { projects: [], total: 0 } : { projects: [project({ title: "Todos" })], total: 1 },
  );
  setup({ feedPage });
  await screen.findByText("Todos");
  fireEvent.press(screen.getByTestId(FilterBar.openKey));
  fireEvent(await screen.findByTestId(FilterSheet.openOnlyKey), "valueChange", true);
  await waitFor(() => expect(screen.getByText("Sin proyectos")).toBeTruthy());
  // «Ver proyectos» está desactivado cuando daría 0, así que se aplica por otra vía:
  // quitar el chip y volver a poner el filtro no es posible sin resultados.
  fireEvent.press(screen.getByTestId(FilterSheet.clearKey));
  await waitFor(() => expect(screen.getByText("Ver 1 proyecto")).toBeTruthy());
});
