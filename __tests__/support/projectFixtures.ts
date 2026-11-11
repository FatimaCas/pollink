import { Project } from "@/src/features/projects/domain/entities/Project";

// Un `Project` de C con valores de relleno; cada prueba cambia lo que le importa.
export const ownProject = (over: Partial<Project> = {}): Project => ({
  id: "p1",
  ownerId: "u2",
  title: "Huerta urbana",
  description: "Cultivos en la terraza",
  jobs: ["Biología"],
  skills: [],
  status: "open",
  memberCount: 1,
  progress: 0,
  totalTasks: 0,
  createdAt: null,
  ...over,
});
