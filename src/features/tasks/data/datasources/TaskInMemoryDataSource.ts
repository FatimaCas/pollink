import { DummyData, matchesRow } from "@/src/core/data/dummyData";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { encodeChecklist } from "./TaskRemoteDataSource";
import { TaskDataSource } from "./TaskDataSource";

// Tareas en memoria: las mismas filas que devolvería Roble.
export class TaskInMemoryDataSource implements TaskDataSource {
  constructor(private readonly data: DummyData) {}

  async readTasks(projectId: string) {
    await this.data.delay();
    return this.data
      .table(TABLES.task)
      .filter((r) => matchesRow(r, { project_id: projectId }))
      .map((r) => ({ ...r }));
  }

  async createTask(row: Row) {
    await this.data.delay();
    // Roble pone `_owner` con quien crea la fila.
    const created = { _id: this.data.nextId("t"), _owner: this.data.session?.userId ?? null, ...encodeChecklist(row) };
    this.data.table(TABLES.task).push(created);
    return { ...created };
  }

  async updateTask(id: string, fields: Row) {
    await this.data.delay();
    const row = this.data.table(TABLES.task).find((r) => r._id === id);
    if (!row) throw new Error("La tarea no existe.");
    Object.assign(row, encodeChecklist(fields));
  }

  async deleteTask(id: string) {
    await this.data.delay();
    const rows = this.data.table(TABLES.task);
    const index = rows.findIndex((r) => r._id === id);
    if (index >= 0) rows.splice(index, 1);
  }

  async readContributions(taskId: string) {
    await this.data.delay();
    return this.data
      .table(TABLES.contribution)
      .filter((r) => matchesRow(r, { task_id: taskId }))
      .map((r) => ({ ...r }));
  }

  async createContribution(row: Row) {
    await this.data.delay();
    const created = { _id: this.data.nextId("c"), ...row };
    this.data.table(TABLES.contribution).push(created);
    return { ...created };
  }

  async writeProjectTaskStats(projectId: string, { progress, totalTasks }: { progress: number; totalTasks: number }) {
    await this.data.delay();
    const project = this.data.table(TABLES.project).find((r) => r._id === projectId);
    if (!project) throw new Error("El proyecto no existe.");
    project.progress = progress;
    project.total_tasks = totalTasks;
  }
}
