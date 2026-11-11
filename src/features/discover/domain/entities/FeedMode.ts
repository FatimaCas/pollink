import { DiscoverProject } from "./DiscoverProject";

// El selector «Para ti ▾» del Figma. El orden se aplica sobre lo ya cargado.
//   forYou:    los más recientes primero (el orden del servidor).
//   featured:  los de más avance primero.
//   community: los de más miembros primero.
export type FeedMode = "forYou" | "featured" | "community";

export const FEED_MODES: { value: FeedMode; label: string }[] = [
  { value: "forYou", label: "Para ti" },
  { value: "featured", label: "Destacados" },
  { value: "community", label: "Comunidad" },
];

export function sortForMode(projects: DiscoverProject[], mode: FeedMode): DiscoverProject[] {
  if (mode === "forYou") return projects;
  const key = mode === "featured" ? (p: DiscoverProject) => p.progress : (p: DiscoverProject) => (p.memberCount ?? 0);
  // `sort` es estable: a igual valor se conserva el orden de más recientes.
  return [...projects].sort((a, b) => key(b) - key(a));
}
