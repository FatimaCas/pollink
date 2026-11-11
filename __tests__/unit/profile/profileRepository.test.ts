import { DummyData } from "@/src/core/data/dummyData";
import { TABLES } from "@/src/core/roble/tables";
import { ProfileInMemoryDataSource } from "@/src/features/profile/data/datasources/ProfileInMemoryDataSource";
import { ProfileRepositoryImpl } from "@/src/features/profile/data/repositories/ProfileRepositoryImpl";
import { ProfileFailure } from "@/src/features/profile/domain/ProfileFailure";

function setup({ session = "u_ana" as string | null } = {}) {
  const data = new DummyData({ latencyMs: 0 });
  data.session = session ? { userId: session } : null;
  const repo = new ProfileRepositoryImpl(new ProfileInMemoryDataSource(data));
  return { data, repo, rows: () => data.table(TABLES.profile) };
}

const update = {
  career: { program: " Sistemas ", institution: "Uninorte" },
  bio: " Hola ",
  skills: ["React", " ", "SQL "],
};

describe("ensureMyProfile", () => {
  test("crea la fila propia con carrera y habilidades vacías", async () => {
    const { repo, rows } = setup();
    await repo.ensureMyProfile("Ana Torres");
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ _owner: "u_ana", name: "Ana Torres", career: { program: "", institution: "" } });
  });

  test("no duplica si ya existe", async () => {
    const { repo, rows } = setup();
    await repo.ensureMyProfile("Ana");
    await repo.ensureMyProfile("Ana");
    expect(rows()).toHaveLength(1);
  });

  test("con nombre vacío no crea nada", async () => {
    const { repo, rows } = setup();
    await repo.ensureMyProfile("   ");
    expect(rows()).toHaveLength(0);
  });

  test("sin sesión lanza ProfileFailure NO_SESSION", async () => {
    const { repo } = setup({ session: null });
    await expect(repo.ensureMyProfile("Ana")).rejects.toMatchObject({ code: "NO_SESSION" });
  });
});

describe("getMyProfile / getProfileOf", () => {
  test("sin fila devuelve un perfil vacío", async () => {
    const { repo } = setup();
    expect(await repo.getMyProfile()).toEqual({
      userId: "u_ana",
      name: "",
      career: { program: "", institution: "" },
      bio: "",
      skills: [],
    });
  });

  test("lee carrera objeto, texto plano y habilidades como texto JSON", async () => {
    const { repo, rows } = setup();
    rows().push(
      { _id: "1", _owner: "u_ana", name: "Ana", career: { program: "Sistemas", institution: "Uninorte" }, skills: '["React","SQL"]', description: "hola" },
      { _id: "2", _owner: "u_beto", name: "Beto", career: "Diseño", skills: null },
    );
    expect(await repo.getMyProfile()).toMatchObject({ career: { program: "Sistemas", institution: "Uninorte" }, skills: ["React", "SQL"], bio: "hola" });
    expect(await repo.getProfileOf("u_beto")).toMatchObject({ career: { program: "Diseño", institution: "" }, skills: [] });
  });

  test("getProfileOf no devuelve la fila de otra persona", async () => {
    const { repo, rows } = setup();
    rows().push({ _id: "1", _owner: "u_ana", name: "Ana" });
    expect((await repo.getProfileOf("u_carla")).name).toBe("");
  });
});

describe("updateMyProfile", () => {
  test("guarda recortado, descarta habilidades vacías y devuelve el perfil", async () => {
    const { repo, rows } = setup();
    await repo.ensureMyProfile("Ana");
    const profile = await repo.updateMyProfile(update);
    expect(profile).toMatchObject({ name: "Ana", career: { program: "Sistemas", institution: "Uninorte" }, bio: "Hola", skills: ["React", "SQL"] });
    expect(rows()[0].skills).toBe('["React","SQL"]');
  });

  test("sin fila propia falla con ProfileFailure", async () => {
    const { repo } = setup();
    await expect(repo.updateMyProfile(update)).rejects.toBeInstanceOf(ProfileFailure);
  });
});

describe("getNamesOf", () => {
  test("devuelve los nombres de quienes tienen fila y omite al resto", async () => {
    const { repo, rows } = setup();
    rows().push({ _id: "1", _owner: "u_ana", name: "Ana" }, { _id: "2", _owner: "u_beto", name: " Beto " }, { _id: "3", _owner: "u_x", name: "" });
    expect(await repo.getNamesOf(["u_ana", "u_beto", "u_x", "u_nadie", "u_ana", ""])).toEqual({ u_ana: "Ana", u_beto: "Beto" });
  });

  test("lista vacía no consulta nada", async () => {
    const { repo } = setup();
    expect(await repo.getNamesOf([])).toEqual({});
  });
});
