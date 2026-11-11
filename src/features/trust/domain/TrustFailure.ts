// Lo que el repositorio de confianza lanza en vez de las excepciones de Roble.
export class TrustFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrustFailure";
  }
}
