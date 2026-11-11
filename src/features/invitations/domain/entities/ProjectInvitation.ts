// `pending` mientras nadie responde. `accepted` / `declined` los pone la persona
// invitada; `cancelled`, la app cuando la invitación sobra (p. ej. ya entró al
// proyecto porque aceptaron su solicitud).
export type InvitationStatus = "pending" | "accepted" | "declined" | "cancelled";

// Un estado desconocido no puede tumbar la lista ni dejar una invitación viva
// por error: se trata como cancelada.
export function invitationStatusOf(name: unknown): InvitationStatus {
  return name === "pending" || name === "accepted" || name === "declined" ? name : "cancelled";
}

// Una invitación a unirse a un proyecto (`project_invitation`).
export interface ProjectInvitation {
  id: string;
  projectId: string;
  // A quién se invitó: su cuenta y el correo con el que se la buscó.
  userId: string;
  email: string;
  status: InvitationStatus;
  // `_owner` de la fila: quien invitó («Te invitó X ›»). `null` si Roble no lo
  // informó.
  invitedBy: string | null;
  createdAt: Date | null;
  respondedAt: Date | null;
}

export const isPending = (invitation: ProjectInvitation) => invitation.status === "pending";

// Las invitaciones que la persona todavía puede responder: pendientes, de un
// proyecto que existe y sigue abierto, y donde no colabora ya (p. ej. le
// aceptaron una solicitud por otra vía). `openProjectIds` son los proyectos
// abiertos que existen; `memberOf`, aquellos en los que ya está.
export function answerable(
  invitations: readonly ProjectInvitation[],
  openProjectIds: ReadonlySet<string>,
  memberOf: ReadonlySet<string>,
): ProjectInvitation[] {
  return invitations.filter((i) => isPending(i) && openProjectIds.has(i.projectId) && !memberOf.has(i.projectId));
}

// Una cuenta encontrada por correo, lista para invitarla.
export interface Invitee {
  email: string;
  userId: string;
}

// Normaliza los correos que se escribieron en el formulario: sin espacios, en
// minúsculas, sin vacíos ni repetidos, en el orden escrito.
export function cleanEmails(emails: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (email === "" || seen.has(email)) continue;
    seen.add(email);
    result.push(email);
  }
  return result;
}

// Forma mínima de un correo: algo@algo.algo, sin espacios.
export const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
