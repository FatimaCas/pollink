import { DummyData } from "@/src/core/data/dummyData";
import { TABLES } from "@/src/core/roble/tables";
import { JoinRequestInMemoryDataSource } from "@/src/features/requests/data/datasources/JoinRequestInMemoryDataSource";
import { JoinRequestRepositoryImpl, stateOf } from "@/src/features/requests/data/repositories/JoinRequestRepositoryImpl";
import { RequestsFailure } from "@/src/features/requests/domain/RequestsFailure";

function setup() {
  const data = new DummyData({ latencyMs: 0 });
  data.table(TABLES.project).push(
    { _id: "p1", _owner: "u_owner", status: "open" },
    { _id: "closed", _owner: "u_owner", status: "closed" },
  );
  let now = new Date("2026-11-10T10:00:00Z");
  const repo = new JoinRequestRepositoryImpl(new JoinRequestInMemoryDataSource(data), () => now);
  return { data, repo, tick: (d: Date) => (now = d) };
}

describe("apply", () => {
  test("crea una solicitud pendiente con las fechas del reloj", async () => {
    const { repo, data } = setup();
    const request = await repo.apply({ projectId: "p1", userId: "u_ana" });
    expect(request).toMatchObject({ projectId: "p1", userId: "u_ana", state: "pending", reviewedBy: null });
    expect(request.createdAt).toEqual(new Date("2026-11-10T10:00:00Z"));
    expect(data.table(TABLES.projectJoinRequest)[0].status).toEqual({ state: "pending" });
  });

  test("no deja una segunda pendiente en el mismo proyecto", async () => {
    const { repo } = setup();
    await repo.apply({ projectId: "p1", userId: "u_ana" });
    await expect(repo.apply({ projectId: "p1", userId: "u_ana" })).rejects.toThrow("Ya tienes una postulación pendiente aquí.");
  });

  test("tras ser rechazada, puede volver a postularse", async () => {
    const { repo } = setup();
    const first = await repo.apply({ projectId: "p1", userId: "u_ana" });
    await repo.decide({ requestId: first.id, accepted: false, reviewerId: "u_owner" });
    await expect(repo.apply({ projectId: "p1", userId: "u_ana" })).resolves.toMatchObject({ state: "pending" });
  });

  test("un proyecto cerrado ya no recibe solicitudes", async () => {
    const { repo } = setup();
    await expect(repo.apply({ projectId: "closed", userId: "u_ana" })).rejects.toThrow("Este proyecto está cerrado");
  });

  test("sin sesión o sin proyecto falla con RequestsFailure", async () => {
    const { repo } = setup();
    await expect(repo.apply({ projectId: "p1", userId: "" })).rejects.toBeInstanceOf(RequestsFailure);
  });
});

describe("lectura", () => {
  test("las pendientes van primero y, en cada grupo, la más reciente arriba", async () => {
    const { repo, tick } = setup();
    const a = await repo.apply({ projectId: "p1", userId: "u_a" });
    tick(new Date("2026-11-10T11:00:00Z"));
    await repo.apply({ projectId: "p1", userId: "u_b" });
    tick(new Date("2026-11-10T12:00:00Z"));
    await repo.apply({ projectId: "p1", userId: "u_c" });
    await repo.decide({ requestId: a.id, accepted: true, reviewerId: "u_owner" });
    const list = await repo.requestsForProject("p1");
    expect(list.map((r) => r.userId)).toEqual(["u_c", "u_b", "u_a"]);
    expect(await repo.pendingCount("p1")).toBe(2);
  });

  test("requestById devuelve null si no existe", async () => {
    const { repo } = setup();
    expect(await repo.requestById("nada")).toBeNull();
    expect(await repo.requestById("")).toBeNull();
  });
});

describe("decide", () => {
  test("acepta y guarda quién la resolvió", async () => {
    const { repo, data } = setup();
    const request = await repo.apply({ projectId: "p1", userId: "u_ana" });
    const decided = await repo.decide({ requestId: request.id, accepted: true, reviewerId: "u_owner" });
    expect(decided).toMatchObject({ state: "accepted", reviewedBy: "u_owner" });
    expect(data.table(TABLES.projectJoinRequest)[0]).toMatchObject({ status: { state: "accepted" }, reviewed_by: "u_owner" });
  });

  test("solo el creador del proyecto resuelve", async () => {
    const { repo } = setup();
    const request = await repo.apply({ projectId: "p1", userId: "u_ana" });
    await expect(repo.decide({ requestId: request.id, accepted: true, reviewerId: "u_otro" })).rejects.toThrow("Solo el creador");
  });

  test("una solicitud ya resuelta no se vuelve a resolver", async () => {
    const { repo } = setup();
    const request = await repo.apply({ projectId: "p1", userId: "u_ana" });
    await repo.decide({ requestId: request.id, accepted: false, reviewerId: "u_owner" });
    await expect(repo.decide({ requestId: request.id, accepted: true, reviewerId: "u_owner" })).rejects.toThrow("ya fue resuelta");
  });

  test("no se acepta una solicitud de un proyecto que se cerró después, pero sí se rechaza", async () => {
    const { repo, data } = setup();
    const request = await repo.apply({ projectId: "p1", userId: "u_ana" });
    data.table(TABLES.project)[0].status = "closed";
    await expect(repo.ensureAcceptable(request.id)).rejects.toThrow("cerrado");
    await expect(repo.decide({ requestId: request.id, accepted: true, reviewerId: "u_owner" })).rejects.toThrow("cerrado");
    await expect(repo.decide({ requestId: request.id, accepted: false, reviewerId: "u_owner" })).resolves.toMatchObject({ state: "rejected" });
  });

  test("una solicitud que no existe falla con un mensaje", async () => {
    const { repo } = setup();
    await expect(repo.decide({ requestId: "nada", accepted: true, reviewerId: "u_owner" })).rejects.toThrow("No se encontró la solicitud.");
  });
});

test("cancelPending cancela solo las pendientes de esa persona en ese proyecto", async () => {
  const { repo } = setup();
  await repo.apply({ projectId: "p1", userId: "u_ana" });
  await repo.apply({ projectId: "p1", userId: "u_beto" });
  expect(await repo.cancelPending({ projectId: "p1", userId: "u_ana", cancelledBy: "u_owner" })).toBe(1);
  const states = Object.fromEntries((await repo.requestsForProject("p1")).map((r) => [r.userId, r.state]));
  expect(states).toEqual({ u_ana: "cancelled", u_beto: "pending" });
  expect(await repo.cancelPending({ projectId: "p1", userId: "u_ana", cancelledBy: "u_owner" })).toBe(0);
});

describe("stateOf", () => {
  test.each([
    [{ state: "accepted" }, "accepted"],
    [{ status: "rejected" }, "rejected"],
    ['{"state":"pending"}', "pending"],
    ["PENDING", "pending"],
    ["denied", "cancelled"],
    [null, "cancelled"],
  ])("%j → %s (lo desconocido nunca cuenta como pendiente)", (raw, expected) => {
    expect(stateOf(raw)).toBe(expected);
  });
});
