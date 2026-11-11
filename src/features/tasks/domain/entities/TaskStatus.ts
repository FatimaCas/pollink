// En la base de datos el valor es `todo` / `doing` / `done`; la etiqueta es lo
// que se le muestra a la gente.
export type TaskStatus = "todo" | "doing" | "done";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Pendiente",
  doing: "En progreso",
  done: "Terminada",
};

// Un estado que la app no conoce no puede tumbar la lista: se trata como
// pendiente, que es también el estado con el que nace una tarea.
export function taskStatusOf(name: unknown): TaskStatus {
  return name === "doing" || name === "done" ? name : "todo";
}
