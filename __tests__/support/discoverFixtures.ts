import { DiscoverProject } from "@/src/features/discover/domain/entities/DiscoverProject";

// Un proyecto de prueba; cada prueba cambia solo lo que le importa.
export function project(overrides: Partial<DiscoverProject> = {}): DiscoverProject {
  return {
    id: "p1",
    ownerId: "u1",
    title: "Fresitas",
    description: "Restaurante de fresas con crema",
    imageUrl: null,
    jobs: ["Gastronomía"],
    skills: ["Postres"],
    status: "open",
    progress: 60,
    memberCount: 1,
    createdAt: new Date(2026, 9, 5),
    ...overrides,
  };
}
