import { Subtask } from "./Subtask";
import { TaskStatus } from "./TaskStatus";

// Una tarea de un proyecto (`task`).
export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  // `user_id` de quien reservó la tarea; `null` mientras nadie la tomó.
  assigneeId: string | null;
  // Checklist de progreso de la tarea.
  subtasks: Subtask[];
  // Instante en que vence (ver `TaskDeadline`); `null` si no tiene fecha límite.
  deadline: Date | null;
  // `_owner` de la fila: quien creó la tarea. `null` si Roble no lo informó.
  creatorId: string | null;
  // Instante en que pasó a terminada; `null` mientras no lo esté. Si se reabre
  // y se vuelve a terminar, es el del último cierre.
  finishedAt: Date | null;
}

export const isDone = (task: ProjectTask) => task.status === "done";

// Vencida: tiene fecha límite, ya pasó y la tarea no está terminada.
export const isOverdueAt = (task: ProjectTask, now: Date) =>
  task.deadline !== null && !isDone(task) && now.getTime() > task.deadline.getTime();

// Avance del checklist entre 0 y 1; 0 si no hay subtareas.
export function checklistProgress(task: ProjectTask): number {
  if (task.subtasks.length === 0) return 0;
  return task.subtasks.filter((s) => s.done).length / task.subtasks.length;
}

// Estado en el que queda una tarea al guardar su checklist: con todas las
// subtareas hechas pasa a terminada; si estaba terminada y se desmarca alguna,
// vuelve a en progreso; en cualquier otro caso no cambia.
export function statusAfterSaving(current: TaskStatus, subtasks: readonly Subtask[]): TaskStatus {
  const allDone = subtasks.length > 0 && subtasks.every((s) => s.done);
  if (allDone) return "done";
  if (current === "done") return "doing";
  return current;
}

// Porcentaje (0–100) de `tasks` terminadas. Un proyecto sin tareas está en 0,
// no es un error: así nunca se divide entre cero.
export function progressOf(tasks: readonly ProjectTask[]): number {
  if (tasks.length === 0) return 0;
  return (tasks.filter(isDone).length * 100) / tasks.length;
}
