// Carrera de la persona. Se guarda tal cual en la columna jsonb `career`.
export type Career = {
  program: string;
  institution: string;
};

// El perfil de una persona (pestaña "Perfil" y perfil ajeno de solo lectura).
// Los indicadores de confianza NO viajan aquí: salen de `features/trust`.
export type UserProfile = {
  userId: string;
  name: string;
  career: Career;
  bio: string;
  skills: string[];
};

// "Programa - Institución", o lo que haya de los dos.
export function academicInfo(profile: UserProfile): string {
  const { program, institution } = profile.career;
  if (!program) return institution;
  if (!institution) return program;
  return `${program} - ${institution}`;
}

// Hay datos para presentarse: carrera y al menos una habilidad.
// La descripción es opcional. Alimenta la tarjeta "Completa tu perfil".
export function isProfileComplete(profile: UserProfile): boolean {
  return profile.career.program.length > 0 && profile.skills.length > 0;
}

// Perfil vacío para quien aún no tiene fila en `profile`.
export function emptyProfile(userId: string, name = ""): UserProfile {
  return { userId, name, career: { program: "", institution: "" }, bio: "", skills: [] };
}
