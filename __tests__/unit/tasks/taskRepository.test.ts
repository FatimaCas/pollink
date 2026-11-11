import { DummyData } from "@/src/core/data/dummyData";
import { TABLES } from "@/src/core/roble/tables";
import { MembersInMemoryDataSource } from "@/src/features/members/data/datasources/MembersInMemoryDataSource";
import { MembersRepositoryImpl } from "@/src/features/members/data/repositories/MembersRepositoryImpl";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { TaskInMemoryDataSource } from "@/src/features/tasks/data/datasources/TaskInMemoryDataSource";
import { TaskRepositoryImpl } from "@/src/features/tasks/data/repositories/TaskRepositoryImpl";
import { TasksFailure } from "@/src/features/tasks/domain/TasksFailure";
import { fake } from "../../support/fake";

const T0 = new Date("2026-05-01T10:00:00Z");

async function setup() {
  const data = new DummyData({ latencyMs: 0 });
  data.session = data.users[0]; // Ana crea las tareas
  data.table(TABLES.project).push({ _id: "p1", _owner: "u_ana", progress: 0, total_tasks: 0 });
  let now = T0;
  const clock = () => now;
  const members = new MembersRepositoryImpl(new MembersInMemoryDataSource(data), clock);
  const repo = new TaskRepositoryImpl(new TaskInMemoryDataSource(data), members, clock);
  await members.addMember({ projectId: "p1", userId: "u_ana", role: "owner" });
  await members.addMember({ projectId: "p1", userId: "u_beto" });
  const project = () => data.table(TABLES.project)[0];
  const stay = async (userId: string) => (await members.staysOf("p1", userId)).find((s) => s.status === "active")!;
  return { data, repo, members, project, stay, tick: (d: Date) => (now = d) };
}

describe("createTask", () => {
  test("nace pendiente y recalcula total y progreso del proyecto", async () => {
    const { repo, project } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "  Logo  " });
    expect(task).toMatchObject({ title: "Logo", status: "todo", assigneeId: null, deadline: null, creatorId: "u_ana" });
    expect(project()).toMatchObject({ total_tasks: 1, progress: 0 });
  });

  test("guarda la fecha límite si se indica", async () => {
    const { repo } = await setup();
    const deadline = new Date("2026-05-20T04:59:59.999Z");
    const task = await repo.createTask({ projectId: "p1", title: "Logo", deadline });
    expect((await repo.getTasks("p1"))[0].deadline).toEqual(deadline);
    expect(task.deadline).toEqual(deadline);
  });

  test("exige un título", async () => {
    const { repo } = await setup();
    await expect(repo.createTask({ projectId: "p1", title: "   " })).rejects.toBeInstanceOf(TasksFailure);
  });
});

describe("reserveTask", () => {
  test("queda doing con la persona como responsable y suma una tomada", async () => {
    const { repo, stay, project } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    const reserved = await repo.reserveTask({ task, userId: "u_beto" });
    expect(reserved).toMatchObject({ status: "doing", assigneeId: "u_beto" });
    expect((await stay("u_beto")).taken).toBe(1);
    expect(project().progress).toBe(0);
  });

  test("no pisa a quien se adelantó", async () => {
    const { repo, stay } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    await repo.reserveTask({ task, userId: "u_beto" });
    // `task` es la copia vieja: todavía dice «pendiente».
    await expect(repo.reserveTask({ task, userId: "u_ana" })).rejects.toThrow("ya fue reservada por otra persona");
    expect((await repo.getTasks("p1"))[0].assigneeId).toBe("u_beto");
    expect((await stay("u_ana")).taken).toBe(0);
  });

  test("retomar una tarea propia devuelta a pendiente no suma otra tomada", async () => {
    const { repo, stay, data } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    await repo.reserveTask({ task, userId: "u_beto" });
    // Vuelve a `todo` pero sigue a su nombre (p. ej. la devolvió a pendiente).
    data.table(TABLES.task)[0].status = "todo";
    await repo.reserveTask({ task, userId: "u_beto" });
    expect((await stay("u_beto")).taken).toBe(1);
  });

  test("falla si la tarea ya no existe", async () => {
    const { repo } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    await repo.deleteTask(task);
    await expect(repo.reserveTask({ task, userId: "u_beto" })).rejects.toThrow("ya no existe");
  });
});

