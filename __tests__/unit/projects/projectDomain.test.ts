import { cleanLabels, draftError, isOpen, isOwnedBy, Project, PROJECT_LIMITS } from "@/src/features/projects/domain/entities/Project";
import { relationOf, RelationFacts } from "@/src/features/projects/domain/entities/ProjectRelation";
import { projectStatusOf } from "@/src/features/projects/domain/entities/ProjectStatus";

const project = (over: Partial<Project> = {}): Project => ({
  id: "p1",
  ownerId: "u1",
  title: "Huerta",
  description: "Una huerta",
  jobs: [],
  skills: [],
  status: "open",
  memberCount: 1,
  progress: 0,
  totalTasks: 0,
  createdAt: null,
  ...over,
});

const facts = (over: Partial<RelationFacts> = {}): RelationFacts => ({
  userId: "u2",
  isActiveMember: false,
  hasPendingInvitation: false,
  hasPendingRequest: false,
  isSaved: false,
  ...over,
});

describe("projectStatusOf", () => {
  test("lee open y closed", () => {
    expect(projectStatusOf("open")).toBe("open");
    expect(projectStatusOf("closed")).toBe("closed");
  });
  test("un estado desconocido cuenta como abierto", () => {
    expect(projectStatusOf("archivado")).toBe("open");
    expect(projectStatusOf(null)).toBe("open");
  });
});

test("isOpen e isOwnedBy", () => {
  expect(isOpen(project())).toBe(true);
  expect(isOpen(project({ status: "closed" }))).toBe(false);
  expect(isOwnedBy(project(), "u1")).toBe(true);
  expect(isOwnedBy(project(), "u2")).toBe(false);
  expect(isOwnedBy(project(), null)).toBe(false);
});

describe("cleanLabels", () => {
  test("quita vacíos, espacios de sobra y repetidos sin importar tildes ni mayúsculas", () => {
    expect(cleanLabels(["  Diseño  gráfico ", "", "diseno grafico", "Python", "PYTHON", "  "])).toEqual([
      "Diseño gráfico",
      "Python",
    ]);
  });
  test("conserva el orden escrito", () => {
    expect(cleanLabels(["b", "a", "c"])).toEqual(["b", "a", "c"]);
  });
});

describe("draftError", () => {
  const draft = { title: "Huerta", description: "Una huerta", jobs: [], skills: [] };
  test("un borrador completo se puede guardar", () => {
    expect(draftError(draft)).toBeNull();
  });
  test("exige nombre y descripción", () => {
    expect(draftError({ ...draft, title: "   " })).toBe("Ponle un nombre al proyecto.");
    expect(draftError({ ...draft, description: "" })).toBe("Describe el proyecto.");
  });
  test("respeta los límites de largo", () => {
    expect(draftError({ ...draft, title: "x".repeat(PROJECT_LIMITS.titleMax + 1) })).toContain("hasta");
    expect(draftError({ ...draft, description: "x".repeat(PROJECT_LIMITS.descriptionMax + 1) })).toContain("hasta");
  });
});

describe("relationOf", () => {
  test("el creador es owner aunque tenga todo lo demás", () => {
    expect(relationOf(project(), facts({ userId: "u1", isActiveMember: true, isSaved: true }))).toBe("owner");
  });
  test("sigue el orden active > invited > pending > saved > none", () => {
    const all = { isActiveMember: true, hasPendingInvitation: true, hasPendingRequest: true, isSaved: true };
    expect(relationOf(project(), facts(all))).toBe("active");
    expect(relationOf(project(), facts({ ...all, isActiveMember: false }))).toBe("invited");
    expect(relationOf(project(), facts({ hasPendingRequest: true, isSaved: true }))).toBe("pending");
    expect(relationOf(project(), facts({ isSaved: true }))).toBe("saved");
    expect(relationOf(project(), facts())).toBe("none");
  });
  test("sin sesión no es owner", () => {
    expect(relationOf(project({ ownerId: "" }), facts({ userId: null }))).toBe("none");
  });
});
