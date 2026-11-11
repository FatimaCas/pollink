import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { ProjectInvitation } from "@/src/features/invitations/domain/entities/ProjectInvitation";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { useInvitationsViewModel } from "@/src/features/invitations/presentation/viewmodels/useInvitationsViewModel";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { fake } from "../../support/fake";
import { ownProject } from "../../support/projectFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

const invitation = (over: Partial<ProjectInvitation> = {}): ProjectInvitation => ({
  id: "i1",
  projectId: "p1",
  userId: "u2",
  email: "l@x.co",
  status: "pending",
  invitedBy: "u9",
  createdAt: null,
  respondedAt: null,
  ...over,
});

type Repos = {
  invitations?: Partial<InvitationRepository>;
  projects?: Partial<ProjectRepository>;
  members?: Partial<MembersRepository>;
  requests?: Partial<JoinRequestRepository>;
};

// La sesión es `u2`; el proyecto p1 es de `u9` y está abierto.
function render(repos: Repos = {}) {
  const p1 = ownProject({ id: "p1", ownerId: "u9", title: "Huerta" });
  const c = new Container()
    .register(TOKENS.InvitationRepo, fake<InvitationRepository>({ pendingFor: async () => [invitation()], ...repos.invitations }, "InvitationRepo"))
    .register(
      TOKENS.ProjectRepo,
      fake<ProjectRepository>(
        { getProjectsOfPerson: async () => [], getProjects: async () => [p1], getProject: async () => p1, ...repos.projects },
        "ProjectRepo",
      ),
    )
    .register(TOKENS.MembersRepo, fake<MembersRepository>({ addMember: jest.fn(async () => ({}) as never), ...repos.members }, "MembersRepo"))
    .register(TOKENS.JoinRequestRepo, fake<JoinRequestRepository>({ cancelPending: async () => 0, ...repos.requests }, "JoinRequestRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  return renderHook(() => useInvitationsViewModel(), { wrapper }).result;
}

const loaded = async (result: ReturnType<typeof render>) => waitFor(() => expect(result.current.loading).toBe(false));

beforeEach(() => {
  mockSession = fakeSession();
});

test("lista las pendientes con su proyecto y oculta las que ya no se responden", async () => {
  const result = render({
    invitations: { pendingFor: async () => [invitation(), invitation({ id: "i2", projectId: "cerrado" }), invitation({ id: "i3", projectId: "ya" })] },
    projects: {
      getProjects: async () => [ownProject({ id: "p1", ownerId: "u9" }), ownProject({ id: "cerrado", status: "closed" }), ownProject({ id: "ya" })],
      getProjectsOfPerson: async () => [ownProject({ id: "ya", ownerId: "u9" })],
    },
  });
  await loaded(result);
  expect(result.current.items.map((i) => [i.invitation.id, i.project.id])).toEqual([["i1", "p1"]]);
});

test("aceptar: miembro → invitación aceptada → cancela la solicitud que sobra", async () => {
  const order: string[] = [];
  const result = render({
    members: { addMember: jest.fn(async (params) => (order.push(`member:${params.userId}:${params.role ?? "collaborator"}`), {}) as never) },
    invitations: { accept: jest.fn(async () => void order.push("accept")) },
    requests: { cancelPending: jest.fn(async (params) => (order.push(`cancel:${params.cancelledBy}`), 1)) },
  });
  await loaded(result);
  let joined: unknown = null;
  await act(async () => {
    joined = await result.current.accept(result.current.items[0]);
  });
  expect(order).toEqual(["member:u2:collaborator", "accept", "cancel:u2"]);
  expect(joined).toMatchObject({ id: "p1" });
  expect(result.current.items).toEqual([]);
});

test("si cancelar la solicitud falla, la invitación igual queda aceptada", async () => {
  const result = render({ invitations: { accept: async () => undefined }, requests: { cancelPending: async () => Promise.reject(new Error("x")) } });
  await loaded(result);
  await act(async () => {
    expect(await result.current.accept(result.current.items[0])).not.toBeNull();
  });
  expect(result.current.items).toEqual([]);
});

test("un proyecto que se cerró mientras tanto no deja aceptar", async () => {
  const addMember = jest.fn();
  const result = render({ projects: { getProject: async () => ownProject({ id: "p1", status: "closed" }) }, members: { addMember } });
  await loaded(result);
  await act(async () => {
    expect(await result.current.accept(result.current.items[0])).toBeNull();
  });
  expect(addMember).not.toHaveBeenCalled();
  expect(result.current.items).toEqual([]);
});

test("rechazar no toca la membresía", async () => {
  const decline = jest.fn(async () => undefined);
  const addMember = jest.fn();
  const result = render({ invitations: { decline }, members: { addMember } });
  await loaded(result);
  await act(async () => {
    expect(await result.current.decline(result.current.items[0])).toBe(true);
  });
  expect(decline).toHaveBeenCalledWith("i1");
  expect(addMember).not.toHaveBeenCalled();
  expect(result.current.items).toEqual([]);
});

test("si responder falla, la invitación sigue en la lista", async () => {
  const result = render({ invitations: { decline: async () => Promise.reject(new Error("sin red")) } });
  await loaded(result);
  await act(async () => {
    expect(await result.current.decline(result.current.items[0])).toBe(false);
  });
  expect(result.current.items).toHaveLength(1);
  expect(result.current.busyId).toBeNull();
});

test("sin cuenta no lee nada", () => {
  mockSession = fakeSession({ hasAccount: false, isGuest: true });
  const pendingFor = jest.fn();
  const result = render({ invitations: { pendingFor } });
  expect(result.current).toMatchObject({ needsAccount: true, loading: false, items: [] });
  expect(pendingFor).not.toHaveBeenCalled();
});
