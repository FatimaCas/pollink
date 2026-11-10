import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre `task`,
// `contribution` y los contadores de `project`. Devuelve filas tal como llegan.
export interface TaskDataSource {
  readTasks(projectId: string): Promise<Row[]>;
  createTask(row: Row): Promise<Row>;
  // Escribe solo las columnas de `fields` en la tarea `id`.
  updateTask(id: string, fields: Row): Promise<void>;
  deleteTask(id: string): Promise<void>;
  // Filas de `contribution` de esa tarea (sus comentarios).
  readContributions(taskId: string): Promise<Row[]>;
  createContribution(row: Row): Promise<Row>;
  // Escribe `project.progress` (porcentaje 0–100) y `project.total_tasks`.
  writeProjectTaskStats(projectId: string, stats: { progress: number; totalTasks: number }): Promise<void>;
}
