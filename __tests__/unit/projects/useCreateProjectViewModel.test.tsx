import { act, renderHook } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { Project } from "@/src/features/projects/domain/entities/Project";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { useCreateProjectViewModel } from "@/src/features/projects/presentation/viewmodels/useCreateProjectViewModel";
import { fake } from "../../support/fake";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

const created: Project = {
  id: "p_new",
  ownerId: "u2",
  title: "Huerta",
  description: "Una huerta",
  jobs: [],
  skills: [],
  status: "open",
  memberCount: 0,
  progress: 0,
  totalTasks: 0,
  createdAt: null,
};

type Repos = {
  projects?: Partial<ProjectRepository>;
  invitations?: Partial<InvitationRepository>;
  members?: Partial<MembersRepository>;
};

function render(repos: Repos = {}) {
  const c = new Container()
    .register(TOKENS.ProjectRepo, fake<ProjectRepository>({ createProject: jest.fn(async () => created), ...repos.projects }, "ProjectRepo"))
    .register(
      TOKENS.InvitationRepo,
      fake<InvitationRepository>(
        { findAccounts: async () => ({ found: [], missing: [] }), invite: async () => [], ...repos.invitations },
        "InvitationRepo",
      ),
    )
    .register(TOKENS.MembersRepo, fake<MembersRepository>({ addMember: jest.fn(async () => ({}) as never), ...repos.members }, "MembersRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  return renderHook(() => useCreateProjectViewModel(), { wrapper }).result;
}

async function fill(result: ReturnType<typeof render>) {
  act(() => {
    result.current.setTitle("Huerta");
    result.current.setDescription("Una huerta");
  });
}

beforeEach(() => {
  mockSession = fakeSession();
});

describe("listas", () => {
  test("agrega sin repetir y avisa por qué no", () => {
    const result = render();
    let why: string | null = null;
    act(() => {
      why = result.current.add("jobs", " Diseño ");
    });
    expect(why).toBeNull();
    act(() => {
      why = result.current.add("jobs", "diseno");
    });
    expect(why).toBe("Esa carrera ya está en la lista.");
    expect(result.current.jobs).toEqual(["Diseño"]);
    act(() => result.current.remove("jobs", 0));
    expect(result.current.jobs).toEqual([]);
  });

  test("un correo mal escrito o el propio no entran", () => {
    const result = render();
    let why: string | null = null;
    act(() => {
      why = result.current.add("emails", "beto@");
    });
    expect(why).toContain("no parece un correo");
    act(() => {
      why = result.current.add("emails", "L@X.co");
    });
    expect(why).toContain("No puedes invitarte");
    act(() => {
      why = result.current.add("emails", "Beto@Demo.com");
    });
    expect(why).toBeNull();
    expect(result.current.emails).toEqual(["beto@demo.com"]);
  });
});

describe("submit", () => {
  test("crea el proyecto, invita y agrega al creador como owner, en ese orden", async () => {
    const order: string[] = [];
    const invitee = { email: "beto@demo.com", userId: "u_beto" };
    const result = render({
      projects: { createProject: jest.fn(async () => (order.push("project"), created)) },
      invitations: {
        findAccounts: async () => (order.push("find"), { found: [invitee], missing: [] }),
        invite: jest.fn(async () => (order.push("invite"), [])),
      },
      members: { addMember: jest.fn(async () => (order.push("owner"), {}) as never) },
    });
    await fill(result);
    act(() => {
      result.current.add("emails", "beto@demo.com");
    });
    let project: Project | null = null;
    await act(async () => {
      project = await result.current.submit();
    });
    expect(order).toEqual(["find", "project", "invite", "owner"]);
    expect(project).toMatchObject({ id: "p_new", memberCount: 1 });
    expect(result.current.error).toBeNull();
  });

  test("si un correo no tiene cuenta, no escribe nada", async () => {
    const createProject = jest.fn();
    const result = render({
      projects: { createProject },
      invitations: { findAccounts: async () => ({ found: [], missing: ["nadie@x.co"] }) },
    });
    await fill(result);
    await act(async () => {
      expect(await result.current.submit()).toBeNull();
    });
    expect(createProject).not.toHaveBeenCalled();
    expect(result.current.error).toContain("nadie@x.co");
  });

  test("si falla después de crear, deshace las invitaciones y el proyecto", async () => {
    const deleteForProject = jest.fn(async () => undefined);
    const deleteProject = jest.fn(async () => undefined);
    const addMember = jest.fn();
    const result = render({
      projects: { deleteProject },
      invitations: {
        invite: async () => {
          throw new Error("sin red");
        },
        deleteForProject,
      },
      members: { addMember },
    });
    await fill(result);
    await act(async () => {
      expect(await result.current.submit()).toBeNull();
    });
    expect(deleteForProject).toHaveBeenCalledWith("p_new");
    expect(deleteProject).toHaveBeenCalledWith("p_new");
    expect(addMember).not.toHaveBeenCalled();
    expect(result.current.error).toBe("No se pudo crear el proyecto. sin red");
  });

  test("un borrador incompleto no llama a nadie", async () => {
    const result = render({ invitations: { findAccounts: jest.fn() } });
    await act(async () => {
      expect(await result.current.submit()).toBeNull();
    });
    expect(result.current.error).toBe("Ponle un nombre al proyecto.");
  });

  test("sin cuenta manda al login y no crea nada", async () => {
    const ensureLoggedIn = jest.fn(() => false);
    mockSession = fakeSession({ ensureLoggedIn });
    const createProject = jest.fn();
    const result = render({ projects: { createProject } });
    await fill(result);
    await act(async () => {
      expect(await result.current.submit()).toBeNull();
    });
    expect(ensureLoggedIn).toHaveBeenCalled();
    expect(createProject).not.toHaveBeenCalled();
  });
});
