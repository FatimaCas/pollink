import { ProfileUpdate } from "../entities/ProfileUpdate";
import { UserProfile } from "../entities/UserProfile";

// Contrato del perfil. La UI depende de esto, nunca de Roble.
export interface ProfileRepository {
  // Perfil de la sesión activa. Sin fila, un perfil vacío.
  getMyProfile(): Promise<UserProfile>;

  // Perfil de otra persona (solo lectura). Sin fila, un perfil vacío.
  getProfileOf(userId: string): Promise<UserProfile>;

  // Garantiza que la sesión activa tenga fila en `profile`; si no, la crea
  // con `name`. Se llama al entrar en la app, no en cada lectura.
  ensureMyProfile(name: string): Promise<void>;

  // Actualiza carrera, bio y habilidades del propio perfil.
  updateMyProfile(update: ProfileUpdate): Promise<UserProfile>;

  // Nombres de varias personas con una sola consulta. Quien no tiene fila no
  // aparece en el resultado. Lo usa `PeopleDirectory`.
  getNamesOf(userIds: string[]): Promise<Record<string, string>>;
}
