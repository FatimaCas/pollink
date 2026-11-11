import { FEED_MODES, sortForMode } from "@/src/features/discover/domain/entities/FeedMode";
import { activeCount, matchesFilter, NO_FILTER } from "@/src/features/discover/domain/entities/ProjectFilter";
import { project } from "../../support/discoverFixtures";

describe("matchesFilter", () => {
  const p = project({ jobs: ["Ing. Sistemas"], skills: ["Python"], status: "closed" });

  test("sin filtros todo pasa", () => {
    expect(matchesFilter(p, NO_FILTER)).toBe(true);
  });

  test("compara por clave normalizada, no por el texto", () => {
    expect(matchesFilter(p, { ...NO_FILTER, career: "ing sistemas" })).toBe(true);
    expect(matchesFilter(p, { ...NO_FILTER, career: "Ing. Sistemas" })).toBe(false);
  });

  test("«solo abiertos» deja fuera los cerrados", () => {
    expect(matchesFilter(p, { ...NO_FILTER, onlyOpen: true })).toBe(false);
  });

  test("un proyecto sin carreras solo aparece con carrera = Todas", () => {
    const bare = project({ jobs: [] });
    expect(matchesFilter(bare, NO_FILTER)).toBe(true);
    expect(matchesFilter(bare, { ...NO_FILTER, career: "x" })).toBe(false);
  });

  test("carrera y habilidad se exigen a la vez", () => {
    expect(matchesFilter(p, { ...NO_FILTER, career: "ing sistemas", skill: "java" })).toBe(false);
    expect(matchesFilter(p, { ...NO_FILTER, career: "ing sistemas", skill: "python" })).toBe(true);
  });
});

test("activeCount cuenta de 0 a 3", () => {
  expect(activeCount(NO_FILTER)).toBe(0);
  expect(activeCount({ career: "a", skill: "b", onlyOpen: true })).toBe(3);
});

describe("sortForMode", () => {
  const a = project({ id: "a", progress: 10, memberCount: 5 });
  const b = project({ id: "b", progress: 90, memberCount: 1 });
  const c = project({ id: "c", progress: 90, memberCount: null });

  test("«Para ti» conserva el orden del servidor", () => {
    expect(sortForMode([a, b, c], "forYou").map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
  test("«Destacados» pone primero el mayor avance, estable en empates", () => {
    expect(sortForMode([a, b, c], "featured").map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
  test("«Comunidad» pone primero a los de más miembros (nulo cuenta 0)", () => {
    expect(sortForMode([c, b, a], "community").map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
  test("no muta la lista recibida", () => {
    const input = [a, b];
    sortForMode(input, "featured");
    expect(input.map((p) => p.id)).toEqual(["a", "b"]);
  });
  test("hay un modo por cada opción del selector", () => {
    expect(FEED_MODES.map((m) => m.label)).toEqual(["Para ti", "Destacados", "Comunidad"]);
  });
});
