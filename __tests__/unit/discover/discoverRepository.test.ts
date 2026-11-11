import { DiscoverDataSource } from "@/src/features/discover/data/datasources/DiscoverDataSource";
import { DiscoverRepositoryImpl } from "@/src/features/discover/data/repositories/DiscoverRepositoryImpl";
import { DiscoverFailure } from "@/src/features/discover/domain/DiscoverFailure";
import { NO_FILTER } from "@/src/features/discover/domain/entities/ProjectFilter";
import { fake } from "../../support/fake";

const row = (over = {}) => ({
  _id: "p1", _owner: "u1", title: "Fresitas", description: "d", imageUrl: "", jobs: '["Gastronomía"]', skills: ["Postres"],
  status: "open", progress: 60, member_count: "2", createdAt: "2026-10-05T12:00:00.000Z", total: "7", ...over,
});
const clock = () => new Date("2026-11-10T10:00:00.000Z");
const repo = (source: Partial<DiscoverDataSource>) => new DiscoverRepositoryImpl(fake<DiscoverDataSource>(source, "DiscoverDataSource"), clock);

describe("feedPage", () => {
  test("convierte filas en proyectos y lee el total de la primera fila", async () => {
    const queryFeed = jest.fn().mockResolvedValue([row(), row({ _id: "p2", status: "closed", progress: 250 })]);
    const page = await repo({ queryFeed }).feedPage({ filter: { career: "ing", skill: null, onlyOpen: true }, limit: 10, offset: 20 });
    expect(queryFeed).toHaveBeenCalledWith({ career: "ing", skill: "", onlyOpen: true, limit: 10, offset: 20 });
    expect(page.total).toBe(7);
    expect(page.projects[0]).toMatchObject({ id: "p1", jobs: ["Gastronomía"], skills: ["Postres"], memberCount: 2, imageUrl: null, progress: 60 });
    // Un avance fuera de rango se recorta; un estado desconocido o cerrado se respeta.
    expect(page.projects[1]).toMatchObject({ status: "closed", progress: 100 });
  });

  test("sin filas el total es 0", async () => {
    const page = await repo({ queryFeed: async () => [] }).feedPage({ filter: NO_FILTER, limit: 10, offset: 0 });
    expect(page).toEqual({ projects: [], total: 0 });
  });

  test("traduce el error de Roble a DiscoverFailure", async () => {
    const { RobleApiHttpException } = jest.requireActual("roble-client");
    const queryFeed = async () => {
      throw new RobleApiHttpException(403, "no");
    };
    await expect(repo({ queryFeed }).feedPage({ filter: NO_FILTER, limit: 1, offset: 0 })).rejects.toBeInstanceOf(DiscoverFailure);
  });
});

test("filterOptions separa carreras y habilidades y las ordena por clave", async () => {
  const queryFilterOptions = jest.fn().mockResolvedValue([
    { kind: "skill", key: "python", label: "Python", project_count: "2" },
    { kind: "career", key: "ing sistemas", label: "Ing. Sistemas", project_count: 3 },
    { kind: "career", key: "biologia", label: "Biología", project_count: 1 },
  ]);
  const options = await repo({ queryFilterOptions }).filterOptions({ career: null, onlyOpen: false });
  expect(queryFilterOptions).toHaveBeenCalledWith({ career: "", onlyOpen: false });
  expect(options.careers.map((o) => o.key)).toEqual(["biologia", "ing sistemas"]);
  expect(options.skills).toEqual([{ key: "python", label: "Python", count: 2 }]);
});

describe("guardados", () => {
  test("save no duplica un guardado que ya existe", async () => {
    const createSaved = jest.fn();
    await repo({ readSaved: async () => [{ _id: "s1", project_id: "p1" }], createSaved }).save({ userId: "u", projectId: "p1" });
    expect(createSaved).not.toHaveBeenCalled();
  });

  test("save escribe el par y la hora del reloj", async () => {
    const createSaved = jest.fn();
    await repo({ readSaved: async () => [], createSaved }).save({ userId: "u", projectId: "p1" });
    expect(createSaved).toHaveBeenCalledWith({ user_id: "u", project_id: "p1", createdAt: "2026-11-10T10:00:00.000Z" });
  });

  test("unsave borra todas las filas del par y deja las demás", async () => {
    const deleteSaved = jest.fn();
    const readSaved = async () => [
      { _id: "s1", project_id: "p1" },
      { _id: "s2", project_id: "p1" },
      { _id: "s3", project_id: "p2" },
    ];
    await repo({ readSaved, deleteSaved }).unsave({ userId: "u", projectId: "p1" });
    expect(deleteSaved.mock.calls).toEqual([["s1"], ["s2"]]);
  });

  test("sin sesión o sin proyecto falla con un mensaje", async () => {
    await expect(repo({}).save({ userId: "", projectId: "p1" })).rejects.toThrow("Falta la sesión o el proyecto.");
  });

  test("savedProjects va del más reciente al más viejo y omite proyectos que ya no existen", async () => {
    const readSaved = async () => [
      { _id: "s1", project_id: "old", createdAt: "2026-10-01T00:00:00Z" },
      { _id: "s2", project_id: "gone", createdAt: "2026-10-05T00:00:00Z" },
      { _id: "s3", project_id: "new", createdAt: "2026-10-09T00:00:00Z" },
    ];
    const readProject = async (id: string) => (id === "gone" ? null : row({ _id: id }));
    const projects = await repo({ readSaved, readProject }).savedProjects("u");
    expect(projects.map((p) => p.id)).toEqual(["new", "old"]);
  });
});