describe("assignTask", () => {
  test("el creador deja la tarea doing con esa persona y suma una tomada", async () => {
    const { repo, stay } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    const assigned = await repo.assignTask({ task, assigneeId: "u_beto", requestedBy: "u_ana" });
    expect(assigned).toMatchObject({ status: "doing", assigneeId: "u_beto" });
    expect((await repo.getTasks("p1"))[0]).toMatchObject({ status: "doing", assigneeId: "u_beto" });
    expect((await stay("u_beto")).taken).toBe(1);
  });

  test("el creador se la puede asignar a sí mismo", async () => {
    const { repo, stay } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    await repo.assignTask({ task, assigneeId: "u_ana", requestedBy: "u_ana" });
    expect((await stay("u_ana")).taken).toBe(1);
  });

  test("quien no es el creador no puede asignar", async () => {
    const { repo, stay } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    await expect(repo.assignTask({ task, assigneeId: "u_beto", requestedBy: "u_beto" })).rejects.toThrow("Solo quien creó");
    expect((await repo.getTasks("p1"))[0].status).toBe("todo");
    expect((await stay("u_beto")).taken).toBe(0);
  });

  test("la persona debe ser miembro activo", async () => {
    const { repo, members } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    await expect(repo.assignTask({ task, assigneeId: "u_otro", requestedBy: "u_ana" })).rejects.toThrow("no es miembro");
    await members.leave({ projectId: "p1", userId: "u_beto" });
    await expect(repo.assignTask({ task, assigneeId: "u_beto", requestedBy: "u_ana" })).rejects.toThrow("no es miembro");
  });

  test("no reasigna una tarea que ya tiene responsable", async () => {
    const { repo, stay } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "Logo" });
    await repo.reserveTask({ task, userId: "u_beto" });
    await expect(repo.assignTask({ task, assigneeId: "u_ana", requestedBy: "u_ana" })).rejects.toThrow("ya tiene responsable");
    expect((await stay("u_ana")).taken).toBe(0);
  });
});

describe("updateTaskStatus", () => {
  test("terminarla escribe finished_at, el progreso y las terminadas de quien la tiene", async () => {
    const { repo, stay, project, tick } = await setup();
    const a = await repo.createTask({ projectId: "p1", title: "A" });
    await repo.createTask({ projectId: "p1", title: "B" });
    const reserved = await repo.reserveTask({ task: a, userId: "u_beto" });
    tick(new Date("2026-05-02T12:00:00Z"));
    const done = await repo.updateTaskStatus({ task: reserved, status: "done" });
    expect(done.finishedAt).toEqual(new Date("2026-05-02T12:00:00Z"));
    expect(project()).toMatchObject({ total_tasks: 2, progress: 50 });
    expect((await stay("u_beto")).finished).toBe(1);
  });

  test("reabrirla borra finished_at y baja las terminadas", async () => {
    const { repo, stay, project } = await setup();
    const task = await repo.reserveTask({ task: await repo.createTask({ projectId: "p1", title: "A" }), userId: "u_beto" });
    const done = await repo.updateTaskStatus({ task, status: "done" });
    const reopened = await repo.updateTaskStatus({ task: done, status: "doing" });
    expect(reopened.finishedAt).toBeNull();
    expect((await repo.getTasks("p1"))[0].finishedAt).toBeNull();
    expect((await stay("u_beto")).finished).toBe(0);
    expect(project().progress).toBe(0);
  });

  test("un cambio que no toca terminada/no terminada no mueve finished_at", async () => {
    const { repo, tick } = await setup();
    const task = await repo.reserveTask({ task: await repo.createTask({ projectId: "p1", title: "A" }), userId: "u_beto" });
    const done = await repo.updateTaskStatus({ task, status: "done" });
    tick(new Date("2026-06-01T00:00:00Z"));
    const saved = await repo.saveTaskProgress({ task: done, description: "nota", subtasks: [{ title: "x", done: true }] });
    expect(saved.finishedAt).toEqual(T0);
  });
});

describe("saveTaskProgress", () => {
  test("completar el checklist termina la tarea; desmarcar la reabre", async () => {
    const { repo, project, stay } = await setup();
    const task = await repo.reserveTask({ task: await repo.createTask({ projectId: "p1", title: "A" }), userId: "u_beto" });
    const done = await repo.saveTaskProgress({
      task,
      description: "Listo",
      subtasks: [{ title: "Boceto", done: true }, { title: "Final", done: true }],
    });
    expect(done).toMatchObject({ status: "done", description: "Listo" });
    expect(done.finishedAt).toEqual(T0);
    expect(project().progress).toBe(100);
    expect((await stay("u_beto")).finished).toBe(1);
    // El checklist viaja como texto JSON y se lee de vuelta.
    expect((await repo.getTasks("p1"))[0].subtasks).toEqual([{ title: "Boceto", done: true }, { title: "Final", done: true }]);

    const reopened = await repo.saveTaskProgress({
      task: done,
      description: "Listo",
      subtasks: [{ title: "Boceto", done: true }, { title: "Final", done: false }],
    });
    expect(reopened.status).toBe("doing");
    expect(reopened.finishedAt).toBeNull();
    expect(project().progress).toBe(0);
  });
});

describe("updateTaskDeadline", () => {
  test("cambia la fecha y deja un comentario automático", async () => {
    const { repo } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "A" });
    const deadline = new Date(2026, 4, 20, 23, 59, 59, 999);
    const updated = await repo.updateTaskDeadline({ task, deadline, userId: "u_ana" });
    expect(updated.deadline).toEqual(deadline);
    const [comment] = await repo.getComments(task);
    expect(comment).toMatchObject({ userId: "u_ana", body: "Fecha límite fijada: 20/05/2026." });
  });

  test("sin cambio real no escribe ni comenta", async () => {
    const { repo } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "A" });
    await repo.updateTaskDeadline({ task, deadline: null, userId: "u_ana" });
    expect(await repo.getComments(task)).toEqual([]);
  });

  test("no se cambia en una tarea terminada", async () => {
    const { repo } = await setup();
    const task = await repo.reserveTask({ task: await repo.createTask({ projectId: "p1", title: "A" }), userId: "u_beto" });
    const done = await repo.updateTaskStatus({ task, status: "done" });
    await expect(repo.updateTaskDeadline({ task: done, deadline: new Date(), userId: "u_ana" })).rejects.toThrow("ya está terminada");
  });
});

