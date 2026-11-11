import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { NO_FILTER } from "@/src/features/discover/domain/entities/ProjectFilter";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { useDiscoverViewModel } from "@/src/features/discover/presentation/viewmodels/useDiscoverViewModel";
import { fake } from "../../support/fake";
import { project } from "../../support/discoverFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  useSession: () => mockSession,
}));

function setup(repo: Partial<DiscoverRepository>) {
  const c = new Container().register(TOKENS.DiscoverRepo, fake<DiscoverRepository>({ savedIds: async () => [], ...repo }, "DiscoverRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  return renderHook(() => useDiscoverViewModel(), { wrapper });
}

beforeEach(() => {
  mockSession = fakeSession();
});

test("carga la primera página y los guardados", async () => {
  const feedPage = jest.fn().mockResolvedValue({ projects: [project({ id: "a" })], total: 1 });
  const { result } = setup({ feedPage, savedIds: async () => ["a"] });
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.projects.map((p) => p.id)).toEqual(["a"]);
  expect(result.current.savedIds.has("a")).toBe(true);
  expect(feedPage).toHaveBeenCalledWith({ filter: NO_FILTER, limit: 10, offset: 0 });
});

test("un fallo sin lista deja el error y retry lo recupera", async () => {
  const feedPage = jest.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue({ projects: [project()], total: 1 });
  const { result } = setup({ feedPage });
  await waitFor(() => expect(result.current.error).toBe("sin red"));
  act(() => {
    result.current.retry();
  });
  await waitFor(() => expect(result.current.projects).toHaveLength(1));
  expect(result.current.error).toBeNull();
});

test("loadMore pide la siguiente página sin repetir proyectos y para al llegar al total", async () => {
  const feedPage = jest
    .fn()
    .mockResolvedValueOnce({ projects: [project({ id: "a" }), project({ id: "b" })], total: 3 })
    .mockResolvedValueOnce({ projects: [project({ id: "b" }), project({ id: "c" })], total: 3 });
  const { result } = setup({ feedPage });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.loadMore();
  });
  expect(feedPage).toHaveBeenLastCalledWith({ filter: NO_FILTER, limit: 10, offset: 2 });
  expect(result.current.projects.map((p) => p.id)).toEqual(["a", "b", "c"]);
  await act(async () => {
    await result.current.loadMore();
  });
  expect(feedPage).toHaveBeenCalledTimes(2);
});

test("aplicar un filtro recarga desde la primera página y clearFilter lo quita", async () => {
  const feedPage = jest.fn().mockResolvedValue({ projects: [], total: 0 });
  const { result } = setup({ feedPage });
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setFilter({ career: "ing", skill: null, onlyOpen: true }, { career: "Ing." }));
  await waitFor(() => expect(feedPage).toHaveBeenLastCalledWith({ filter: { career: "ing", skill: null, onlyOpen: true }, limit: 10, offset: 0 }));
  expect(result.current.filtered).toBe(true);
  expect(result.current.labels.career).toBe("Ing.");
  act(() => result.current.clearFilter());
  await waitFor(() => expect(result.current.filtered).toBe(false));
});

test("quitar un chip conserva la etiqueta de los demás", async () => {
  const { result } = setup({ feedPage: async () => ({ projects: [], total: 0 }) });
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setFilter({ career: "c", skill: "s", onlyOpen: false }, { career: "Carrera", skill: "Skill" }));
  act(() => result.current.changeFilter({ career: "c", skill: null, onlyOpen: false }));
  expect(result.current.labels).toEqual({ career: "Carrera", skill: undefined });
});

test("guardar marca al instante y deshace si el servidor falla", async () => {
  const save = jest.fn().mockRejectedValue(new Error("no se pudo"));
  const p = project({ id: "a" });
  const { result } = setup({ feedPage: async () => ({ projects: [p], total: 1 }), save });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.toggleSaved(p);
  });
  expect(save).toHaveBeenCalledWith({ userId: "u2", projectId: "a" });
  expect(result.current.savedIds.has("a")).toBe(false);
});

test("quitar de guardados llama a unsave", async () => {
  const unsave = jest.fn().mockResolvedValue(undefined);
  const p = project({ id: "a" });
  const { result } = setup({ feedPage: async () => ({ projects: [p], total: 1 }), savedIds: async () => ["a"], unsave });
  await waitFor(() => expect(result.current.savedIds.has("a")).toBe(true));
  await act(async () => {
    await result.current.toggleSaved(p);
  });
  expect(unsave).toHaveBeenCalledWith({ userId: "u2", projectId: "a" });
  expect(result.current.savedIds.has("a")).toBe(false);
});

test("sin poder abrir sesión no guarda nada", async () => {
  mockSession = fakeSession({ ensureWritableSession: async () => false });
  const save = jest.fn();
  const p = project();
  const { result } = setup({ feedPage: async () => ({ projects: [p], total: 1 }), save });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.toggleSaved(p);
  });
  expect(save).not.toHaveBeenCalled();
});
