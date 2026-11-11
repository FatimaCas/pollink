import { guardRoble, parseDate, Row } from "@/src/core/roble/guard";
import { Clock, systemClock } from "@/src/core/utils/clock";
import { RequestsFailure } from "../../domain/RequestsFailure";
import { isPending, JoinRequest, JoinRequestState } from "../../domain/entities/JoinRequest";
import { JoinRequestRepository } from "../../domain/repositories/JoinRequestRepository";
import { JoinRequestDataSource } from "../datasources/JoinRequestDataSource";

// Decide y traduce, no habla con Roble.
export class JoinRequestRepositoryImpl implements JoinRequestRepository {
  constructor(
    private readonly source: JoinRequestDataSource,
    private readonly clock: Clock = systemClock,
  ) {}

  async apply({ projectId, userId }: { projectId: string; userId: string }) {
    if (!projectId || !userId) throw new RequestsFailure("Falta el proyecto o la sesión.");
    await this.assertOpen(projectId, "solicitudes");
    // Lectura estricta: si falla, la excepción sube y no se inserta a ciegas.
    const mine = await this.read({ user_id: userId, project_id: projectId });
    if (mine.some(isPending)) throw new RequestsFailure("Ya tienes una postulación pendiente aquí.");
    const now = this.clock().toISOString();
    const row = await this.guard(() =>
      this.source.createRequest({
        user_id: userId,
        project_id: projectId,
        status: { state: "pending" satisfies JoinRequestState },
        createdAt: now,
        updatedAt: now,
      }),
    );
    return toRequest(row);
  }

  async requestsForProject(projectId: string) {
    const requests = await this.read({ project_id: projectId });
    const time = (r: JoinRequest) => r.createdAt?.getTime() ?? 0;
    return requests.sort((a, b) => Number(isPending(b)) - Number(isPending(a)) || time(b) - time(a));
  }

  async pendingCount(projectId: string) {
    return (await this.read({ project_id: projectId })).filter(isPending).length;
  }

  async requestById(requestId: string) {
    if (!requestId) return null;
    return (await this.read({ _id: requestId }))[0] ?? null;
  }

  async ensureAcceptable(requestId: string) {
    const request = await this.pendingRequest(requestId);
    await this.assertOpen(request.projectId, "solicitudes");
    return request;
  }

  async decide({ requestId, accepted, reviewerId }: { requestId: string; accepted: boolean; reviewerId: string }) {
    if (!reviewerId) throw new RequestsFailure("Falta la sesión.");
    const request = await this.pendingRequest(requestId);
    // Solo el creador resuelve. Si el proyecto no se encuentra, no se bloquea.
    const project = await this.guard(() => this.source.readProject(request.projectId));
    const owner = project?._owner ? String(project._owner) : null;
    if (owner && owner !== reviewerId) throw new RequestsFailure("Solo el creador del proyecto resuelve las solicitudes.");
    if (accepted) await this.assertOpen(request.projectId, "solicitudes");
    const state: JoinRequestState = accepted ? "accepted" : "rejected";
    const updatedAt = this.clock().toISOString();
    await this.guard(() => this.source.updateRequest(requestId, { status: { state }, reviewed_by: reviewerId, updatedAt }));
    return { ...request, state, reviewedBy: reviewerId, updatedAt: new Date(updatedAt) };
  }

  async cancelPending({ projectId, userId, cancelledBy }: { projectId: string; userId: string; cancelledBy: string }) {
    const stale = (await this.read({ user_id: userId, project_id: projectId })).filter(isPending);
    const updatedAt = this.clock().toISOString();
    for (const request of stale) {
      await this.guard(() =>
        this.source.updateRequest(request.id, { status: { state: "cancelled" satisfies JoinRequestState }, reviewed_by: cancelledBy, updatedAt }),
      );
    }
    return stale.length;
  }

  private async pendingRequest(requestId: string) {
    const request = await this.requestById(requestId);
    if (!request) throw new RequestsFailure("No se encontró la solicitud.");
    if (!isPending(request)) throw new RequestsFailure("Esta solicitud ya fue resuelta.");
    return request;
  }

  // Solo bloquea si el proyecto está explícitamente cerrado: uno que no se
  // encuentra sigue el camino de siempre.
  private async assertOpen(projectId: string, what: string) {
    const project = await this.guard(() => this.source.readProject(projectId));
    if (project && String(project.status) === "closed") {
      throw new RequestsFailure(`Este proyecto está cerrado y ya no recibe ${what}.`);
    }
  }

  private async read(filters: Row) {
    const rows = await this.guard(() => this.source.readRequests(filters));
    return rows.map(toRequest).filter((r) => r.id !== "");
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new RequestsFailure(message));
  }
}

const STATES: JoinRequestState[] = ["pending", "accepted", "rejected", "cancelled"];

// `status` es jsonb `{state}`, pero las filas viejas traen un texto suelto o un
// JSON en texto. Lo desconocido cuenta como cancelada: nunca como pendiente.
export function stateOf(raw: unknown): JoinRequestState {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      // un texto suelto como «pending»
    }
  }
  const text = typeof value === "object" && value !== null ? ((value as Row).state ?? (value as Row).status ?? (value as Row).value) : value;
  const state = String(text ?? "").toLowerCase();
  return (STATES as string[]).includes(state) ? (state as JoinRequestState) : "cancelled";
}

function toRequest(row: Row): JoinRequest {
  return {
    id: String(row._id ?? row.id ?? ""),
    userId: String(row.user_id ?? row._owner ?? ""),
    projectId: String(row.project_id ?? ""),
    state: stateOf(row.status),
    createdAt: row.createdAt ? parseDate(row.createdAt, new Date(0)) : null,
    updatedAt: row.updatedAt ? parseDate(row.updatedAt, new Date(0)) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
  };
}
