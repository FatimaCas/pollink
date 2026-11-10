import AsyncStorage from "@react-native-async-storage/async-storage";
import { RobleApiClient } from "roble-client";

// El cliente de Roble, uno solo para toda la app.
//
// Se crea una vez (en `appContainer.ts`) y se comparte: crear uno por pantalla
// le daría a cada copia su propia sesión. Solo lo usan los datasources. Los
// nombres de tablas y consultas guardadas están en `tables.ts`.
export class RobleClient {
  readonly db: RobleApiClient;

  constructor(params: { baseUrl: string; contractId: string } | { db: RobleApiClient }) {
    this.db =
      "db" in params
        ? params.db
        : new RobleApiClient({
            baseUrl: params.baseUrl,
            contractId: params.contractId,
            // En React Native no hay localStorage: sin esto la sesión se pierde
            // al cerrar la app.
            storage: AsyncStorage,
          });
  }

  // El `userId` de la sesión, sacado del token sin ir al servidor.
  get currentUserId(): string | null {
    return this.db.currentUserId();
  }

  get isGuest(): boolean {
    return this.db.isAnonymous;
  }

  // Quien no puede leer la tabla entera: sin sesión, o con sesión de invitado.
  //
  // Un invitado tiene sesión pero el rol `anonymous` solo lee lo suyo: mirar
  // solo `isLoggedIn` le devolvería una lista vacía sin ningún error.
  get readsPublicly(): boolean {
    return !this.db.isLoggedIn || this.db.isAnonymous;
  }

  // Lectura de tablas públicas: `publicRead` sin cuenta, la normal con ella.
  readPublicOrPrivate(table: string, filters?: Record<string, unknown>) {
    return this.readsPublicly ? this.db.publicRead(table, filters) : this.db.read(table, filters);
  }
}
