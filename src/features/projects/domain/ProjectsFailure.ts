// Lo que el repositorio de proyectos lanza cuando una operación no se puede
// hacer: por una regla del dominio (p. ej. el proyecto está cerrado) o porque
// el servidor la rechazó.
export class ProjectsFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectsFailure";
  }
}
