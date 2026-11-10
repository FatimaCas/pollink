import { DummyData } from "@/src/core/data/dummyData";
import { TABLES } from "@/src/core/roble/tables";
import { MembersInMemoryDataSource } from "@/src/features/members/data/datasources/MembersInMemoryDataSource";
import { MembersRepositoryImpl } from "@/src/features/members/data/repositories/MembersRepositoryImpl";
import { MembersFailure } from "@/src/features/members/domain/MembersFailure";

function setup() {
  const data = new DummyData({ latencyMs: 0 });
  data.table(TABLES.project).push({ _id: "p1", _owner: "u_ana" }, { _id: "p2", _owner: "u_beto" });
  let now = new Date("2026-05-01T10:00:00Z");
  const repo = new MembersRepositoryImpl(new MembersInMemoryDataSource(data), () => now);
  return { data, repo, tick: (d: Date) => (now = d) };
}

describe("addMember", () => {
  test("crea una estancia activa con contadores en cero", async () => {
    const { repo } = setup();
    const stay = await repo.addMember({ projectId: "p1", userId: "u_ana", role: "owner" });
    expect(stay).toMatchObject({ projectId: "p1", userId: "u_ana", role: "owner", status: "active", taken: 0, finished: 0 });
    expect(stay.joinedAt).toEqual(new Date("2026-05-01T10:00:00Z"));
  });

  test("no duplica al miembro activo: devuelve la misma estancia", async () => {
    const { repo, data } = setup();
    const first = await repo.addMember({ projectId: "p1", userId: "u_beto" });
    const again = await repo.addMember({ projectId: "p1", userId: "u_beto", role: "owner" });
    expect(again.id).toBe(first.id);
    expect(again.role).toBe("collaborator");
    expect(data.table(TABLES.projectMember)).toHaveLength(1);
  });

  test("tras salir, el reingreso crea una fila nueva y conserva la vieja", async () => {
    const { repo, data } = setup();
    await repo.addMember({ projectId: "p1", userId: "u_ana", role: "owner" });
    const first = await repo.addMember({ projectId: "p1", userId: "u_beto" });
    await repo.leave({ projectId: "p1", userId: "u_beto" });
    const second = await repo.addMember({ projectId: "p1", userId: "u_beto" });
    expect(second.id).not.toBe(first.id);
    expect(data.table(TABLES.projectMember)).toHaveLength(3);
    const stays = await repo.staysOf("p1", "u_beto");
    expect(stays.map((s) => s.status).sort()).toEqual(["active", "left"]);
  });

  test("rechaza proyecto o persona vacíos", async () => {
    const { repo } = setup();
    await expect(repo.addMember({ projectId: "", userId: "u1" })).rejects.toBeInstanceOf(MembersFailure);
  });
});

describe("activeMembers", () => {
  test("solo los activos, sin repetidos y con el creador primero", async () => {
    const { repo, data, tick } = setup();
    await repo.addMember({ projectId: "p1", userId: "u_beto" });
    tick(new Date("2026-05-02T10:00:00Z"));
    await repo.addMember({ projectId: "p1", userId: "u_ana", role: "owner" });
    await repo.addMember({ projectId: "p1", userId: "u_carla" });
    await repo.leave({ projectId: "p1", userId: "u_carla" });
    // Roble no garantiza unicidad: una fila activa repetida no duplica a nadie.
    data.table(TABLES.projectMember).push({ _id: "dup", project_id: "p1", user_id: "u_beto", role: { name: "collaborator" }, status: "active" });
    expect(await repo.activeMemberIds("p1")).toEqual(["u_ana", "u_beto"]);
  });
});

describe("activeMemberCounts", () => {
  test("cuenta activos por proyecto, una persona una vez", async () => {
    const { repo } = setup();
    await repo.addMember({ projectId: "p1", userId: "u_ana", role: "owner" });
    await repo.addMember({ projectId: "p1", userId: "u_beto" });
    await repo.addMember({ projectId: "p2", userId: "u_beto", role: "owner" });
    await repo.leave({ projectId: "p1", userId: "u_beto" });
    expect(await repo.activeMemberCounts()).toEqual({ p1: 1, p2: 1 });
    expect(await repo.activeMemberCounts("p2")).toEqual({ p2: 1 });
  });
});

describe("leave", () => {
  test("pasa la estancia a left con su fecha", async () => {
    const { repo, tick } = setup();
    await repo.addMember({ projectId: "p1", userId: "u_ana", role: "owner" });
    await repo.addMember({ projectId: "p1", userId: "u_beto" });
    tick(new Date("2026-05-03T09:00:00Z"));
    await repo.leave({ projectId: "p1", userId: "u_beto" });
    const [stay] = await repo.staysOf("p1", "u_beto");
    expect(stay.status).toBe("left");
    expect(stay.leftAt).toEqual(new Date("2026-05-03T09:00:00Z"));
  });

  test("el creador no puede salir (por `_owner` del proyecto)", async () => {
    const { repo } = setup();
    await repo.addMember({ projectId: "p1", userId: "u_ana" });
    await expect(repo.leave({ projectId: "p1", userId: "u_ana" })).rejects.toThrow("El creador no puede salir");
  });

  test("el creador no puede salir (por rol `owner` sin fila de proyecto)", async () => {
    const { repo } = setup();
    await repo.addMember({ projectId: "huerfano", userId: "u_ana", role: "owner" });
    await expect(repo.leave({ projectId: "huerfano", userId: "u_ana" })).rejects.toBeInstanceOf(MembersFailure);
  });

  test("salir sin estancia activa no hace nada", async () => {
    const { repo } = setup();
    await expect(repo.leave({ projectId: "p1", userId: "u_beto" })).resolves.toBeUndefined();
  });
});

describe("remove", () => {
  async function team() {
    const s = setup();
    await s.repo.addMember({ projectId: "p1", userId: "u_ana", role: "owner" });
    await s.repo.addMember({ projectId: "p1", userId: "u_beto" });
    await s.repo.addMember({ projectId: "p1", userId: "u_carla" });
    return s;
  }

  test("el creador saca a un colaborador: su estancia pasa a removed", async () => {
    const { repo } = await team();
    await repo.remove({ projectId: "p1", memberUserId: "u_beto", requestedBy: "u_ana" });
    expect((await repo.staysOf("p1", "u_beto"))[0].status).toBe("removed");
    expect(await repo.activeMemberIds("p1")).toEqual(["u_ana", "u_carla"]);
  });

  test("un colaborador no puede sacar a nadie", async () => {
    const { repo } = await team();
    await expect(repo.remove({ projectId: "p1", memberUserId: "u_carla", requestedBy: "u_beto" })).rejects.toThrow("Solo el creador");
  });

  test("no se saca al creador ni a uno mismo", async () => {
    const { repo } = await team();
    await expect(repo.remove({ projectId: "p1", memberUserId: "u_ana", requestedBy: "u_ana" })).rejects.toThrow("usa «Salir»");
    await expect(repo.remove({ projectId: "p1", memberUserId: "u_ana", requestedBy: "u_beto" })).rejects.toBeInstanceOf(MembersFailure);
  });
});

describe("saveStayCounters", () => {
  test("escribe solo lo que se pasa", async () => {
    const { repo } = setup();
    const stay = await repo.addMember({ projectId: "p1", userId: "u_beto" });
    await repo.saveStayCounters(stay.id, { taken: 3 });
    await repo.saveStayCounters(stay.id, { finished: 2 });
    const [saved] = await repo.staysOf("p1", "u_beto");
    expect(saved).toMatchObject({ taken: 3, finished: 2 });
  });
});
