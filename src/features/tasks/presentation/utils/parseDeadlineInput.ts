import { TaskDeadline } from "../../domain/entities/TaskDeadline";

// Lee lo que la persona escribió como fecha límite («dd/MM/aaaa», el mismo
// formato que `TaskDeadline.formatDay`) y devuelve el final de ese día local.
// Vacío → `null` (sin fecha). Una fecha que no existe (31/02) o que ya pasó
// lanza un `Error` con el texto para la persona.
export function parseDeadlineInput(text: string, now: Date): Date | null {
  const raw = text.trim();
  if (raw === "") return null;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (!match) throw new Error("Escribe la fecha como dd/mm/aaaa.");
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error("Esa fecha no existe.");
  }
  const deadline = TaskDeadline.endOfDay(date);
  if (deadline.getTime() < now.getTime()) throw new Error("La fecha límite no puede ser anterior a hoy.");
  return deadline;
}
