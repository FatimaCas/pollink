import { ProjectTask } from "../entities/ProjectTask";
import { Subtask } from "../entities/Subtask";
import { TaskComment } from "../entities/TaskComment";
import { TaskStatus } from "../entities/TaskStatus";

// El contrato de tareas. La UI depende de esto, nunca de Roble. Los errores
// llegan como `TasksFailure`.
export interface TaskRepository {
  getTasks(projectId: string): Promise<ProjectTask[]>;

  // Crea la tarea (siempre `todo`) y recalcula el progreso y el total de tareas
  // del proyecto. `deadline` es opcional (ver `TaskDeadline`).
  createTask(params: { projectId: string; title: string; description?: string; deadline?: Date | null }): Promise<ProjectTask>;

  // Cambia el estado y recalcula el progreso del proyecto. Si la tarea tiene
  // responsable y pasa a (o deja de estar) terminada, recalcula también las
  // terminadas de esa persona. Al pasar a terminada escribe `finished_at` con el
  // instante actual; al reabrirla lo borra.
  updateTaskStatus(params: { task: ProjectTask; status: TaskStatus }): Promise<ProjectTask>;

  // Cambia o quita (`deadline` null) la fecha límite de una tarea que no esté
  // terminada, y deja un comentario automático de `userId` con el cambio. Quién
  // puede hacerlo lo decide quien llama (ver `TaskDeadline.canEdit`).
  updateTaskDeadline(params: { task: ProjectTask; deadline: Date | null; userId: string }): Promise<ProjectTask>;

  // Reserva una tarea pendiente para `userId`: queda `doing` con esa persona como
  // responsable. Lee la tarea justo antes de escribir y, si otra persona ya la
  // tomó, lanza `TasksFailure` en vez de pisarla. Roble no tiene escrituras
  // condicionales: esto reduce la ventana de carrera, pero no la elimina.
  // Suma una a las tareas tomadas de `userId` en el proyecto, salvo que la tarea
  // ya fuera suya.
  reserveTask(params: { task: ProjectTask; userId: string }): Promise<ProjectTask>;

  // Asigna una tarea pendiente a `assigneeId`: queda `doing` con esa persona y
  // cuenta como tomada igual que en `reserveTask`. Solo la puede asignar el
  // creador del proyecto (`requestedBy`) y la persona debe ser miembro activo.
  // Una tarea que ya tiene responsable no se reasigna.
  assignTask(params: { task: ProjectTask; assigneeId: string; requestedBy: string }): Promise<ProjectTask>;

  // Guarda descripción y checklist en una sola escritura. El estado lo decide
  // `statusAfterSaving`; si cambia, se recalcula el progreso del proyecto y
  // `finished_at` (se escribe al terminarse, se borra al reabrirse).
  saveTaskProgress(params: { task: ProjectTask; description: string; subtasks: Subtask[] }): Promise<ProjectTask>;

  // Comentarios de la tarea, del más nuevo al más viejo.
  getComments(task: ProjectTask): Promise<TaskComment[]>;
  addComment(params: { task: ProjectTask; userId: string; body: string }): Promise<TaskComment>;

  // Libera las tareas sin terminar (`todo` o `doing`) que tenía `userId`: quedan
  // sin responsable y vuelven a `todo`. Las terminadas no se tocan. Devuelve
  // cuántas liberó. El progreso del proyecto no cambia y las tareas tomadas de
  // `userId` tampoco bajan: lo que soltó sigue contando como tomado.
  releaseUnfinishedTasks(params: { projectId: string; userId: string }): Promise<number>;

  // Borra la tarea y recalcula el progreso y el total del proyecto. Si tenía
  // responsable, esa persona deja de tenerla como tomada y se recalculan sus
  // terminadas.
  deleteTask(task: ProjectTask): Promise<void>;

  // Vuelve a contar las tareas del proyecto y guarda el porcentaje en
  // `project.progress` y el conteo en `project.total_tasks`. Siempre cuenta
  // desde cero: si dos personas cambian tareas a la vez, la siguiente llamada lo
  // corrige sola. Devuelve el porcentaje.
  recalculateProgress(projectId: string): Promise<number>;
}