describe("getComments", () => {
  test("del más nuevo al más viejo", async () => {
    const { repo, tick } = await setup();
    const task = await repo.createTask({ projectId: "p1", title: "A" });
    await repo.addComment({ task, userId: "u_ana", body: "primero" });
    tick(new Date("2026-05-03T10:00:00Z"));
    await repo.addComment({ task, userId: "u_beto", body: "segundo" });
    expect((await repo.getComments(task)).map((c) => c.body)).toEqual(["segundo", "primero"]);
  });
});

describe("releaseUnfinishedTasks", () => {
  test("libera las pendientes y en progreso de la persona, no las terminadas ni las de otros", async () => {
    const { repo, stay, project } = await setup();
    const mk = (title: string) => repo.createTask({ projectId: "p1", title });
    const doing = await repo.reserveTask({ task: await mk("doing"), userId: "u_beto" });
    const finished = await repo.updateTaskStatus({ task: await repo.reserveTask({ task: await mk("done"), userId: "u_beto" }), status: "done" });
    const other = await repo.reserveTask({ task: await mk("de Ana"), userId: "u_ana" });

    expect(await repo.releaseUnfinishedTasks({ projectId: "p1", userId: "u_beto" })).toBe(1);

    const byId = Object.fromEntries((await repo.getTasks("p1")).map((t) => [t.id, t]));
    expect(byId[doing.id]).toMatchObject({ status: "todo", assigneeId: null });
    expect(byId[finished.id]).toMatchObject({ status: "done", assigneeId: "u_beto" });
    expect(byId[other.id]).toMatchObject({ status: "doing", assigneeId: "u_ana" });
    // Lo que soltó sigue contando como tomado; el progreso no cambia.
    expect((await stay("u_beto")).taken).toBe(2);
    expect(project().progress).toBeCloseTo(100 / 3);
  });
});

describe("deleteTask", () => {
  test("quita la tarea, una tomada y recalcula total, progreso y terminadas", async () => {
    const { repo, stay, project } = await setup();
    const keep = await repo.createTask({ projectId: "p1", title: "queda" });
    const gone = await repo.updateTaskStatus({
      task: await repo.reserveTask({ task: await repo.createTask({ projectId: "p1", title: "se va" }), userId: "u_beto" }),
      status: "done",
    });
    expect((await stay("u_beto")).finished).toBe(1);

    await repo.deleteTask(gone);

    expect((await repo.getTasks("p1")).map((t) => t.id)).toEqual([keep.id]);
    expect(project()).toMatchObject({ total_tasks: 1, progress: 0 });
    expect(await stay("u_beto")).toMatchObject({ taken: 0, finished: 0 });
  });
});

describe("recalculateProgress", () => {
  test("cuenta desde cero y corrige un contador desviado", async () => {
    const { repo, project } = await setup();
    await repo.createTask({ projectId: "p1", title: "A" });
    project().progress = 99;
    project().total_tasks = 42;
    expect(await repo.recalculateProgress("p1")).toBe(0);
    expect(project()).toMatchObject({ total_tasks: 1, progress: 0 });
  });
});

describe("contadores con varias estancias", () => {
  test("las terminadas de la estancia nueva descuentan lo anotado en la anterior", async () => {
    const { repo, members, stay } = await setup();
    const t1 = await repo.reserveTask({ task: await repo.createTask({ projectId: "p1", title: "1" }), userId: "u_beto" });
    await repo.updateTaskStatus({ task: t1, status: "done" });
    await members.leave({ projectId: "p1", userId: "u_beto" });
    await members.addMember({ projectId: "p1", userId: "u_beto" });
    const t2 = await repo.reserveTask({ task: await repo.createTask({ projectId: "p1", title: "2" }), userId: "u_beto" });
    await repo.updateTaskStatus({ task: t2, status: "done" });

    const stays = await members.staysOf("p1", "u_beto");
    expect(stays.map((s) => s.finished).sort()).toEqual([1, 1]);
    expect((await stay("u_beto")).taken).toBe(1);
  });
});

describe("derivados que fallan", () => {
  test("no deshacen la tarea: se avisa y el siguiente cambio lo corrige", async () => {
    const data = new DummyData({ latencyMs: 0 });
    data.session = data.users[0];
    // Sin fila de proyecto: escribir el progreso falla.
    const members = fake<MembersRepository>({});
    const repo = new TaskRepositoryImpl(new TaskInMemoryDataSource(data), members);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const task = await repo.createTask({ projectId: "p1", title: "A" });
    expect(task.title).toBe("A");
    expect(await repo.getTasks("p1")).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
