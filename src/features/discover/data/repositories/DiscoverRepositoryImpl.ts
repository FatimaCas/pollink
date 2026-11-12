import { guardRoble, parseDate, Row, textOrNull, toNumber, toStringList } from "@/src/core/roble/guard";
import { Clock, systemClock } from "@/src/core/utils/clock";
import { normalizeLabel } from "@/src/core/utils/normalizeLabel";
import { DiscoverFailure } from "../../domain/DiscoverFailure";
import { DiscoverProject, ProjectStatus } from "../../domain/entities/DiscoverProject";
import { FilterOption, FilterOptions } from "../../domain/entities/ProjectFilter";
import { DiscoverRepository, FeedPage } from "../../domain/repositories/DiscoverRepository";
import { DiscoverDataSource } from "../datasources/DiscoverDataSource";

// Convierte filas en entidades y traduce los errores: no habla con Roble.
export class DiscoverRepositoryImpl implements DiscoverRepository {
  constructor(
    private readonly source: DiscoverDataSource,
    private readonly clock: Clock = systemClock,
  ) {}

  async feedPage({ filter, limit, offset }: Parameters<DiscoverRepository["feedPage"]>[0]): Promise<FeedPage> {
    const rows = await this.guard(() =>
      this.source.queryFeed({
        career: filter.career ?? "",
        skill: filter.skill ?? "",
        onlyOpen: filter.onlyOpen,
        limit,
        offset,
      }),
    );
    return toPage(rows);
  }

  async searchPage({ text, career, limit, offset }: Parameters<DiscoverRepository["searchPage"]>[0]): Promise<FeedPage> {
    const rows = await this.guard(() =>
      this.source.querySearch({ text: normalizeLabel(text), career: career ?? "", limit, offset }),
    );
    return toPage(rows);
  }

  async filterOptions({ career, onlyOpen }: Parameters<DiscoverRepository["filterOptions"]>[0]): Promise<FilterOptions> {
    const rows = await this.guard(() => this.source.queryFilterOptions({ career: career ?? "", onlyOpen }));
    const toOption = (r: Row): FilterOption => ({ key: String(r.key), label: String(r.label), count: toNumber(r.project_count) });
    const byKey = (a: FilterOption, b: FilterOption) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    return {
      careers: rows.filter((r) => r.kind === "career").map(toOption).sort(byKey),
      skills: rows.filter((r) => r.kind === "skill").map(toOption).sort(byKey),
    };
  }

  async projectById(projectId: string) {
    if (!projectId) return null;
    const row = await this.guard(() => this.source.readProject(projectId));
    return row ? toProject(row) : null;
  }

  async savedIds(userId: string) {
    return (await this.saved(userId)).map((r) => String(r.project_id));
  }

  async savedProjects(userId: string) {
    const rows = (await this.saved(userId)).sort(
      (a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime(),
    );
    const projects: DiscoverProject[] = [];
    for (const r of rows) {
      const project = await this.projectById(String(r.project_id));
      if (project) projects.push(project);
    }
    return projects;
  }

  async save({ userId, projectId }: { userId: string; projectId: string }) {
    if (!userId || !projectId) throw new DiscoverFailure("Falta la sesión o el proyecto.");
    // Roble no garantiza unicidad: guardar dos veces no inserta dos filas.
    const existing = (await this.saved(userId)).some((r) => String(r.project_id) === projectId);
    if (existing) return;
    await this.guard(() =>
      this.source.createSaved({ user_id: userId, project_id: projectId, createdAt: this.clock().toISOString() }),
    );
  }

  async unsave({ userId, projectId }: { userId: string; projectId: string }) {
    if (!userId || !projectId) throw new DiscoverFailure("Falta la sesión o el proyecto.");
    // Puede haber más de una fila del mismo par: se borran todas.
    const rows = (await this.saved(userId)).filter((r) => String(r.project_id) === projectId);
    for (const r of rows) {
      const id = textOrNull(r._id);
      if (id) await this.guard(() => this.source.deleteSaved(id));
    }
  }

  private async saved(userId: string) {
    if (!userId) return [];
    return this.guard(() => this.source.readSaved(userId));
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new DiscoverFailure(message));
  }
}

function toPage(rows: Row[]): FeedPage {
  return {
    projects: rows.map(toProject).filter((p) => p.id !== ""),
    // `total` viaja en cada fila (COUNT(*) OVER ()); sin filas, no hay nada.
    total: rows.length > 0 ? toNumber(rows[0].total) : 0,
  };
}

function toProject(row: Row): DiscoverProject {
  const status: ProjectStatus = String(row.status) === "closed" ? "closed" : "open";
  const progress = Math.min(100, Math.max(0, toNumber(row.progress)));
  return {
    id: String(row._id ?? row.id ?? ""),
    ownerId: String(row._owner ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    imageUrl: textOrNull(row.imageUrl),
    jobs: toStringList(row.jobs),
    skills: toStringList(row.skills),
    status,
    progress,
    memberCount: row.member_count == null ? null : toNumber(row.member_count),
    createdAt: row.createdAt ? parseDate(row.createdAt, new Date(0)) : null,
  };
}
