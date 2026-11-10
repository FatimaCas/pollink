// Lo que el repositorio de tareas lanza cuando una operación no se puede hacer:
// por una regla del dominio (p. ej. la tarea ya la tomó otra persona) o porque
// el servidor la rechazó.
export class TasksFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TasksFailure";
  }
}
