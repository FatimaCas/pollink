import { RobleApiHttpException } from "roble-client";

import { DummyData } from "@/src/core/data/dummyData";
import { createLocalContainer } from "@/src/core/di/localContainer";
import { TOKENS } from "@/src/core/di/tokens";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { ProjectDataSource } from "@/src/features/projects/data/datasources/ProjectDataSource";
import { ProjectInMemoryDataSource } from "@/src/features/projects/data/datasources/ProjectInMemoryDataSource";
import { encodeLists } from "@/src/features/projects/data/datasources/encodeLists";
import { ProjectRepositoryImpl } from "@/src/features/projects/data/repositories/ProjectRepositoryImpl";
import { ProjectsFailure } from "@/src/features/projects/domain/ProjectsFailure";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { fake } from "../../support/fake";

const NOW = new Date("2026-11-10T15:00:00Z");
const draft = { title: "  Huerta  ", description: " Una huerta ", jobs: ["Diseño", "diseno", " "], skills: ["Riego"] };

const member = (projectId: string, userId: string, status = "active"): Row => ({
  _id: `${projectId}-${userId}-${status}`,
  project_id: projectId,
  user_id: userId,
  status,
});

function setup() {
  const data = new DummyData({ latencyMs: 0 });
  data.session = { userId: "u_ana" };
  const repo = new ProjectRepositoryImpl(new ProjectInMemoryDataSource(data), () => NOW);
  const project = (row: Row) => data.table(TABLES.project).push({ status: "open", ...row });
  return { data, repo, project };
}

describe("createProject", () => {
  test("crea el proyecto abierto, limpio y sin miembros", async () => {
    const { repo, data } = setup();
    const created = await repo.createProject({ draft, ownerId: "u_ana" });
    expect(created).toMatchObject({
      ownerId: "u_ana",
      title: "Huerta",
      description: "Una huerta",
      jobs: ["Diseño"],
      skills: ["Riego"],
      status: "open",
      memberCount: 0,
      progress: 0,
      totalTasks: 0,
      createdAt: NOW,
    });
    const row = data.table(TABLES.project)[0];
    // `jobs` y `skills` viajan como texto JSON; `imageUrl` no puede ser nulo.
    expect(row).toMatchObject({ jobs: '["Diseño"]', imageUrl: "", createdAt: NOW.toISOString() });
    expect(data.table(TABLES.projectMember)).toHaveLength(0);
  });

  test("rechaza un borrador incompleto sin escribir nada", async () => {
    const { repo, data } = setup();
    await expect(repo.createProject({ draft: { ...draft, title: " " }, ownerId: "u_ana" })).rejects.toThrow(
      "Ponle un nombre al proyecto.",
    );
    expect(data.table(TABLES.project)).toHaveLength(0);
  });

  test("sin cuenta no se crea", async () => {
    const { repo } = setup();
    await expect(repo.createProject({ draft, ownerId: "" })).rejects.toBeInstanceOf(ProjectsFailure);
  });
});

