import { ProjectStatus } from "./ProjectStatus";

// Un proyecto (`project`). Lo usan Descubrir (A), el perfil (B), la pestaña
// Proyectos y la ficha (C), y miembros y tareas (D).
export interface Project {
  id: string;
  // `_owner` de la fila: quien creó el proyecto.
  ownerId: string;
  title: string;
  description: string;
  // Carreras que busca el proyecto (`jobs`, jsonb). Sin vacíos ni repetidos.
  jobs: string[];
  // Habilidades que busca (`skills`, jsonb). Sin vacíos ni repetidos.
  skills: string[];
  status: ProjectStatus;
  // Miembros activos, el creador incluido (una persona cuenta una vez). Toda
  // lectura de `ProjectRepository` lo trae lleno.
  memberCount: number;
  // Porcentaje (0–100) de tareas terminadas y total de tareas. Los escribe el
  // repositorio de tareas (D) cada vez que cambia una tarea; C solo los lee.
  progress: number;
  totalTasks: number;
  // `null` si la fila es vieja y no lo tiene.
  createdAt: Date | null;
}

export const isOpen = (project: Project) => project.status === "open";

export const isOwnedBy = (project: Project, userId: string | null | undefined) =>
  !!userId && project.ownerId === userId;

// Límites del formulario de crear y editar (C2, C4).
export const PROJECT_LIMITS = {
  titleMax: 80,
  descriptionMax: 1000,
} as const;

// Lo que la persona escribe en el formulario de crear o editar.
export interface ProjectDraft {
  title: string;
  description: string;
  jobs: string[];
  skills: string[];
}

// Limpia una lista de etiquetas (carreras o habilidades): quita espacios de
// sobra, vacíos y repetidos, sin importar mayúsculas ni tildes. Conserva la
// primera forma escrita y el orden.
export function cleanLabels(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of labels) {
    const label = raw.trim().replace(/\s+/g, " ");
    const key = labelKey(label);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

// Clave para comparar etiquetas: minúsculas y sin tildes.
function labelKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Por qué un borrador no se puede guardar, o `null` si se puede. El nombre y la
// descripción son obligatorios. El repositorio vuelve a validarlo.
export function draftError(draft: ProjectDraft): string | null {
  const title = draft.title.trim();
  const description = draft.description.trim();
  if (title === "") return "Ponle un nombre al proyecto.";
  if (title.length > PROJECT_LIMITS.titleMax) return `El nombre puede tener hasta ${PROJECT_LIMITS.titleMax} caracteres.`;
  if (description === "") return "Describe el proyecto.";
  if (description.length > PROJECT_LIMITS.descriptionMax) {
    return `La descripción puede tener hasta ${PROJECT_LIMITS.descriptionMax} caracteres.`;
  }
  return null;
}
