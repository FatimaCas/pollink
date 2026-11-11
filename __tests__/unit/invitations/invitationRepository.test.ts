import { DummyData } from "@/src/core/data/dummyData";
import { createLocalContainer } from "@/src/core/di/localContainer";
import { TOKENS } from "@/src/core/di/tokens";
import { TABLES } from "@/src/core/roble/tables";
import { InvitationDataSource } from "@/src/features/invitations/data/datasources/InvitationDataSource";
import { InvitationInMemoryDataSource } from "@/src/features/invitations/data/datasources/InvitationInMemoryDataSource";
import { InvitationRepositoryImpl } from "@/src/features/invitations/data/repositories/InvitationRepositoryImpl";
import { InvitationsFailure } from "@/src/features/invitations/domain/InvitationsFailure";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { fake } from "../../support/fake";

const NOW = new Date("2026-11-10T15:00:00Z");
const beto = { email: "beto@demo.com", userId: "u_beto" };
const carla = { email: "carla@demo.com", userId: "u_carla" };

function setup() {
  const data = new DummyData({ latencyMs: 0 });
  data.session = { userId: "u_ana" };
  const repo = new InvitationRepositoryImpl(new InvitationInMemoryDataSource(data), () => NOW);
  return { data, repo, rows: () => data.table(TABLES.projectInvitation) };
}

describe("findAccounts", () => {
  test("separa los correos con cuenta de los que no, limpios y sin repetir", async () => {
    const { repo } = setup();
    expect(await repo.findAccounts([" Beto@Demo.com", "beto@demo.com", "nadie@x.co", ""])).toEqual({
      found: [beto],
      missing: ["nadie@x.co"],
    });
  });

  test("sin correos no consulta nada", async () => {
    const source = fake<InvitationDataSource>({});
    expect(await new InvitationRepositoryImpl(source).findAccounts([])).toEqual({ found: [], missing: [] });
  });
});

describe("invite", () => {
  test("crea una invitación pendiente por persona, firmada por quien invita", async () => {
    const { repo } = setup();
    const created = await repo.invite({ projectId: "p1", invitees: [beto, carla, beto] });
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({ projectId: "p1", userId: "u_beto", status: "pending", invitedBy: "u_ana", createdAt: NOW });
  });

  test("reintentar no duplica a quien ya tiene una pendiente", async () => {
    const { repo, rows } = setup();
    await repo.invite({ projectId: "p1", invitees: [beto] });
    expect(await repo.invite({ projectId: "p1", invitees: [beto] })).toEqual([]);
    expect(rows()).toHaveLength(1);
  });

  test("si el servidor rechaza filas, lo dice", async () => {
    const source = fake<InvitationDataSource>({ readInvitations: async () => [], createInvitations: async () => [] });
    const repo = new InvitationRepositoryImpl(source, () => NOW);
    await expect(repo.invite({ projectId: "p1", invitees: [beto] })).rejects.toBeInstanceOf(InvitationsFailure);
  });
});

describe("pendingFor, accept y decline", () => {
  test("lista solo las pendientes de la persona, la más nueva primero", async () => {
    const { repo, rows } = setup();
    rows().push(
      { _id: "a", project_id: "p1", user_id: "u_beto", status: "pending", createdAt: "2026-01-01T00:00:00Z" },
      { _id: "b", project_id: "p2", user_id: "u_beto", status: "pending", createdAt: "2026-02-01T00:00:00Z" },
      { _id: "c", project_id: "p3", user_id: "u_beto", status: "accepted" },
      { _id: "d", project_id: "p1", user_id: "u_carla", status: "pending" },
    );
    expect((await repo.pendingFor("u_beto")).map((i) => i.id)).toEqual(["b", "a"]);
  });

  test("aceptar y rechazar escriben el estado y la hora", async () => {
    const { repo, rows } = setup();
    const [first, second] = await repo.invite({ projectId: "p1", invitees: [beto, carla] });
    await repo.accept(first.id);
    await repo.decline(second.id);
    expect(rows().map((r) => [r.status, r.respondedAt])).toEqual([
      ["accepted", NOW.toISOString()],
      ["declined", NOW.toISOString()],
    ]);
  });

  test("una invitación ya respondida no se vuelve a responder", async () => {
    const { repo } = setup();
    const [invitation] = await repo.invite({ projectId: "p1", invitees: [beto] });
    await repo.decline(invitation.id);
    await expect(repo.accept(invitation.id)).rejects.toThrow("Esta invitación ya fue respondida.");
    await expect(repo.accept("nada")).rejects.toThrow("La invitación ya no existe.");
  });
});

test("cancelPending cierra solo las pendientes de esa persona en ese proyecto", async () => {
  const { repo, rows } = setup();
  await repo.invite({ projectId: "p1", invitees: [beto, carla] });
  await repo.invite({ projectId: "p2", invitees: [beto] });
  expect(await repo.cancelPending({ projectId: "p1", userId: "u_beto" })).toBe(1);
  expect(rows().map((r) => `${r.project_id}/${r.user_id}/${r.status}`)).toEqual([
    "p1/u_beto/cancelled",
    "p1/u_carla/pending",
    "p2/u_beto/pending",
  ]);
  expect(await repo.cancelPending({ projectId: "p1", userId: "u_beto" })).toBe(0);
});

test("deleteForProject borra todas las del proyecto y nada más", async () => {
  const { repo, rows } = setup();
  await repo.invite({ projectId: "p1", invitees: [beto, carla] });
  await repo.invite({ projectId: "p2", invitees: [beto] });
  await repo.deleteForProject("p1");
  expect(rows().map((r) => r.project_id)).toEqual(["p2"]);
});

test("el contenedor local registra InvitationRepo", () => {
  const repo = createLocalContainer(new DummyData({ latencyMs: 0 })).resolve<InvitationRepository>(TOKENS.InvitationRepo);
  expect(repo.findAccounts).toBeInstanceOf(Function);
});
