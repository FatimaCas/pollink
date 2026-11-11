import { emptyProfile, UserProfile } from "@/src/features/profile/domain/entities/UserProfile";

// Un perfil completo de prueba; cada prueba cambia lo que le importa.
export function profile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    ...emptyProfile("u2", "Laura Pérez"),
    career: { program: "Diseño Gráfico", institution: "Universidad del Norte" },
    bio: "Me gusta el diseño.",
    skills: ["Figma", "Ilustración"],
    ...over,
  };
}
