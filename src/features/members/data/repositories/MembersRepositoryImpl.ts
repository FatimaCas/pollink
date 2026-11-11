import { Clock, systemClock } from "@/src/core/utils/clock";
import { guardRoble, parseDate, Row, textOrNull, toNumber } from "@/src/core/roble/guard";
import { MembersFailure } from "../../domain/MembersFailure";
import {
  isActive,
  MemberRole,
  MembershipStatus,
  MemberStay,
  roleOf,
} from "../../domain/entities/MemberStay";
import { ProjectMember } from "../../domain/entities/ProjectMember";
import { MembersRepository } from "../../domain/repositories/MembersRepository";
import { MembersDataSource } from "../datasources/MembersDataSource";

// Estancias y reglas de pertenencia: decide y traduce, no habla con Roble.
export class MembersRepositoryImpl implements MembersRepository {
  constructor(
    private readonly source: MembersDataSource,
    private readonly clock: Clock = systemClock,
  ) {}

  async addMember({ projectId, userId, role = "collaborator" }: { projectId: string; userId: string; role?: MemberRole }) {
    if (!projectId || !userId) throw new MembersFailure("Falta el proyecto o la persona.");
    // Lectura estricta: si falla, la excepción sube y no se inserta a ciegas.
    const stays = await this.stays(projectId);
    const existing = stays.find((s) => s.userId === userId && isActive(s));
    if (existing) return existing;
    const row = await this.guard(() =>
      this.source.createMember({
        project_id: projectId,
        user_id: userId,
        role: { name: role },
        status: "active" satisfies MembershipStatus,
        joinedAt: this.clock().toISOString(),
        tasks_taken: 0,
        tasks_finished: 0,
      }),
    );
    return this.toStay(row);
  }

  async activeMembers(projectId: string): Promise<ProjectMember[]> {
    const seen = new Set<string>();
    const members: ProjectMember[] = [];
    for (const stay of await this.stays(projectId)) {
      if (!isActive(stay) || !stay.userId || seen.has(stay.userId)) continue;
      seen.add(stay.userId);
      members.push({ userId: stay.userId, role: stay.role, joinedAt: stay.joinedAt });
    }
    // El creador primero; después por antigüedad.
    return members.sort((a, b) => {
      if ((a.role === "owner") !== (b.role === "owner")) return a.role === "owner" ? -1 : 1;
      return (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0);
    });
  }

  async activeMemberIds(projectId: string) {
    return (await this.activeMembers(projectId)).map((m) => m.userId);
  }

  async activeMemberCounts(projectId?: string) {
    const counts: Record<string, number> = {};
    const seen = new Set<string>();
    for (const stay of await this.stays(projectId)) {
      if (!isActive(stay) || !stay.projectId) continue;
      // Roble no garantiza unicidad: una persona cuenta una sola vez por proyecto.
      if (stay.userId && !seen.add(`${stay.projectId}/${stay.userId}`)) continue;
      counts[stay.projectId] = (counts[stay.projectId] ?? 0) + 1;
    }
    return counts;
  }

  async leave({ projectId, userId }: { projectId: string; userId: string }) {
    if (!projectId || !userId) throw new MembersFailure("Falta el proyecto o la sesión.");
    if (await this.isCreator(projectId, userId)) {
      throw new MembersFailure("El creador no puede salir del proyecto.");
    }
    await this.endStay(projectId, userId, "left");
  }

  async remove({ projectId, memberUserId, requestedBy }: { projectId: string; memberUserId: string; requestedBy: string }) {
    if (!projectId || !memberUserId || !requestedBy) throw new MembersFailure("Falta el proyecto o la sesión.");
    if (memberUserId === requestedBy) throw new MembersFailure("Para irte del proyecto usa «Salir».");
    if (!(await this.isCreator(projectId, requestedBy))) {
      throw new MembersFailure("Solo el creador puede quitar a alguien.");
    }
    if (await this.isCreator(projectId, memberUserId)) throw new MembersFailure("No se puede quitar al creador.");
    await this.endStay(projectId, memberUserId, "removed");
  }

  async staysOf(projectId: string, userId: string) {
    return (await this.stays(projectId)).filter((s) => s.userId === userId);
  }

  async saveStayCounters(stayId: string, counters: { taken?: number; finished?: number }) {
    const fields: Row = {};
    if (counters.taken !== undefined) fields.tasks_taken = counters.taken;
    if (counters.finished !== undefined) fields.tasks_finished = counters.finished;
    if (Object.keys(fields).length === 0) return;
    await this.guard(() => this.source.updateMember(stayId, fields));
  }

  // Es el creador si el proyecto es suyo (`_owner`) o si su estancia activa
  // tiene el papel `owner`. Se miran las dos cosas: ninguna es infalible (filas
  // viejas sin papel, lecturas parciales).
  private async isCreator(projectId: string, userId: string) {
    const project = await this.guard(() => this.source.readProject(projectId));
    if (textOrNull(project?._owner ?? project?.owner) === userId) return true;
    return (await this.stays(projectId)).some((s) => s.userId === userId && isActive(s) && s.role === "owner");
  }

  // Termina las estancias activas del par (Roble no garantiza unicidad: puede
  // haber más de una). Lectura estricta: si falla, la operación falla.
  private async endStay(projectId: string, userId: string, status: "left" | "removed") {
    const leftAt = this.clock().toISOString();
    const active = (await this.staysOf(projectId, userId)).filter(isActive);
    for (const stay of active) {
      await this.guard(() => this.source.updateMember(stay.id, { status, leftAt }));
    }
  }

  private async stays(projectId?: string) {
    const rows = await this.guard(() => this.source.readMembers(projectId));
    return rows.map((r) => this.toStay(r)).filter((s) => s.id !== "");
  }

  private toStay(row: Row): MemberStay {
    const status = String(row.status ?? "active");
    return {
      id: String(row._id ?? row.id ?? ""),
      projectId: String(row.project_id ?? ""),
      userId: String(row.user_id ?? ""),
      role: roleOf(row.role),
      // Un estado que la app no conoce no deja a nadie "activo" por error.
      status: status === "left" || status === "removed" || status === "active" ? status : "left",
      joinedAt: row.joinedAt ? parseDate(row.joinedAt, new Date(0)) : null,
      leftAt: row.leftAt ? parseDate(row.leftAt, new Date(0)) : null,
      taken: toNumber(row.tasks_taken),
      finished: toNumber(row.tasks_finished),
    };
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new MembersFailure(message));
  }
}
