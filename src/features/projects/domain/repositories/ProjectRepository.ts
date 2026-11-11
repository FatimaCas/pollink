import { Project, ProjectDraft } from "../entities/Project";

// El contrato de proyectos. Lo usan A (Descubrir, solicitudes), B (perfil e
// historial), C (pestaña Proyectos, ficha, crear y cerrar) y D (miembros y
// tareas). Los errores llegan como `ProjectsFailure`.
//
// Lo que cruza features lo orquesta el view model, no este repositorio:
// - Crear un proyecto: `InvitationRepository.findAccounts` (validar correos) →
//   `createProject` → `InvitationRepository.invite` →
//   `MembersRepository.addMember` (el creador, rol `owner`, al final porque una
//   estancia no se puede borrar). Si algo falla después de crear, se deshace
//   con `InvitationRepository.deleteForProject` y `deleteProject`.
// - Salir y quitar miembros son de `MembersRepository` (D).
// - `progress` y `totalTasks` los escribe `TaskRepository` (D).
//
// Toda lectura devuelve el proyecto con `memberCount` lleno.
export interface ProjectRepository {
  // El proyecto, o `null` si no existe (o se borró).
  getProject(projectId: string): Promise<Project | null>;

  // Varios a la vez, en el orden de `projectIds`; los que no existen se omiten.
  // Para «Colaborando», los guardados y los proyectos de una invitación.
  getProjects(projectIds: readonly string[]): Promise<Project[]>;

  // Los que creó `ownerId`, del más nuevo al más viejo («Creados por mí»).
  getProjectsByOwner(ownerId: string): Promise<Project[]>;

  // En qué anda una persona hoy: los que creó y en los que tiene estancia
  // activa, sin repetir, los creados primero. Los que dejó no cuentan (B7).
  getProjectsOfPerson(userId: string): Promise<Project[]>;

  // Todos aquellos en los que tuvo alguna estancia, en cualquier estado y como
  // creadora o colaboradora: su historial (B7). Los creados primero.
  getProjectsParticipatedBy(userId: string): Promise<Project[]>;

  // Crea el proyecto abierto, con `ownerId` como dueño, progreso 0 y sin
  // tareas. Valida el borrador (`draftError`) y limpia carreras y habilidades
  // (`cleanLabels`). NO crea el miembro creador ni las invitaciones.
  createProject(params: { draft: ProjectDraft; ownerId: string }): Promise<Project>;

  // Edita la información básica (C4) y devuelve el proyecto leído de vuelta.
  // Mismas validaciones que al crear. Un proyecto cerrado no se edita.
  // Quién puede (el creador) lo decide quien llama (`isOwnedBy`).
  updateBasicInfo(params: { projectId: string; draft: ProjectDraft }): Promise<Project>;

  // Cierra el proyecto (`status` = `closed`) y lo devuelve leído de vuelta. Es
  // irreversible. Cerrar uno ya cerrado no falla. Quién puede (el creador) lo
  // decide quien llama. Un proyecto cerrado no acepta solicitudes ni
  // invitaciones (A y C lo comprueban con `isOpen`).
  closeProject(projectId: string): Promise<Project>;

  // Borra el proyecto. Solo para deshacer una creación que falló a medias: la
  // app no ofrece borrar proyectos.
  deleteProject(projectId: string): Promise<void>;
}
