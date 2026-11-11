// Lo que el repositorio de seguidores lanza cuando una operación no se puede
// hacer: por una regla del dominio o porque el servidor la rechazó.
export class FollowsFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FollowsFailure";
  }
}
