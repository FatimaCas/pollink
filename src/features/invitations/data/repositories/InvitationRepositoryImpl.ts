import { guardRoble, parseDate, Row, textOrNull } from "@/src/core/roble/guard";
import { Clock, systemClock } from "@/src/core/utils/clock";
import {
  cleanEmails,
  invitationStatusOf,
  Invitee,
  isPending,
  ProjectInvitation,
} from "../../domain/entities/ProjectInvitation";
import { InvitationsFailure } from "../../domain/InvitationsFailure";
import { InvitationRepository } from "../../domain/repositories/InvitationRepository";
import { InvitationDataSource } from "../datasources/InvitationDataSource";

// Invitaciones: decide y traduce, no habla con Roble.
export class InvitationRepositoryImpl implements InvitationRepository {
  constructor(
    private readonly source: InvitationDataSource,
    private readonly clock: Clock = systemClock,
  ) {}

  async findAccounts(emails: readonly string[]) {
    const clean = cleanEmails(emails);
    const rows = await Promise.all(clean.map((email) => this.guard(() => this.source.findUserByEmail(email))));
    const found: Invitee[] = [];
    const missing: string[] = [];
    clean.forEach((email, i) => {
      const userId = textOrNull(rows[i]?.user_id);
      if (userId) found.push({ email, userId });
      else missing.push(email);
    });
    return { found, missing };
  }

  async invite({ projectId, invitees }: { projectId: string; invitees: readonly Invitee[] }) {
    if (!projectId) throw new InvitationsFailure("Falta el proyecto.");
    // Una persona, una invitación: sin repetidos en lo pedido ni con lo que ya
    // estaba pendiente (reintentar no duplica).
    const pending = new Set(
      (await this.forProject(projectId)).filter(isPending).map((i) => i.userId),
    );
    const now = this.clock().toISOString();
    const rows: Row[] = [];
    for (const { email, userId } of invitees) {
      if (!userId || pending.has(userId)) continue;
      pending.add(userId);
      rows.push({ project_id: projectId, email: email.trim().toLowerCase(), user_id: userId, status: "pending", createdAt: now });
    }
    if (rows.length === 0) return [];
    const created = await this.guard(() => this.source.createInvitations(rows));
    if (created.length !== rows.length) {
      throw new InvitationsFailure("No se pudieron enviar todas las invitaciones.");
    }
    return created.map(toInvitation);
  }

  async pendingFor(userId: string) {
    if (!userId) return [];
    const rows = await this.guard(() => this.source.readInvitations({ user_id: userId }));
    return rows
      .map(toInvitation)
      .filter(isPending)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async accept(invitationId: string) {
    await this.respond(invitationId, "accepted");
  }

  async decline(invitationId: string) {
    await this.respond(invitationId, "declined");
  }

  async cancelPending({ projectId, userId }: { projectId: string; userId: string }) {
    const mine = (await this.forProject(projectId)).filter((i) => i.userId === userId && isPending(i));
    const now = this.clock().toISOString();
    for (const invitation of mine) {
      await this.guard(() => this.source.updateInvitation(invitation.id, { status: "cancelled", respondedAt: now }));
    }
    return mine.length;
  }

  async deleteForProject(projectId: string) {
    if (!projectId) return;
    for (const invitation of await this.forProject(projectId)) {
      await this.guard(() => this.source.deleteInvitation(invitation.id));
    }
  }

  // ─── Ayudas ───────────────────────────────────────────────────────────────

  private async respond(invitationId: string, status: "accepted" | "declined") {
    const [row] = await this.guard(() => this.source.readInvitations({ _id: invitationId }));
    if (!row) throw new InvitationsFailure("La invitación ya no existe.");
    if (!isPending(toInvitation(row))) throw new InvitationsFailure("Esta invitación ya fue respondida.");
    await this.guard(() =>
      this.source.updateInvitation(invitationId, { status, respondedAt: this.clock().toISOString() }),
    );
  }

  private async forProject(projectId: string) {
    const rows = await this.guard(() => this.source.readInvitations({ project_id: projectId }));
    return rows.map(toInvitation);
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new InvitationsFailure(message), {
      notFound: "La invitación ya no existe.",
    });
  }
}

function toInvitation(row: Row): ProjectInvitation {
  return {
    id: String(row._id ?? row.id ?? ""),
    projectId: String(row.project_id ?? ""),
    userId: String(row.user_id ?? ""),
    email: String(row.email ?? ""),
    status: invitationStatusOf(row.status),
    invitedBy: textOrNull(row._owner),
    createdAt: instant(row.createdAt),
    respondedAt: instant(row.respondedAt),
  };
}

// `timestamptz` llega como texto ISO; lo ilegible o vacío es «sin fecha».
function instant(value: unknown): Date | null {
  const text = textOrNull(value);
  if (text === null) return null;
  const date = parseDate(text, new Date(NaN));
  return Number.isNaN(date.getTime()) ? null : date;
}
