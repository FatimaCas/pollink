import { guardRoble, Row, toNumber } from "@/src/core/roble/guard";
import { TrustFailure } from "../../domain/TrustFailure";
import {
  calculateTrust,
  NO_TRUST,
  OnTimeDeliveries,
  ProjectParticipation,
} from "../../domain/entities/TrustMetrics";
import { TrustRepository } from "../../domain/repositories/TrustRepository";
import { TrustDataSource } from "../datasources/TrustDataSource";

// Confianza: trae las filas, las convierte y deja el cálculo a `calculateTrust`
// (función pura). Siempre dos consultas, sean una persona o muchas.
export class TrustRepositoryImpl implements TrustRepository {
  constructor(private readonly source: TrustDataSource) {}

  getTrustMetricsOf(userId: string) {
    if (!userId) return Promise.resolve(NO_TRUST);
    return this.guard(async () => {
      const [participations, deliveries] = await Promise.all([
        this.source.readParticipations([userId]),
        this.source.readDeliveries([userId]),
      ]);
      return calculateTrust(participations.map(toParticipation), toDeliveries(deliveries[0]));
    });
  }

  getCommitmentScores(userIds: string[]) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return Promise.resolve({});
    return this.guard(async () => {
      const [participationRows, deliveryRows] = await Promise.all([
        this.source.readParticipations(ids),
        this.source.readDeliveries(ids),
      ]);

      const byUser = new Map<string, ProjectParticipation[]>();
      for (const row of participationRows) {
        const userId = String(row.user_id ?? "");
        if (!userId) continue;
        byUser.set(userId, [...(byUser.get(userId) ?? []), toParticipation(row)]);
      }
      const deliveriesByUser = new Map<string, OnTimeDeliveries>();
      for (const row of deliveryRows) {
        const userId = String(row.user_id ?? "");
        if (userId) deliveriesByUser.set(userId, toDeliveries(row));
      }

      const scores: Record<string, number> = {};
      for (const [userId, participations] of byUser) {
        const { commitment } = calculateTrust(participations, deliveriesByUser.get(userId));
        if (commitment !== null) scores[userId] = commitment;
      }
      return scores;
    });
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new TrustFailure(message));
  }
}

// Roble devuelve los `numeric` y `bigint` como texto ("0") y los `float8` como
// número: `toNumber` lee los dos.
function toParticipation(row: Row): ProjectParticipation {
  return {
    projectId: String(row.project_id ?? ""),
    tasksFinished: toNumber(row.tasks_finished),
    tasksTaken: toNumber(row.tasks_taken),
    totalTasks: toNumber(row.total_tasks),
    progress: toNumber(row.progress),
  };
}

function toDeliveries(row: Row | undefined): OnTimeDeliveries {
  return row ? { withDeadline: toNumber(row.con_deadline), onTime: toNumber(row.a_tiempo) } : { withDeadline: 0, onTime: 0 };
}
