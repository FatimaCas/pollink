import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { useApplicationSentViewModel } from "@/src/features/discover/presentation/viewmodels/useApplicationSentViewModel";
import { useSavedProjectsViewModel } from "@/src/features/discover/presentation/viewmodels/useSavedProjectsViewModel";
import { fake } from "../../support/fake";
import { project } from "../../support/discoverFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

function wrapper(repo: Partial<DiscoverRepository>) {
  const c = new Container().register(TOKENS.DiscoverRepo, fake<DiscoverRepository>(repo, "DiscoverRepo"));
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <DIProvider container={c}>{children}</DIProvider>;
  };
}

beforeEach(() => {
  mockSession = fakeSession();
});

describe("useSavedProjectsViewModel", () => {
  test("carga los guardados de la sesión", async () => {
    const savedProjects = jest.fn().mockResolvedValue([project({ id: "a" })]);
    const { result } = renderHook(() => useSavedProjectsViewModel(), { wrapper: wrapper({ savedProjects }) });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(savedProjects).toHaveBeenCalledWith("u2");
    expect(result.current.projects.map((p) => p.id)).toEqual(["a"]);
  });

  test("sin sesión no lee nada y no queda cargando", () => {
    mockSession = fakeSession({ user: null, currentUser: () => null });
    const savedProjects = jest.fn();
    const { result } = renderHook(() => useSavedProjectsViewModel(), { wrapper: wrapper({ savedProjects }) });
    expect(result.current).toMatchObject({ projects: [], loading: false, error: null });
    expect(savedProjects).not.toHaveBeenCalled();
  });

  test("quitar saca el proyecto al instante y llama a unsave", async () => {
    const unsave = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSavedProjectsViewModel(), {
      wrapper: wrapper({ savedProjects: async () => [project({ id: "a" }), project({ id: "b" })], unsave }),
    });
    await waitFor(() => expect(result.current.projects).toHaveLength(2));
    await act(async () => {
      await result.current.unsave(result.current.projects[0]);
    });
    expect(result.current.projects.map((p) => p.id)).toEqual(["b"]);
    expect(unsave).toHaveBeenCalledWith({ userId: "u2", projectId: "a" });
  });

  test("si unsave falla, vuelve a leer y el proyecto reaparece", async () => {
    const unsave = jest.fn().mockRejectedValue(new Error("sin red"));
    const { result } = renderHook(() => useSavedProjectsViewModel(), {
      wrapper: wrapper({ savedProjects: async () => [project({ id: "a" })], unsave }),
    });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    await act(async () => {
      await result.current.unsave(result.current.projects[0]);
    });
    await waitFor(() => expect(result.current.projects.map((p) => p.id)).toEqual(["a"]));
  });

  test("un fallo de carga deja el error", async () => {
    const { result } = renderHook(() => useSavedProjectsViewModel(), {
      wrapper: wrapper({ savedProjects: async () => { throw new Error("sin red"); } }),
    });
    await waitFor(() => expect(result.current.error).toBe("sin red"));
  });
});

describe("useApplicationSentViewModel", () => {
  test("da el título del proyecto", async () => {
    const { result } = renderHook(() => useApplicationSentViewModel("p1"), {
      wrapper: wrapper({ projectById: async () => project({ title: "Fresitas" }) }),
    });
    await waitFor(() => expect(result.current.title).toBe("Fresitas"));
  });

  test("si el proyecto no existe o falla la lectura, no hay título", async () => {
    const missing = renderHook(() => useApplicationSentViewModel("p1"), { wrapper: wrapper({ projectById: async () => null }) });
    const broken = renderHook(() => useApplicationSentViewModel("p1"), {
      wrapper: wrapper({ projectById: async () => { throw new Error("x"); } }),
    });
    await act(async () => {});
    expect(missing.result.current.title).toBeNull();
    expect(broken.result.current.title).toBeNull();
  });
});
