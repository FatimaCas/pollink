// Lo que el repositorio de solicitudes lanza cuando una operación no se puede
// hacer: por una regla del dominio o porque el servidor la rechazó.
export class RequestsFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestsFailure";
  }
}
