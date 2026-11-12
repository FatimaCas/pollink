import { DiscoverProject } from "../entities/DiscoverProject";
import { FilterOptions, ProjectFilter } from "../entities/ProjectFilter";

export interface FeedPage {
  projects: DiscoverProject[];
  // Proyectos que cumplen el filtro, sin paginar.
  total: number;
}

// El contrato del feed y de los guardados. Los errores llegan como `DiscoverFailure`.
export interface DiscoverRepository {
  // Una página del feed, más recientes primero, ya filtrada en el servidor.
  feedPage(params: { filter: ProjectFilter; limit: number; offset: number }): Promise<FeedPage>;

  // Una página de Explorar: proyectos cuyo título o descripción contienen
  // `text` (sin distinguir mayúsculas ni tildes), de la carrera `career` (clave
  // normalizada) si viene. Más recientes primero.
  searchPage(params: { text: string; career: string | null; limit: number; offset: number }): Promise<FeedPage>;

  // Las opciones de los selectores de la hoja de filtros. Las carreras no
  // dependen de la habilidad elegida; las habilidades sí de la carrera.
  filterOptions(params: { career: string | null; onlyOpen: boolean }): Promise<FilterOptions>;

  // Un proyecto por id, o `null` si no existe.
  projectById(projectId: string): Promise<DiscoverProject | null>;

  // Los ids de los proyectos que la persona guardó.
  savedIds(userId: string): Promise<string[]>;

  // Sus proyectos guardados, el más reciente primero. Un guardado cuyo proyecto
  // ya no existe se omite.
  savedProjects(userId: string): Promise<DiscoverProject[]>;

  // Idempotentes: guardar uno ya guardado, o quitar uno que no lo está, no falla.
  save(params: { userId: string; projectId: string }): Promise<void>;
  unsave(params: { userId: string; projectId: string }): Promise<void>;
}
