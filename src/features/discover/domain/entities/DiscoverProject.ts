// Un proyecto tal como se ve en el feed de Descubrir y en «Guardados». Es la
// vista de lectura que devuelve `proyectos_filtrados`, no la entidad `Project`
// de C: cuando exista, se puede reemplazar sin tocar la pantalla.
export type ProjectStatus = "open" | "closed";

export interface DiscoverProject {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  // Carreras relacionadas y conocimientos requeridos (texto libre).
  jobs: string[];
  skills: string[];
  status: ProjectStatus;
  // Porcentaje de tareas terminadas, de 0 a 100.
  progress: number;
  // `null` cuando la lectura no lo trae (un proyecto suelto, no el feed).
  memberCount: number | null;
  createdAt: Date | null;
}

export const isOpen = (project: DiscoverProject) => project.status === "open";
