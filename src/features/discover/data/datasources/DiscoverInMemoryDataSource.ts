import { DummyData } from "@/src/core/data/dummyData";
import { Row, toStringList } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { normalizeLabel } from "@/src/core/utils/normalizeLabel";
import { DiscoverDataSource } from "./DiscoverDataSource";

// El feed en memoria: las mismas filas que devolvería Roble, con el filtro
// hecho en JS (en Roble lo hace el SQL de `proyectos_filtrados`).
export class DiscoverInMemoryDataSource implements DiscoverDataSource {
  constructor(private readonly data: DummyData) {}

  async queryFeed({ career, skill, onlyOpen, limit, offset }: Parameters<DiscoverDataSource["queryFeed"]>[0]) {
    await this.data.delay();
    const matching = this.projects()
      .filter((p) => !onlyOpen || p.status === "open")
      .filter((p) => !career || toStringList(p.jobs).some((j) => normalizeLabel(j) === career))
      .filter((p) => !skill || toStringList(p.skills).some((s) => normalizeLabel(s) === skill))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return matching
      .slice(offset, offset + limit)
      .map((p) => ({ ...p, member_count: this.memberCount(p._id), total: matching.length }));
  }

  async queryFilterOptions({ career, onlyOpen }: Parameters<DiscoverDataSource["queryFilterOptions"]>[0]) {
    await this.data.delay();
    const base = this.projects().filter((p) => !onlyOpen || p.status === "open");
    const rows: Row[] = [];
    const collect = (kind: "career" | "skill", projects: Row[], pick: (p: Row) => string[]) => {
      const variants = new Map<string, Map<string, number>>();
      const counted = new Map<string, number>();
      for (const p of projects) {
        const keys = new Set<string>();
        for (const label of pick(p)) {
          const key = normalizeLabel(label);
          if (!key) continue;
          const labels = variants.get(key) ?? new Map<string, number>();
          labels.set(label, (labels.get(label) ?? 0) + 1);
          variants.set(key, labels);
          keys.add(key);
        }
        for (const key of keys) counted.set(key, (counted.get(key) ?? 0) + 1);
      }
      for (const [key, labels] of variants) {
        // La variante más frecuente; en empate, la primera alfabéticamente.
        const [label] = [...labels].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
        rows.push({ kind, key, label, project_count: counted.get(key) });
      }
    };
    collect("career", base, (p) => toStringList(p.jobs));
    const withCareer = career ? base.filter((p) => toStringList(p.jobs).some((j) => normalizeLabel(j) === career)) : base;
    collect("skill", withCareer, (p) => toStringList(p.skills));
    return rows;
  }

  async readProject(projectId: string) {
    await this.data.delay();
    const row = this.projects().find((p) => p._id === projectId);
    return row ? { ...row } : null;
  }

  async readSaved(userId: string) {
    await this.data.delay();
    return this.data
      .table(TABLES.projectSaved)
      .filter((r) => r.user_id === userId)
      .map((r) => ({ ...r }));
  }

  async createSaved(row: Row) {
    await this.data.delay();
    this.data.table(TABLES.projectSaved).push({ _id: this.data.nextId("sv"), ...row });
  }

  async deleteSaved(id: string) {
    await this.data.delay();
    const rows = this.data.table(TABLES.projectSaved);
    const index = rows.findIndex((r) => r._id === id);
    if (index >= 0) rows.splice(index, 1);
  }

  private projects() {
    return this.data.table(TABLES.project);
  }

  private memberCount(projectId: string) {
    return this.data
      .table(TABLES.projectMember)
      .filter((m) => m.project_id === projectId && m.status === "active").length;
  }
}
