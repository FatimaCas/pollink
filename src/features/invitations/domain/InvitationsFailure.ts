// Lo que el repositorio de invitaciones lanza cuando una operación no se puede
// hacer: por una regla del dominio (p. ej. un correo sin cuenta) o porque el
// servidor la rechazó.
export class InvitationsFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationsFailure";
  }
}
