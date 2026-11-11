import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { useProjectDetailViewModel } from "@/src/features/projects/presentation/viewmodels/useProjectDetailViewModel";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { fake } from "../../support/fake";
import { ownProject } from "../../support/projectFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

type Repos = {
  projects?: Partial<ProjectRepository>;
  members?: Partial<MembersRepository>;
  invitations?: Partial<InvitationRepository>;
  requests?: Partial<JoinRequestRepository>;
  discover?: Partial<DiscoverRepository>;
};

// El usuario de la sesión es `u2`; el proyecto es de `u9` salvo que se diga otra cosa.
function render(repos: Repos = {}) {
  const c = new Container()
    .register(TOKENS.ProjectRepo, fake<ProjectRepository>({ getProject: async () => ownProject({ ownerId: "u9" }), ...repos.projects }, "ProjectRepo"))
    .register(TOKENS.MembersRepo, fake<MembersRepository>({ activeMemberIds: async () => [], ...repos.members }, "MembersRepo"))
    .register(TOKENS.InvitationRepo, fake<InvitationRepository>({ pendingFor: async () => [], ...repos.invitations }, "InvitationRepo"))
    .register(TOKENS.JoinRequestRepo, fake<JoinRequestRepository>({ requestsForProject: async () => [], ...repos.requests }, "JoinRequestRepo"))
    .register(TOKENS.DiscoverRepo, fake<DiscoverRepository>({ savedIds: async () => [], ...repos.discover }, "DiscoverRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  return renderHook(() => useProjectDetailViewModel("p1"), { wrapper }).result;
}

const loaded = async (result: ReturnType<typeof render>) => waitFor(() => expect(result.current.loading).toBe(false));

beforeEach(() => {
  mockSession = fakeSession();
});

test("sin relación con el proyecto queda en «none»", async () => {
  const result = render();
  await loaded(result);
  expect(result.current).toMatchObject({ relation: "none", saved: false, error: null });
  expect(result.current.project?.id).toBe("p1");
});

test("el creador es «owner»", async () => {
  const result = render({ projects: { getProject: async () => ownProject({ ownerId: "u2" }) } });
  await loaded(result);
  expect(result.current.relation).toBe("owner");
});

test("junta miembro, invitación, solicitud y guardado en el orden del dominio", async () => {
  const invitation = { id: "i", projectId: "p1", userId: "u2", email: "", status: "pending" as const, invitedBy: "u9", createdAt: null, respondedAt: null };
  const request = { id: "r", userId: "u2", projectId: "p1", state: "pending" as const, createdAt: null, updatedAt: null, reviewedBy: null };
  let result = render({ invitations: { pendingFor: async () => [invitation] }, requests: { requestsForProject: async () => [request] } });
  await loaded(result);
  expect(result.current.relation).toBe("invited");

  result = render({ requests: { requestsForProject: async () => [request] }, discover: { savedIds: async () => ["p1"] } });
  await loaded(result);
  expect(result.current).toMatchObject({ relation: "pending", saved: true });

  result = render({ members: { activeMemberIds: async () => ["u2"] } });
  await loaded(result);
  expect(result.current.relation).toBe("active");
});

test("un invitado solo consulta sus guardados; lo demás no lo puede leer", async () => {
  mockSession = fakeSession({ hasAccount: false, isGuest: true });
  const activeMemberIds = jest.fn();
  const result = render({ members: { activeMemberIds }, discover: { savedIds: async () => ["p1"] } });
  await loaded(result);
  expect(result.current).toMatchObject({ relation: "saved", saved: true });
  expect(activeMemberIds).not.toHaveBeenCalled();
});

test("si un dato de la relación falla, el proyecto se muestra igual", async () => {
  const result = render({ members: { activeMemberIds: async () => Promise.reject(new Error("403")) } });
  await loaded(result);
  expect(result.current).toMatchObject({ relation: "none", error: null });
});

test("un proyecto que no existe lo dice", async () => {
  const result = render({ projects: { getProject: async () => null } });
  await loaded(result);
  expect(result.current).toMatchObject({ project: null, error: "Este proyecto ya no existe." });
});

test("guardar cambia al instante y vuelve atrás si falla", async () => {
  const save = jest.fn().mockRejectedValue(new Error("sin red"));
  const result = render({ discover: { save } });
  await loaded(result);
  await act(async () => {
    await result.current.toggleSaved();
  });
  expect(save).toHaveBeenCalledWith({ userId: "u2", projectId: "p1" });
  expect(result.current.saved).toBe(false);
});
