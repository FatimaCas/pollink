import { RobleClient } from "@/src/core/roble/RobleClient";
import { Row } from "@/src/core/roble/guard";
import { TABLES } from "@/src/core/roble/tables";
import { TaskDataSource } from "./TaskDataSource";

// Habla con Roble sobre tareas. No decide nada y deja subir las excepciones.
export class TaskRemoteDataSource implements TaskDataSource {
  constructor(private readonly client: RobleClient) {}

  readTasks(projectId: string) {
    return this.client.db.read(TABLES.task, { project_id: projectId });
  }

  createTask(row: Row) {
    return this.client.db.create(TABLES.task, encodeChecklist(row));
  }

  async updateTask(id: string, fields: Row) {
    await this.client.db.update(TABLES.task, id, encodeChecklist(fields));
  }

  async deleteTask(id: string) {
    await this.client.db.delete(TABLES.task, id);
  }

  readContributions(taskId: string) {
    return this.client.db.read(TABLES.contribution, { task_id: taskId });
  }

  createContribution(row: Row) {
    return this.client.db.create(TABLES.contribution, row);
  }

  async writeProjectTaskStats(projectId: string, { progress, totalTasks }: { progress: number; totalTasks: number }) {
    await this.client.db.update(TABLES.project, projectId, { progress, total_tasks: totalTasks });
  }
}

// Roble rechaza una lista nativa en una columna jsonb: el checklist viaja como
// texto JSON, igual que `jobs` y `skills` de los proyectos.
export function encodeChecklist(fields: Row): Row {
  return Array.isArray(fields.checklist) ? { ...fields, checklist: JSON.stringify(fields.checklist) } : fields;
}
