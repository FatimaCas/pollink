// Lo que el repositorio de miembros lanza cuando una operación no se puede
// hacer: por una regla del dominio o porque el servidor la rechazó.
export class MembersFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembersFailure";
  }
}
