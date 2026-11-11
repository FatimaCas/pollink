import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { ProjectInvitation } from "@/src/features/invitations/domain/entities/ProjectInvitation";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { useMyProjectsViewModel } from "@/src/features/projects/presentation/viewmodels/useMyProjectsViewModel";
import { fake } from "../../support/fake";
import { ownProject } from "../../support/projectFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

function render(repo: Partial<ProjectRepository>, invitations: Partial<InvitationRepository> = {}) {
  const c = new Container()
    .register(TOKENS.ProjectRepo, fake<ProjectRepository>({ getProjects: async () => [], ...repo }, "ProjectRepo"))
    .register(TOKENS.InvitationRepo, fake<InvitationRepository>({ pendingFor: async () => [], ...invitations }, "InvitationRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  return renderHook(() => useMyProjectsViewModel(), { wrapper }).result;
}

beforeEach(() => {
  mockSession = fakeSession();
});

test("separa los que creó de aquellos en los que colabora", async () => {
  const getProjectsOfPerson = jest.fn(async () => [
    ownProject({ id: "mio" }),
    ownProject({ id: "ajeno", ownerId: "u9" }),
  ]);
  const result = render({ getProjectsOfPerson });
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(getProjectsOfPerson).toHaveBeenCalledWith("u2");
  expect(result.current.owned.map((p) => p.id)).toEqual(["mio"]);
  expect(result.current.joined.map((p) => p.id)).toEqual(["ajeno"]);
  expect(result.current.needsAccount).toBe(false);
});

test("un invitado no tiene cuenta: no lee nada", () => {
  mockSession = fakeSession({ hasAccount: false, isGuest: true });
  const getProjectsOfPerson = jest.fn();
  const result = render({ getProjectsOfPerson });
  expect(result.current).toMatchObject({ needsAccount: true, loading: false, owned: [], joined: [] });
  expect(getProjectsOfPerson).not.toHaveBeenCalled();
});

test("si falla, guarda el mensaje y reintentar vuelve a leer", async () => {
  const getProjectsOfPerson = jest
    .fn()
    .mockRejectedValueOnce(new Error("sin red"))
    .mockResolvedValue([ownProject()]);
  const result = render({ getProjectsOfPerson });
  await waitFor(() => expect(result.current.error).toBe("sin red"));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.owned).toHaveLength(1));
  expect(result.current.error).toBeNull();
});

test("cuenta solo las invitaciones que se pueden responder (C6)", async () => {
  const invitation = (id: string, projectId: string): ProjectInvitation => ({
    id, projectId, userId: "u2", email: "", status: "pending", invitedBy: "u9", createdAt: null, respondedAt: null,
  });
  const result = render(
    {
      getProjectsOfPerson: async () => [ownProject({ id: "ya", ownerId: "u9" })],
      getProjects: async () => [
        ownProject({ id: "abierto", ownerId: "u9" }),
        ownProject({ id: "cerrado", ownerId: "u9", status: "closed" }),
        ownProject({ id: "ya", ownerId: "u9" }),
      ],
    },
    { pendingFor: async () => [invitation("a", "abierto"), invitation("b", "cerrado"), invitation("c", "ya"), invitation("d", "borrado")] },
  );
  await waitFor(() => expect(result.current.invitationCount).toBe(1));
});

test("si contar invitaciones falla, la lista se muestra igual", async () => {
  const result = render({ getProjectsOfPerson: async () => [ownProject()] }, { pendingFor: async () => Promise.reject(new Error("x")) });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current).toMatchObject({ error: null, invitationCount: 0 });
  expect(result.current.owned).toHaveLength(1);
});
