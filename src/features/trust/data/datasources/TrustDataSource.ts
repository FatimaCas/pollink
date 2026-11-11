import { Row } from "@/src/core/roble/guard";

// Lo que la feature necesita que alguien sepa hablar sobre el historial de
// colaboración. Devuelve filas tal como llegan; convertirlas y calcular es del
// repositorio.
export interface TrustDataSource {
  // Una fila por (persona, proyecto) de cada una de `userIds`: `user_id`,
  // `project_id`, `tasks_finished`, `tasks_taken`, `total_tasks`, `progress`.
  // Los contadores suman todas las estancias de la persona en el proyecto.
  readParticipations(userIds: string[]): Promise<Row[]>;
  // Una fila por persona con tareas terminadas: `user_id`, `con_deadline`, `a_tiempo`.
  readDeliveries(userIds: string[]): Promise<Row[]>;
}
