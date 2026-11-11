import { guardRoble, parseDate, Row, textOrNull, toNumber } from "@/src/core/roble/guard";
import { Clock, systemClock } from "@/src/core/utils/clock";
import { cleanLabels, draftError, Project, ProjectDraft } from "../../domain/entities/Project";
import { projectStatusOf } from "../../domain/entities/ProjectStatus";
import { ProjectsFailure } from "../../domain/ProjectsFailure";
import { ProjectRepository } from "../../domain/repositories/ProjectRepository";
import { ProjectDataSource } from "../datasources/ProjectDataSource";

// Proyectos: decide y traduce, no habla con Roble.
export class ProjectRepositoryImpl implements ProjectRepository {
  constructor(
    private readonly source: ProjectDataSource,
    private readonly clock: Clock = systemClock,
  ) {}

  async getProject(projectId: string) {
    if (!projectId) return null;
    const row = await this.guard(() => this.source.readProject(projectId));
    if (!row) return null;
    const [project] = await this.withCounts([row]);
    return project;
  }

  async getProjects(projectIds: readonly string[]) {
    const ids = unique(projectIds);
    if (ids.length === 0) return [];
    const rows = await Promise.all(ids.map((id) => this.guard(() => this.source.readProject(id))));
    return this.withCounts(rows.filter((r): r is Row => r !== null));
  }

  async getProjectsByOwner(ownerId: string) {
    if (!ownerId) return [];
    const rows = await this.guard(() => this.source.readProjects({ _owner: ownerId }));
    return newestFirst(await this.withCounts(rows));
  }

  async getProjectsOfPerson(userId: string) {
    return this.createdAndJoined(userId, (status) => status === "active");
  }

  async getProjectsParticipatedBy(userId: string) {
    return this.createdAndJoined(userId, () => true);
  }

  async createProject({ draft, ownerId }: { draft: ProjectDraft; ownerId: string }) {
    if (!ownerId) throw new ProjectsFailure("Necesitas una cuenta para crear un proyecto.");
    const clean = this.validDraft(draft);
    const row = await this.guard(() =>
      this.source.createProject({
        ...clean,
        // Las imágenes están fuera de alcance, pero la columna no admite nulos.
        imageUrl: "",
        status: "open",
        progress: 0,
        total_tasks: 0,
        // Roble no tiene valores por defecto y `proyectos_filtrados` ordena por él.
        createdAt: this.clock().toISOString(),
      }),
    );
    // Recién creado no tiene miembros: el creador lo agrega quien llama.
    return toProject({ _owner: ownerId, ...row }, 0);
  }

  async updateBasicInfo({ projectId, draft }: { projectId: string; draft: ProjectDraft }) {
    const clean = this.validDraft(draft);
    const current = await this.mustGet(projectId);
    if (current.status === "closed") throw new ProjectsFailure("El proyecto está cerrado: ya no se puede editar.");
    await this.guard(() => this.source.updateProject(projectId, clean));
    return this.mustGet(projectId);
  }

  async closeProject(projectId: string) {
    const current = await this.mustGet(projectId);
    if (current.status === "closed") return current;
    await this.guard(() => this.source.updateProject(projectId, { status: "closed" }));
    return this.mustGet(projectId);
  }

  async deleteProject(projectId: string) {
    if (!projectId) return;
    await this.guard(() => this.source.deleteProject(projectId));
  }

  // ─── Ayudas ───────────────────────────────────────────────────────────────

  // Los creados por la persona (más nuevos primero) y luego aquellos donde
  // tiene una estancia que cumple `keep`, sin repetir.
  private async createdAndJoined(userId: string, keep: (status: string) => boolean) {
    if (!userId) return [];
    const [owned, stays] = await Promise.all([
      this.getProjectsByOwner(userId),
      this.guard(() => this.source.readMembers({ user_id: userId })),
    ]);
    const ownedIds = new Set(owned.map((p) => p.id));
    const joinedIds = stays
      .filter((s) => keep(String(s.status ?? "")))
      .map((s) => String(s.project_id ?? ""))
      .filter((id) => id !== "" && !ownedIds.has(id));
    return [...owned, ...newestFirst(await this.getProjects(joinedIds))];
  }

  // Convierte filas en proyectos con `memberCount`. Con un solo proyecto lee
  // solo sus miembros; con varios, la tabla una vez.
  private async withCounts(rows: Row[]): Promise<Project[]> {
    const valid = rows.filter((r) => idOf(r) !== "");
    if (valid.length === 0) return [];
    const filters = valid.length === 1 ? { project_id: idOf(valid[0]) } : undefined;
    const members = await this.guard(() => this.source.readMembers(filters));
    const counts = activeCounts(members);
    return valid.map((r) => toProject(r, counts.get(idOf(r)) ?? 0));
  }

  private async mustGet(projectId: string) {
    const project = await this.getProject(projectId);
    if (!project) throw new ProjectsFailure("El proyecto ya no existe.");
    return project;
  }

  private validDraft(draft: ProjectDraft) {
    const error = draftError(draft);
    if (error) throw new ProjectsFailure(error);
    return {
      title: draft.title.trim(),
      description: draft.description.trim(),
      jobs: cleanLabels(draft.jobs),
      skills: cleanLabels(draft.skills),
    };
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new ProjectsFailure(message), {
      notFound: "El proyecto ya no existe.",
    });
  }
}

function idOf(row: Row) {
  return String(row._id ?? row.id ?? "");
}

function toProject(row: Row, memberCount: number): Project {
  return {
    id: idOf(row),
    ownerId: textOrNull(row._owner) ?? "",
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    jobs: cleanLabels(decodeList(row.jobs)),
    skills: cleanLabels(decodeList(row.skills)),
    status: projectStatusOf(row.status),
    memberCount,
    progress: Math.min(100, Math.max(0, toNumber(row.progress))),
    totalTasks: Math.max(0, toNumber(row.total_tasks)),
    createdAt: instant(row.createdAt),
  };
}

// Miembros activos por proyecto. Roble no garantiza unicidad: una persona
// cuenta una sola vez por proyecto.
function activeCounts(members: Row[]): Map<string, number> {
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (const m of members) {
    const projectId = String(m.project_id ?? "");
    const userId = String(m.user_id ?? "");
    if (m.status !== "active" || projectId === "" || userId === "") continue;
    const key = `${projectId}/${userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
  }
  return counts;
}

// `jobs` y `skills` son jsonb: llegan como lista o como texto JSON. Lo que no
// calza da una lista vacía: una fila mal guardada no debe tumbar la lista.
function decodeList(raw: unknown): string[] {
  if (typeof raw === "string") {
    const text = raw.trim();
    if (text === "") return [];
    try {
      return decodeList(JSON.parse(text));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string | number => typeof v === "string" || typeof v === "number").map(String);
}

// `timestamptz` llega como texto ISO; lo ilegible o vacío es «sin fecha».
function instant(value: unknown): Date | null {
  const text = textOrNull(value);
  if (text === null) return null;
  const date = parseDate(text, new Date(NaN));
  return Number.isNaN(date.getTime()) ? null : date;
}

function newestFirst(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id) => id !== ""))];
}
