import { PeopleDirectory } from "../../domain/repositories/PeopleDirectory";
import { ProfileRepository } from "../../domain/repositories/ProfileRepository";

// Caché de sesión de nombres: «quién es» cada `userId` que sale en una pantalla
// (miembros, invitaciones, tareas), con una sola lectura por persona aunque
// aparezca en muchas filas.
//
// - Los ids que faltan se piden juntos en una consulta (`getNamesOf`).
// - Dos pedidos del mismo id a la vez comparten la misma lectura.
// - Quien no tiene perfil se recuerda como «sin nombre»: no se vuelve a preguntar.
// - Un fallo (sin red, sin permiso) NO se recuerda: se puede reintentar.
// - `clear()` olvida todo al cambiar de sesión; una lectura de la sesión
//   anterior que llega tarde no escribe en la nueva.
export class PeopleDirectoryStore implements PeopleDirectory {
  private names = new Map<string, string>();
  private withoutName = new Set<string>();
  private pending = new Map<string, Promise<void>>();
  private listeners = new Set<() => void>();
  private epoch = 0;
  private boundUser: string | null | undefined = undefined;

  constructor(private readonly profiles: ProfileRepository) {}

  nameOf(userId: string): string | null {
    return this.names.get(userId) ?? null;
  }

  async preload(userIds: string[]): Promise<void> {
    const ids = [...new Set(userIds.filter(Boolean))];
    const waiting: Promise<void>[] = [];
    const missing: string[] = [];
    for (const id of ids) {
      if (this.names.has(id) || this.withoutName.has(id)) continue;
      const inFlight = this.pending.get(id);
      if (inFlight) waiting.push(inFlight);
      else missing.push(id);
    }
    if (missing.length > 0) waiting.push(this.read(missing));
    await Promise.all(waiting);
  }

  // Olvida lo de la sesión que se va.
  clear() {
    this.epoch += 1;
    this.names.clear();
    this.withoutName.clear();
    this.pending.clear();
    this.notify();
  }

  // Liga el directorio a la persona de la sesión: si cambia, olvida.
  bindUser(userId: string | null) {
    if (this.boundUser !== undefined && this.boundUser !== userId) this.clear();
    this.boundUser = userId;
  }

  // Para `useSyncExternalStore`.
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private read(ids: string[]): Promise<void> {
    const epoch = this.epoch;
    const reading = (async () => {
      try {
        const found = await this.profiles.getNamesOf(ids);
        if (epoch !== this.epoch) return;
        for (const id of ids) {
          if (found[id]) this.names.set(id, found[id]);
          else this.withoutName.add(id);
        }
        this.notify();
      } catch {
        // Sin red o sin permiso: no se recuerda, se puede reintentar.
      } finally {
        if (epoch === this.epoch) for (const id of ids) this.pending.delete(id);
      }
    })();
    for (const id of ids) this.pending.set(id, reading);
    return reading;
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }
}
