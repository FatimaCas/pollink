// Una solicitud para unirse a un proyecto (`project_join_request`).
// Estados: pending → accepted | rejected | cancelled. Una sola `pending` por
// persona y proyecto. `cancelled` lo escribe el sistema (p. ej. al aceptar otra
// vía); la persona no tiene botón para cancelar.
export type JoinRequestState = "pending" | "accepted" | "rejected" | "cancelled";

export interface JoinRequest {
  id: string;
  // Quien se postula.
  userId: string;
  projectId: string;
  state: JoinRequestState;
  createdAt: Date | null;
  updatedAt: Date | null;
  // Quien la resolvió (el creador del proyecto).
  reviewedBy: string | null;
}

export const isPending = (request: JoinRequest) => request.state === "pending";

export const JOIN_REQUEST_STATE_LABELS: Record<JoinRequestState, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};
