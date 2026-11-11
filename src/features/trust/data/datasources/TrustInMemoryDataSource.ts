import { DummyData } from "@/src/core/data/dummyData";
import { Row, toNumber } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { TrustDataSource } from "./TrustDataSource";

// Lo mismo que calculan `metricas_compromiso_por_proyecto.sql` y
// `entregas_a_tiempo.sql`, hecho en JS sobre las filas de `DummyData`.
export class TrustInMemoryDataSource implements TrustDataSource {
  constructor(private readonly data: DummyData) {}

  async readParticipations(userIds: string[]) {
    await this.data.delay();
    const projects = this.data.table(TABLES.project);
    const byStay = new Map<string, Row>();
    for (const m of this.data.table(TABLES.projectMember)) {
      if (!userIds.includes(m.user_id)) continue;
      const key = `${m.user_id}|${m.project_id}`;
      const project = projects.find((p) => p._id === m.project_id);
      if (!project) continue;
      const row = byStay.get(key) ?? {
        user_id: m.user_id,
        project_id: m.project_id,
        tasks_finished: 0,
        tasks_taken: 0,
        total_tasks: project.total_tasks ?? 0,
        progress: project.progress ?? 0,
      };
      row.tasks_finished += toNumber(m.tasks_finished);
      row.tasks_taken += toNumber(m.tasks_taken);
      byStay.set(key, row);
    }
    return [...byStay.values()];
  }

  async readDeliveries(userIds: string[]) {
    await this.data.delay();
    const byUser = new Map<string, Row>();
    for (const t of this.data.table(TABLES.task)) {
      if (!userIds.includes(t.assignee_id) || t.status !== "done") continue;
      const row = byUser.get(t.assignee_id) ?? { user_id: t.assignee_id, con_deadline: 0, a_tiempo: 0 };
      if (t.finished_at && t.deadline) row.con_deadline += 1;
      if (t.finished_at && t.deadline && new Date(t.finished_at) <= new Date(t.deadline)) row.a_tiempo += 1;
      byUser.set(t.assignee_id, row);
    }
    return [...byUser.values()];
  }
}
