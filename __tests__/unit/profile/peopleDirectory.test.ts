import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { PeopleDirectoryStore } from "@/src/features/profile/presentation/viewmodels/PeopleDirectoryStore";
import { fake } from "../../support/fake";

const NAMES: Record<string, string> = { ana: "Ana Torres", beto: "Beto Ramírez" };

function setup(getNamesOf?: (ids: string[]) => Promise<Record<string, string>>) {
  const asked: string[][] = [];
  const repo = fake<ProfileRepository>(
    {
      getNamesOf:
        getNamesOf ??
        (async (ids) => {
          asked.push(ids);
          return Object.fromEntries(ids.filter((id) => NAMES[id]).map((id) => [id, NAMES[id]]));
        }),
    },
    "ProfileRepo",
  );
  return { store: new PeopleDirectoryStore(repo), asked };
}

test("pide los ids que faltan juntos, en una sola consulta", async () => {
  const { store, asked } = setup();
  await store.preload(["ana", "beto", "ana", ""]);
  expect(asked).toEqual([["ana", "beto"]]);
  expect(store.nameOf("ana")).toBe("Ana Torres");
  expect(store.nameOf("beto")).toBe("Beto Ramírez");
});

test("lee una vez por persona aunque se pida muchas veces a la vez", async () => {
  const { store, asked } = setup();
  await Promise.all([store.preload(["ana"]), store.preload(["ana"]), store.preload(["ana"])]);
  await store.preload(["ana"]);
  expect(asked).toEqual([["ana"]]);
});

test("solo pide los que no se conocen", async () => {
  const { store, asked } = setup();
  await store.preload(["ana"]);
  await store.preload(["ana", "beto"]);
  expect(asked).toEqual([["ana"], ["beto"]]);
});

test("quien no tiene perfil se recuerda y no se vuelve a preguntar", async () => {
  const { store, asked } = setup();
  await store.preload(["nadie"]);
  await store.preload(["nadie"]);
  expect(store.nameOf("nadie")).toBeNull();
  expect(asked).toEqual([["nadie"]]);
});

test("un fallo no se recuerda: se puede reintentar", async () => {
  let fail = true;
  const { store } = setup(async (ids) => {
    if (fail) throw new Error("sin red");
    return { [ids[0]]: "Ana Torres" };
  });
  await store.preload(["ana"]);
  expect(store.nameOf("ana")).toBeNull();
  fail = false;
  await store.preload(["ana"]);
  expect(store.nameOf("ana")).toBe("Ana Torres");
});

test("clear olvida todo", async () => {
  const { store } = setup();
  await store.preload(["ana"]);
  store.clear();
  expect(store.nameOf("ana")).toBeNull();
});

test("una lectura de la sesión anterior no escribe en la nueva", async () => {
  let release: (v: Record<string, string>) => void = () => {};
  const { store } = setup(() => new Promise((resolve) => (release = resolve)));
  const slow = store.preload(["ana"]);
  store.clear();
  release({ ana: "Ana Torres" });
  await slow;
  expect(store.nameOf("ana")).toBeNull();
});

test("bindUser olvida al cambiar de persona, pero no la primera vez", async () => {
  const { store } = setup();
  store.bindUser("u1");
  await store.preload(["ana"]);
  store.bindUser("u1");
  expect(store.nameOf("ana")).toBe("Ana Torres");
  store.bindUser("u2");
  expect(store.nameOf("ana")).toBeNull();
});

test("avisa a quien escucha cuando llegan nombres, y deja de avisar al desuscribirse", async () => {
  const { store } = setup();
  const listener = jest.fn();
  const off = store.subscribe(listener);
  await store.preload(["ana"]);
  expect(listener).toHaveBeenCalledTimes(1);
  off();
  await store.preload(["beto"]);
  expect(listener).toHaveBeenCalledTimes(1);
});
