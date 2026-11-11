// Ítem del checklist de una tarea (columna `task.checklist`).
export interface Subtask {
  title: string;
  done: boolean;
}

// Una entrada mal formada no debe tumbar la tarea: devuelve `null` y quien lee
// la descarta.
export function subtaskFromJson(raw: unknown): Subtask | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entry = raw as { title?: unknown; done?: unknown };
  const title = String(entry.title ?? "").trim();
  if (title === "") return null;
  return { title, done: entry.done === true };
}
