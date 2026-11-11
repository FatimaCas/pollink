export type ProfileFailureCode =
  // Sin sesión activa: no se puede saber de quién es el perfil.
  | "NO_SESSION"
  // No hubo conexión con el servidor. Reintentar puede funcionar.
  | "NETWORK";

// Lo que el repositorio de perfil lanza en vez de las excepciones de Roble.
export class ProfileFailure extends Error {
  constructor(
    message: string,
    readonly code: ProfileFailureCode | null = null,
  ) {
    super(message);
    this.name = "ProfileFailure";
  }
}
