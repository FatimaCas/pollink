export type MembershipStatus = "active" | "left" | "removed";

// Papel de una persona dentro de un proyecto (`project_member.role`).
export type MemberRole = "owner" | "collaborator";

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Creador",
  collaborator: "Colaborador",
};

// El nombre del papel dentro de la columna `role` (jsonb). Acepta objeto o
// texto JSON, y cualquier cosa que no se reconozca cuenta como colaborador:
// nunca se promueve a nadie a creador por un valor raro.
export function roleOf(raw: unknown): MemberRole {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = { name: value };
    }
  }
  const name =
    value && typeof value === "object" ? String((value as { name?: unknown }).name ?? "") : "";
  return name === "owner" || name === "creador" ? "owner" : "collaborator";
}

// Una estancia de una persona en un proyecto: una fila de `project_member`, con
// sus contadores de tareas.
//
// Salir y volver crea una fila nueva, así que una persona puede tener varias
// estancias en el mismo proyecto. Los contadores de cada una son lo que sumó
// *durante* esa estancia: quien lee las métricas las suma todas.
export interface MemberStay {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  status: MembershipStatus;
  joinedAt: Date | null;
  leftAt: Date | null;
  // Tareas que tomó en esta estancia. Las que soltó al salir siguen contando.
  taken: number;
  // Tareas que terminó en esta estancia.
  finished: number;
}

export const isActive = (stay: MemberStay) => stay.status === "active";

// La estancia donde se anota lo nuevo: la activa; si ninguna lo está (p. ej. se
// reabre una tarea de alguien que ya salió), la más reciente. `null` si no hay.
export function currentStay(stays: readonly MemberStay[]): MemberStay | null {
  let best: MemberStay | null = null;
  for (const stay of stays) {
    if (best === null || isNewer(stay, best)) best = stay;
  }
  return best;
}

function isNewer(a: MemberStay, b: MemberStay): boolean {
  if (isActive(a) !== isActive(b)) return isActive(a);
  if (a.joinedAt === null || b.joinedAt === null) return a.joinedAt !== null;
  return a.joinedAt.getTime() > b.joinedAt.getTime();
}

// Cuántas terminadas anotar en `current`, dado que `totalFinished` es lo que la
// persona tiene terminado en todo el proyecto (todas sus estancias): el total
// menos lo que ya anotaron las demás. Nunca negativo.
export function finishedFor(current: MemberStay, all: readonly MemberStay[], totalFinished: number): number {
  const others = all.filter((s) => s.id !== current.id).reduce((sum, s) => sum + s.finished, 0);
  return Math.max(0, totalFinished - others);
}
