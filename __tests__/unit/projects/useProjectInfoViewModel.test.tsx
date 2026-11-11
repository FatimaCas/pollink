import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { ProjectsFailure } from "@/src/features/projects/domain/ProjectsFailure";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { useProjectInfoViewModel } from "@/src/features/projects/presentation/viewmodels/useProjectInfoViewModel";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { fake } from "../../support/fake";
import { ownProject } from "../../support/projectFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

// La sesión es `u2`; por defecto, la dueña del proyecto.
function render(projects: Partial<ProjectRepository>, requests: Partial<JoinRequestRepository> = {}) {
  const c = new Container()
    .register(TOKENS.ProjectRepo, fake<ProjectRepository>({ getProject: async () => ownProject(), ...projects }, "ProjectRepo"))
    .register(TOKENS.JoinRequestRepo, fake<JoinRequestRepository>({ pendingCount: async () => 2, ...requests }, "JoinRequestRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  return renderHook(() => useProjectInfoViewModel("p1"), { wrapper }).result;
}

const loaded = async (result: ReturnType<typeof render>) => waitFor(() => expect(result.current.loading).toBe(false));

beforeEach(() => {
  mockSession = fakeSession();
});

test("el creador puede editar y ve sus solicitudes pendientes", async () => {
  const result = render({});
  await loaded(result);
  expect(result.current).toMatchObject({ isOwner: true, canEdit: true, pendingRequests: 2, dirty: false });
});

test("un miembro no edita ni consulta solicitudes", async () => {
  const pendingCount = jest.fn();
  const result = render({ getProject: async () => ownProject({ ownerId: "u9" }) }, { pendingCount });
  await loaded(result);
  expect(result.current).toMatchObject({ isOwner: false, canEdit: false, pendingRequests: 0 });
  expect(pendingCount).not.toHaveBeenCalled();
});

test("un proyecto cerrado no se edita, ni siquiera su creador", async () => {
  const result = render({ getProject: async () => ownProject({ status: "closed" }) });
  await loaded(result);
  expect(result.current).toMatchObject({ isOwner: true, canEdit: false });
});

test("editar marca el borrador y guardar lo manda limpio", async () => {
  const updateBasicInfo = jest.fn(async ({ draft }) => ownProject({ ...draft }));
  const result = render({ updateBasicInfo });
  await loaded(result);
  act(() => result.current.setTitle("Huerta 2.0"));
  let why: string | null = null;
  act(() => {
    why = result.current.addLabel("skills", "Riego");
  });
  expect(why).toBeNull();
  act(() => {
    why = result.current.addLabel("jobs", "biologia");
  });
  expect(why).toBe("Esa carrera ya está en la lista.");
  expect(result.current.dirty).toBe(true);
  await act(async () => {
    expect(await result.current.save()).toBe(true);
  });
  expect(updateBasicInfo).toHaveBeenCalledWith({
    projectId: "p1",
    draft: { title: "Huerta 2.0", description: "Cultivos en la terraza", jobs: ["Biología"], skills: ["Riego"] },
  });
  expect(result.current.dirty).toBe(false);
});

test("descartar vuelve a lo guardado", async () => {
  const result = render({});
  await loaded(result);
  act(() => result.current.setDescription("otra"));
  act(() => result.current.discard());
  expect(result.current.dirty).toBe(false);
});

test("un borrador sin nombre o un error del servidor quedan en saveError", async () => {
  const updateBasicInfo = jest.fn().mockRejectedValue(new ProjectsFailure("El proyecto está cerrado: ya no se puede editar."));
  const result = render({ updateBasicInfo });
  await loaded(result);
  act(() => result.current.setTitle(" "));
  await act(async () => {
    expect(await result.current.save()).toBe(false);
  });
  expect(result.current.saveError).toBe("Ponle un nombre al proyecto.");
  expect(updateBasicInfo).not.toHaveBeenCalled();
  act(() => result.current.setTitle("Huerta"));
  act(() => result.current.setDescription("Otra descripción"));
  await act(async () => {
    await result.current.save();
  });
  expect(result.current.saveError).toBe("El proyecto está cerrado: ya no se puede editar.");
});

describe("close (C5)", () => {
  test("el creador cierra el proyecto: queda cerrado y ya no se edita", async () => {
    const closeProject = jest.fn(async () => ownProject({ status: "closed" }));
    const result = render({ closeProject });
    await loaded(result);
    expect(result.current.canClose).toBe(true);
    await act(async () => {
      expect(await result.current.close()).toBe(true);
    });
    expect(closeProject).toHaveBeenCalledWith("p1");
    expect(result.current).toMatchObject({ canClose: false, canEdit: false, closing: false });
    expect(result.current.project?.status).toBe("closed");
  });

  test("un miembro no puede cerrarlo", async () => {
    const closeProject = jest.fn();
    const result = render({ getProject: async () => ownProject({ ownerId: "u9" }), closeProject });
    await loaded(result);
    expect(result.current.canClose).toBe(false);
    await act(async () => {
      expect(await result.current.close()).toBe(false);
    });
    expect(closeProject).not.toHaveBeenCalled();
  });

  test("uno ya cerrado no se vuelve a cerrar", async () => {
    const result = render({ getProject: async () => ownProject({ status: "closed" }) });
    await loaded(result);
    expect(result.current.canClose).toBe(false);
  });

  test("si falla, el proyecto sigue abierto", async () => {
    const result = render({ closeProject: jest.fn().mockRejectedValue(new Error("sin red")) });
    await loaded(result);
    await act(async () => {
      expect(await result.current.close()).toBe(false);
    });
    expect(result.current.project?.status).toBe("open");
    expect(result.current.closing).toBe(false);
  });
});
