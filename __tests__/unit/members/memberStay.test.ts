import {
  currentStay,
  finishedFor,
  MemberStay,
  roleOf,
} from "@/src/features/members/domain/entities/MemberStay";

const stay = (over: Partial<MemberStay> & { id: string }): MemberStay => ({
  projectId: "p1",
  userId: "u1",
  role: "collaborator",
  status: "active",
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  leftAt: null,
  taken: 0,
  finished: 0,
  ...over,
});

describe("roleOf", () => {
  test.each([
    [{ name: "owner" }, "owner"],
    [{ name: "creador" }, "owner"],
    ['{"name":"owner"}', "owner"],
    [{ name: "collaborator" }, "collaborator"],
    [{ name: "admin" }, "collaborator"],
    [null, "collaborator"],
    ["texto raro", "collaborator"],
  ])("%j → %s", (raw, expected) => {
    expect(roleOf(raw)).toBe(expected);
  });
});

describe("currentStay", () => {
  test("sin estancias no hay actual", () => {
    expect(currentStay([])).toBeNull();
  });

  test("prefiere la activa sobre una terminada más reciente", () => {
    const old = stay({ id: "a", joinedAt: new Date("2026-01-01T00:00:00Z") });
    const left = stay({ id: "b", status: "left", joinedAt: new Date("2026-03-01T00:00:00Z") });
    expect(currentStay([left, old])?.id).toBe("a");
  });

  test("sin ninguna activa, la más reciente", () => {
    const a = stay({ id: "a", status: "left", joinedAt: new Date("2026-01-01T00:00:00Z") });
    const b = stay({ id: "b", status: "removed", joinedAt: new Date("2026-03-01T00:00:00Z") });
    expect(currentStay([a, b])?.id).toBe("b");
  });
});

describe("finishedFor", () => {
  test("el total menos lo anotado por las otras estancias", () => {
    const a = stay({ id: "a", status: "left", finished: 2 });
    const b = stay({ id: "b" });
    expect(finishedFor(b, [a, b], 5)).toBe(3);
  });

  test("nunca es negativo", () => {
    const a = stay({ id: "a", status: "left", finished: 4 });
    const b = stay({ id: "b" });
    expect(finishedFor(b, [a, b], 1)).toBe(0);
  });
});
