import { isDone, ProjectTask } from "./ProjectTask";

// Reglas de la fecha límite (`deadline`) de una tarea.
//
// La persona elige un **día**; la fecha límite es el final de ese día en la hora
// local del dispositivo, guardado como instante UTC. Así, entregar a cualquier
// hora del día elegido cuenta como a tiempo.
export const TaskDeadline = {
  // El instante en que termina `day` (solo importa su año, mes y día) en la
  // zona horaria local.
  endOfDay: (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999),

  // Quién puede cambiar o quitar la fecha límite de `task`: quien la creó y el
  // creador del proyecto, mientras la tarea no esté terminada.
  canEdit({ task, userId, projectOwnerId }: { task: ProjectTask; userId: string; projectOwnerId: string }) {
    if (isDone(task) || userId === "") return false;
    return userId === task.creatorId || userId === projectOwnerId;
  },

  // «dd/MM/aaaa» del día local de `instant`.
  formatDay(instant: Date) {
    const two = (n: number) => String(n).padStart(2, "0");
    return `${two(instant.getDate())}/${two(instant.getMonth() + 1)}/${instant.getFullYear()}`;
  },

  // El texto del comentario automático que deja un cambio de fecha límite (así
  // el equipo ve quién la movió y de cuándo a cuándo).
  changeNote({ before, after }: { before: Date | null; after: Date | null }) {
    if (before === null && after !== null) return `Fecha límite fijada: ${TaskDeadline.formatDay(after)}.`;
    if (before !== null && after === null) return `Fecha límite quitada (era ${TaskDeadline.formatDay(before)}).`;
    return `Fecha límite cambiada: ${TaskDeadline.formatDay(before!)} → ${TaskDeadline.formatDay(after!)}.`;
  },
};
