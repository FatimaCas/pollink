import { Invitee, ProjectInvitation } from "../entities/ProjectInvitation";

// El contrato de invitaciones. Lo usan C (crear proyecto, invitaciones
// pendientes) y A (aceptar una solicitud cierra las invitaciones que sobran).
// Los errores llegan como `InvitationsFailure`.
//
// Lo que cruza features lo orquesta el view model, no este repositorio:
// - Aceptar una invitación: comprobar que el proyecto sigue abierto
//   (`ProjectRepository`) → `MembersRepository.addMember` → `accept` →
//   `JoinRequestRepository.cancelPending` (A) para la solicitud que sobra.
// - Listar las pendientes sin las de proyectos cerrados: `pendingFor` y luego
//   filtrar con `ProjectRepository.getProjects` + `isOpen`.
export interface InvitationRepository {
  // Busca la cuenta de cada correo (`usuario_por_correo`). Se llama ANTES de
  // escribir nada al crear un proyecto: Roble no tiene transacciones, así que
  // es la única forma de abortar sin efectos a medias. Los correos se limpian
  // con `cleanEmails`; `missing` son los que no tienen cuenta.
  findAccounts(emails: readonly string[]): Promise<{ found: Invitee[]; missing: string[] }>;

  // Crea una invitación `pending` por persona, escrita por quien está en la
  // sesión (queda como `invitedBy`). A quien ya tiene una pendiente en ese
  // proyecto no se le crea otra: reintentar no duplica.
  invite(params: { projectId: string; invitees: readonly Invitee[] }): Promise<ProjectInvitation[]>;

  // Las invitaciones `pending` dirigidas a `userId`, de la más nueva a la más
  // vieja, de cualquier proyecto (abierto o cerrado).
  pendingFor(userId: string): Promise<ProjectInvitation[]>;

  // La persona invitada responde. Solo una `pending` se puede responder: si ya
  // no lo está, lanza `InvitationsFailure`. Escribe `respondedAt`. No toca la
  // membresía.
  accept(invitationId: string): Promise<void>;
  decline(invitationId: string): Promise<void>;

  // Pasa a `cancelled` las pendientes de `userId` en ese proyecto (ya entró
  // por otra vía). Devuelve cuántas canceló; ninguna no es un error.
  cancelPending(params: { projectId: string; userId: string }): Promise<number>;

  // Borra todas las invitaciones del proyecto. Solo para deshacer una creación
  // de proyecto que falló a medias.
  deleteForProject(projectId: string): Promise<void>;
}
