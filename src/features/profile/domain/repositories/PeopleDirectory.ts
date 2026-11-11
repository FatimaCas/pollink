// Directorio de personas de la sesión: traduce `userId` a nombre.
// Lo usan miembros, invitaciones y tareas para no pedir el nombre uno a uno.
export interface PeopleDirectory {
  // Pide de una vez los nombres que falten por conocer.
  preload(userIds: string[]): Promise<void>;

  // Nombre ya cargado, o `null` si todavía no se conoce.
  nameOf(userId: string): string | null;
}