describe("lecturas", () => {
  test("getProject decodifica la fila y cuenta miembros activos una vez por persona", async () => {
    const { repo, data, project } = setup();
    project({ _id: "p1", _owner: "u_ana", title: "A", jobs: '["X"]', skills: ["Y"], progress: 50, total_tasks: 4 });
    data.table(TABLES.projectMember).push(
      member("p1", "u_ana"),
      member("p1", "u_beto"),
      { ...member("p1", "u_beto"), _id: "dup" },
      member("p1", "u_carla", "left"),
      member("p2", "u_carla"),
    );
    expect(await repo.getProject("p1")).toMatchObject({ jobs: ["X"], skills: ["Y"], memberCount: 2, progress: 50, totalTasks: 4 });
  });

  test("una fila con listas rotas o estado raro no tumba la lectura", async () => {
    const { repo, project } = setup();
    project({ _id: "p1", _owner: "u_ana", jobs: "{roto", skills: { a: 1 }, status: "???", progress: 400 });
    expect(await repo.getProject("p1")).toMatchObject({ jobs: [], skills: [], status: "open", progress: 100 });
  });

  test("getProject devuelve null si no existe", async () => {
    const { repo } = setup();
    expect(await repo.getProject("nada")).toBeNull();
  });

  test("getProjects respeta el orden pedido y omite los que no existen", async () => {
    const { repo, project } = setup();
    project({ _id: "p1", _owner: "u_ana" });
    project({ _id: "p2", _owner: "u_beto" });
    expect((await repo.getProjects(["p2", "nada", "p1", "p2"])).map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(await repo.getProjects([])).toEqual([]);
  });

  test("getProjectsByOwner trae solo los suyos, del más nuevo al más viejo", async () => {
    const { repo, project } = setup();
    project({ _id: "viejo", _owner: "u_ana", createdAt: "2026-01-01T00:00:00Z" });
    project({ _id: "nuevo", _owner: "u_ana", createdAt: "2026-06-01T00:00:00Z" });
    project({ _id: "ajeno", _owner: "u_beto", createdAt: "2026-07-01T00:00:00Z" });
    expect((await repo.getProjectsByOwner("u_ana")).map((p) => p.id)).toEqual(["nuevo", "viejo"]);
  });

  test("getProjectsOfPerson: los creados primero y luego donde colabora hoy", async () => {
    const { repo, data, project } = setup();
    project({ _id: "mio", _owner: "u_ana" });
    project({ _id: "colaboro", _owner: "u_beto" });
    project({ _id: "sali", _owner: "u_carla" });
    data.table(TABLES.projectMember).push(
      member("mio", "u_ana"),
      member("colaboro", "u_ana"),
      member("sali", "u_ana", "left"),
    );
    expect((await repo.getProjectsOfPerson("u_ana")).map((p) => p.id)).toEqual(["mio", "colaboro"]);
    // El historial incluye aquellos de los que salió.
    expect((await repo.getProjectsParticipatedBy("u_ana")).map((p) => p.id)).toEqual(["mio", "colaboro", "sali"]);
  });
});

describe("updateBasicInfo y closeProject", () => {
  test("edita la información básica y la devuelve leída de vuelta", async () => {
    const { repo, project } = setup();
    project({ _id: "p1", _owner: "u_ana", title: "Viejo", description: "x", jobs: "[]", skills: "[]" });
    const updated = await repo.updateBasicInfo({ projectId: "p1", draft });
    expect(updated).toMatchObject({ id: "p1", title: "Huerta", jobs: ["Diseño"] });
  });

  test("un proyecto cerrado no se edita", async () => {
    const { repo, project } = setup();
    project({ _id: "p1", _owner: "u_ana", status: "closed" });
    await expect(repo.updateBasicInfo({ projectId: "p1", draft })).rejects.toThrow("cerrado");
  });

  test("cerrar deja el proyecto cerrado y repetirlo no falla", async () => {
    const { repo, project } = setup();
    project({ _id: "p1", _owner: "u_ana" });
    expect((await repo.closeProject("p1")).status).toBe("closed");
    expect((await repo.closeProject("p1")).status).toBe("closed");
  });

  test("cerrar uno que no existe lo dice", async () => {
    const { repo } = setup();
    await expect(repo.closeProject("nada")).rejects.toThrow("El proyecto ya no existe.");
  });
});

test("deleteProject borra la fila (para deshacer una creación)", async () => {
  const { repo, data } = setup();
  const created = await repo.createProject({ draft, ownerId: "u_ana" });
  await repo.deleteProject(created.id);
  expect(data.table(TABLES.project)).toHaveLength(0);
});

test("un 403 de Roble llega como ProjectsFailure legible", async () => {
  const source = fake<ProjectDataSource>({
    readProject: async () => {
      throw new RobleApiHttpException(403, "forbidden");
    },
  });
  const repo = new ProjectRepositoryImpl(source, () => NOW);
  await expect(repo.getProject("p1")).rejects.toEqual(new ProjectsFailure("Tu cuenta no puede hacer esto."));
});

test("encodeLists pasa jobs y skills a texto JSON y deja lo demás", () => {
  expect(encodeLists({ jobs: ["a"], skills: ["b"], title: "t" })).toEqual({ jobs: '["a"]', skills: '["b"]', title: "t" });
  expect(encodeLists({ status: "closed" })).toEqual({ status: "closed" });
});

test("el contenedor local registra ProjectRepo con proyectos de demo", async () => {
  const repo = createLocalContainer(new DummyData({ latencyMs: 0 })).resolve<ProjectRepository>(TOKENS.ProjectRepo);
  const mine = await repo.getProjectsOfPerson("u_ana");
  // Los siembra `registerDiscoverLocal` (A): los dos de Ana, el más nuevo primero.
  expect(mine.map((p) => p.id)).toEqual(["p_4", "p_1"]);
  expect(mine[0].memberCount).toBe(1);
});
