import {
  checklistProgress,
  isOverdueAt,
  progressOf,
  ProjectTask,
  statusAfterSaving,
} from "@/src/features/tasks/domain/entities/ProjectTask";
import { subtaskFromJson } from "@/src/features/tasks/domain/entities/Subtask";
import { TaskDeadline } from "@/src/features/tasks/domain/entities/TaskDeadline";
import { taskStatusOf } from "@/src/features/tasks/domain/entities/TaskStatus";

const task = (over: Partial<ProjectTask> = {}): ProjectTask => ({
  id: "t1",
  projectId: "p1",
  title: "Tarea",
  description: "",
  status: "todo",
  assigneeId: null,
  subtasks: [],
  deadline: null,
  creatorId: "u_ana",
  finishedAt: null,
  ...over,
});

test("un estado desconocido es pendiente", () => {
  expect(taskStatusOf("doing")).toBe("doing");
  expect(taskStatusOf("archivada")).toBe("todo");
  expect(taskStatusOf(undefined)).toBe("todo");
});

describe("subtaskFromJson", () => {
  test("descarta lo mal formado", () => {
    expect(subtaskFromJson(null)).toBeNull();
    expect(subtaskFromJson("x")).toBeNull();
    expect(subtaskFromJson({ title: "  " })).toBeNull();
    expect(subtaskFromJson({ title: " Hacer logo ", done: true })).toEqual({ title: "Hacer logo", done: true });
    expect(subtaskFromJson({ title: "Algo" })).toEqual({ title: "Algo", done: false });
  });
});

describe("progreso", () => {
  test("un proyecto sin tareas está en 0", () => {
    expect(progressOf([])).toBe(0);
  });

  test("porcentaje de terminadas", () => {
    expect(progressOf([task({ status: "done" }), task({ status: "doing" }), task(), task({ status: "done" })])).toBe(50);
  });

  test("avance del checklist", () => {
    expect(checklistProgress(task())).toBe(0);
    const t = task({ subtasks: [{ title: "a", done: true }, { title: "b", done: false }] });
    expect(checklistProgress(t)).toBe(0.5);
  });
});

describe("statusAfterSaving", () => {
  const done = [{ title: "a", done: true }];
  const mixed = [{ title: "a", done: true }, { title: "b", done: false }];

  test("todo hecho → terminada", () => expect(statusAfterSaving("doing", done)).toBe("done"));
  test("desmarcar una terminada → en progreso", () => expect(statusAfterSaving("done", mixed)).toBe("doing"));
  test("lo demás no cambia", () => {
    expect(statusAfterSaving("todo", mixed)).toBe("todo");
    expect(statusAfterSaving("doing", [])).toBe("doing");
    expect(statusAfterSaving("done", [])).toBe("doing");
  });
});

describe("vencida", () => {
  const deadline = new Date("2026-05-10T04:59:59.999Z");
  test("solo si tiene fecha, ya pasó y no está terminada", () => {
    const now = new Date("2026-05-11T00:00:00Z");
    expect(isOverdueAt(task({ deadline }), now)).toBe(true);
    expect(isOverdueAt(task({ deadline, status: "done" }), now)).toBe(false);
    expect(isOverdueAt(task(), now)).toBe(false);
    expect(isOverdueAt(task({ deadline }), new Date("2026-05-09T00:00:00Z"))).toBe(false);
  });
});

describe("TaskDeadline", () => {
  test("el día elegido termina a las 23:59:59.999 locales", () => {
    const end = TaskDeadline.endOfDay(new Date(2026, 4, 10, 8, 30));
    expect([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()]).toEqual([
      2026, 4, 10, 23, 59, 59, 999,
    ]);
  });

  test("solo quien la creó y el creador del proyecto editan, y no una terminada", () => {
    const t = task({ creatorId: "u_beto" });
    expect(TaskDeadline.canEdit({ task: t, userId: "u_beto", projectOwnerId: "u_ana" })).toBe(true);
    expect(TaskDeadline.canEdit({ task: t, userId: "u_ana", projectOwnerId: "u_ana" })).toBe(true);
    expect(TaskDeadline.canEdit({ task: t, userId: "u_carla", projectOwnerId: "u_ana" })).toBe(false);
    expect(TaskDeadline.canEdit({ task: task({ status: "done", creatorId: "u_beto" }), userId: "u_beto", projectOwnerId: "u_ana" })).toBe(false);
    expect(TaskDeadline.canEdit({ task: t, userId: "", projectOwnerId: "" })).toBe(false);
  });

  test("el comentario automático dice qué cambió", () => {
    const a = new Date(2026, 4, 10, 12);
    const b = new Date(2026, 4, 20, 12);
    expect(TaskDeadline.changeNote({ before: null, after: a })).toBe("Fecha límite fijada: 10/05/2026.");
    expect(TaskDeadline.changeNote({ before: a, after: null })).toBe("Fecha límite quitada (era 10/05/2026).");
    expect(TaskDeadline.changeNote({ before: a, after: b })).toBe("Fecha límite cambiada: 10/05/2026 → 20/05/2026.");
  });
});
