import { Clock, systemClock } from "@/src/core/utils/clock";
import { guardRoble, parseDate, Row, textOrNull } from "@/src/core/roble/guard";
import { currentStay, finishedFor, MemberStay } from "@/src/features/members/domain/entities/MemberStay";
import { isOwner } from "@/src/features/members/domain/entities/ProjectMember";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { TasksFailure } from "../../domain/TasksFailure";
import { isDone, progressOf, ProjectTask, statusAfterSaving } from "../../domain/entities/ProjectTask";
import { Subtask, subtaskFromJson } from "../../domain/entities/Subtask";
import { TaskComment } from "../../domain/entities/TaskComment";
import { TaskDeadline } from "../../domain/entities/TaskDeadline";
import { TaskStatus, taskStatusOf } from "../../domain/entities/TaskStatus";
import { TaskRepository } from "../../domain/repositories/TaskRepository";
import { TaskDataSource } from "../datasources/TaskDataSource";

// Tareas: decide y traduce, no habla con Roble. Los contadores de las estancias
// (`tasks_taken`, `tasks_finished`) se escriben por `MembersRepository`, dueño
// de `project_member`.
export class TaskRepositoryImpl implements TaskRepository {
  // `clock` da el instante de cierre (`finished_at`); solo se cambia en pruebas.
  constructor(
    private readonly source: TaskDataSource,
    private readonly members: MembersRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async getTasks(projectId: string) {
    const rows = await this.guard(() => this.source.readTasks(projectId));
    return rows.map(toTask);
  }

  async createTask({ projectId, title, description = "", deadline = null }: { projectId: string; title: string; description?: string; deadline?: Date | null }) {
    const cleanTitle = title.trim();
    if (cleanTitle === "") throw new TasksFailure("La tarea necesita un título.");
    const row = await this.guard(() =>
      this.source.createTask({
        project_id: projectId,
        title: cleanTitle,
        description,
        status: "todo" satisfies TaskStatus,
        ...(deadline ? { deadline: deadline.toISOString() } : {}),
      }),
    );
    await this.syncDerived(projectId);
    return toTask(row);
  }

  async updateTaskStatus({ task, status }: { task: ProjectTask; status: TaskStatus }) {
    const finishedAt = this.finishedAtFields(task.status, status);
    await this.guard(() => this.source.updateTask(task.id, { status, ...finishedAt }));
    await this.syncDerived(task.projectId, {
      finishedOfAssigneeOf: isDone(task) !== (status === "done") ? task.id : undefined,
    });
    return withFinishedAt({ ...task, status }, finishedAt);
  }

  async updateTaskDeadline({ task, deadline, userId }: { task: ProjectTask; deadline: Date | null; userId: string }) {
    const current = await this.freshTask(task);
    if (isDone(current)) {
      throw new TasksFailure("La tarea ya está terminada: su fecha límite no se puede cambiar.");
    }
    if ((deadline?.getTime() ?? null) === (current.deadline?.getTime() ?? null)) return current;
    await this.guard(() => this.source.updateTask(task.id, { deadline: deadline ? deadline.toISOString() : null }));
    const updated = { ...current, deadline };
    // El aviso en el hilo de comentarios es parte del cambio, pero ya está hecho:
    // si el aviso falla no se deshace la fecha.
    try {
      await this.addComment({
        task: updated,
        userId,
        body: TaskDeadline.changeNote({ before: current.deadline, after: deadline }),
      });
    } catch (e) {
      console.warn("No se pudo avisar el cambio de fecha límite:", e);
    }
    return updated;
  }

  async reserveTask({ task, userId }: { task: ProjectTask; userId: string }) {
    return this.take(task, userId, "Esta tarea ya fue reservada por otra persona.");
  }

  async assignTask({ task, assigneeId, requestedBy }: { task: ProjectTask; assigneeId: string; requestedBy: string }) {
    const members = await this.guard(() => this.members.activeMembers(task.projectId));
    const requester = members.find((m) => m.userId === requestedBy);
    if (!requester || !isOwner(requester)) throw new TasksFailure("Solo quien creó el proyecto puede asignar tareas.");
    if (!members.some((m) => m.userId === assigneeId)) throw new TasksFailure("Esa persona no es miembro del proyecto.");
    return this.take(task, assigneeId, "Esta tarea ya tiene responsable.");
  }

  async saveTaskProgress({ task, description, subtasks }: { task: ProjectTask; description: string; subtasks: Subtask[] }) {
    const status = statusAfterSaving(task.status, subtasks);
    const finishedAt = this.finishedAtFields(task.status, status);
    await this.guard(() =>
      this.source.updateTask(task.id, {
        description,
        checklist: subtasks.map((s) => ({ title: s.title, done: s.done })),
        status,
        ...finishedAt,
      }),
    );
    // Solo si cambió terminada/no terminada se mueve el progreso del proyecto.
    if (isDone(task) !== (status === "done")) {
      await this.syncDerived(task.projectId, { finishedOfAssigneeOf: task.id });
    }
    return withFinishedAt({ ...task, description, subtasks: [...subtasks], status }, finishedAt);
  }

  async getComments(task: ProjectTask) {
    const rows = await this.guard(() => this.source.readContributions(task.id));
    // Los sin fecha al final; el resto del más nuevo al más viejo.
    return rows.map(toComment).sort((a, b) => {
      if (a.createdAt === null && b.createdAt === null) return 0;
      if (a.createdAt === null) return 1;
      if (b.createdAt === null) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async addComment({ task, userId, body }: { task: ProjectTask; userId: string; body: string }) {
    const row = await this.guard(() =>
      this.source.createContribution({
        user_id: userId,
        project_id: task.projectId,
        task_id: task.id,
        description: body,
        createdAt: this.clock().toISOString(),
      }),
    );
    return toComment(row);
  }

  async releaseUnfinishedTasks({ projectId, userId }: { projectId: string; userId: string }) {
    const mine = (await this.getTasks(projectId)).filter((t) => t.assigneeId === userId && !isDone(t));
    // `tasks_taken` no baja: lo que soltó sigue contando como tomado (y sin
    // terminar) en su estancia.
    for (const task of mine) {
      await this.guard(() => this.source.updateTask(task.id, { assignee_id: null, status: "todo" satisfies TaskStatus }));
    }
    return mine.length;
  }

  async deleteTask(task: ProjectTask) {
    await this.guard(() => this.source.deleteTask(task.id));
    // Una tarea que ya no existe tampoco cuenta como tomada.
    if (task.assigneeId) await this.countTaken(task.projectId, task.assigneeId, -1);
    await this.syncDerived(task.projectId, { finishedOf: task.assigneeId ?? undefined });
  }

  async recalculateProgress(projectId: string) {
    return this.writeProjectStats(projectId, await this.getTasks(projectId));
  }

  // Lo que hay que escribir en `finished_at` cuando una tarea pasa de `before` a
  // `after`: el instante actual al terminarse, `null` al reabrirse y nada si no
  // cambió terminada/no terminada (así un guardado que no cambia el estado no
  // mueve la hora de cierre).
  private finishedAtFields(before: TaskStatus, after: TaskStatus): Row {
    if (after === "done" && before !== "done") return { finished_at: this.clock().toISOString() };
    if (before === "done" && after !== "done") return { finished_at: null };
    return {};
  }

  // Deja la tarea `doing` con `userId` como responsable. Lee la tarea justo
  // antes de escribir y, si ya es de otra persona o no está pendiente, lanza
  // `TasksFailure(taken)`. Pasar de todo a doing no cambia las terminadas, así
  // que el progreso sigue igual. Sí es una tarea más tomada, salvo que ya fuera
  // suya (p. ej. la devolvió a pendiente y la retoma).
  private async take(task: ProjectTask, userId: string, taken: string) {
    const current = await this.freshTask(task);
    const takenByOther = current.assigneeId !== null && current.assigneeId !== userId;
    if (current.status !== "todo" || takenByOther) throw new TasksFailure(taken);
    await this.guard(() => this.source.updateTask(task.id, { assignee_id: userId, status: "doing" satisfies TaskStatus }));
    if (current.assigneeId !== userId) await this.countTaken(task.projectId, userId, 1);
    return { ...current, status: "doing" as const, assigneeId: userId };
  }

  // La tarea como está ahora en la base, no como la tenga quien llama.
  private async freshTask(task: ProjectTask) {
    const current = (await this.getTasks(task.projectId)).find((t) => t.id === task.id);
    if (!current) throw new TasksFailure("La tarea ya no existe.");
    return current;
  }

  private async writeProjectStats(projectId: string, tasks: ProjectTask[]) {
    const progress = progressOf(tasks);
    await this.guard(() => this.source.writeProjectTaskStats(projectId, { progress, totalTasks: tasks.length }));
    return progress;
  }

  // Los derivados de una tarea que sí se guardó: el progreso y total de tareas
  // del proyecto y las terminadas de quien corresponda: `finishedOf` si ya se
  // sabe quién, o el responsable que tenga ahora la tarea `finishedOfAssigneeOf`
  // (se lee de la base, no de la copia de quien llama, que puede estar vieja).
  // Si algo no se pudo actualizar, la tarea no se deshace: se avisa en el log y
  // el siguiente cambio lo deja bien (se cuenta siempre desde cero).
  private async syncDerived(projectId: string, who: { finishedOf?: string; finishedOfAssigneeOf?: string } = {}) {
    let tasks: ProjectTask[];
    try {
      tasks = await this.getTasks(projectId);
      await this.writeProjectStats(projectId, tasks);
    } catch (e) {
      console.warn(`No se pudo actualizar el progreso de ${projectId}:`, e);
      return;
    }
    const person = who.finishedOf ?? tasks.find((t) => t.id === who.finishedOfAssigneeOf)?.assigneeId;
    if (!person) return;
    try {
      await this.syncFinished(projectId, person, tasks);
    } catch (e) {
      console.warn(`No se pudieron actualizar las terminadas de ${person} en ${projectId}:`, e);
    }
  }

  // `tasks_finished` de `userId`: lo terminado a su nombre en todo el proyecto,
  // menos lo que ya anotaron sus otras estancias.
  private async syncFinished(projectId: string, userId: string, tasks: ProjectTask[]) {
    const stays = await this.members.staysOf(projectId, userId);
    const current = currentStay(stays);
    if (!current) return;
    const total = tasks.filter((t) => t.assigneeId === userId && isDone(t)).length;
    const finished = finishedFor(current, stays, total);
    if (finished === current.finished) return;
    await this.members.saveStayCounters(current.id, { finished });
  }

  // Mueve `tasks_taken` de `userId` en su estancia actual, sin bajar de 0. Es
  // incremental (no se puede contar desde cero: las tareas soltadas ya no tienen
  // responsable). Es un derivado: si falla, la tarea no se deshace.
  private async countTaken(projectId: string, userId: string, delta: number) {
    try {
      const current: MemberStay | null = currentStay(await this.members.staysOf(projectId, userId));
      if (!current) return;
      await this.members.saveStayCounters(current.id, { taken: Math.max(0, current.taken + delta) });
    } catch (e) {
      console.warn(`No se pudieron actualizar las tomadas de ${userId}:`, e);
    }
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new TasksFailure(message));
  }
}

function withFinishedAt(task: ProjectTask, written: Row): ProjectTask {
  if (!("finished_at" in written)) return task;
  return { ...task, finishedAt: written.finished_at === null ? null : new Date(String(written.finished_at)) };
}

function toTask(row: Row): ProjectTask {
  return {
    id: String(row._id ?? row.id ?? ""),
    projectId: String(row.project_id ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    status: taskStatusOf(row.status),
    assigneeId: textOrNull(row.assignee_id),
    subtasks: decodeChecklist(row.checklist),
    deadline: instant(row.deadline),
    finishedAt: instant(row.finished_at),
    creatorId: textOrNull(row._owner),
  };
}

function toComment(row: Row): TaskComment {
  return {
    id: String(row._id ?? row.id ?? ""),
    userId: String(row.user_id ?? ""),
    body: String(row.description ?? ""),
    createdAt: instant(row.createdAt),
  };
}

// `checklist` es jsonb: Roble lo devuelve como lista o como texto JSON. Lo que
// no calza (null, objeto, entradas rotas) da una lista vacía o se descarta: una
// fila mal guardada no debe tumbar el tablero.
function decodeChecklist(raw: unknown): Subtask[] {
  if (typeof raw === "string") {
    const text = raw.trim();
    if (text === "") return [];
    try {
      return decodeChecklist(JSON.parse(text));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(subtaskFromJson).filter((s): s is Subtask => s !== null);
}

// `timestamptz` llega como texto ISO; lo ilegible o vacío es «sin fecha».
function instant(value: unknown): Date | null {
  const text = textOrNull(value);
  if (text === null) return null;
  const date = parseDate(text, new Date(NaN));
  return Number.isNaN(date.getTime()) ? null : date;
}
