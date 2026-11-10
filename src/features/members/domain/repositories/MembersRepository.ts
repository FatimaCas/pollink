import { MemberRole, MemberStay } from "../entities/MemberStay";
import { ProjectMember } from "../entities/ProjectMember";

// El contrato de miembros y estancias. Lo usan A (aceptar una solicitud), C
// (crear proyecto y aceptar invitación) y D (tablero y contadores). Los errores
// llegan como `MembersFailure`.
export interface MembersRepository {
  // Agrega a la persona como miembro activo. Si ya tiene una estancia activa no
  // inserta otra (Roble no garantiza unicidad: reintentar no duplica). Una
  // estancia terminada no se reabre: el reingreso crea una fila nueva.
  addMember(params: { projectId: string; userId: string; role?: MemberRole }): Promise<MemberStay>;

  // Quienes están hoy en el proyecto, una vez cada quien, el creador primero.
  activeMembers(projectId: string): Promise<ProjectMember[]>;

  // Sus `userId`, sin repetidos.
  activeMemberIds(projectId: string): Promise<string[]>;

  // Miembros activos por proyecto (una persona cuenta una sola vez). Sin
  // `projectId` trae todos los proyectos.
  activeMemberCounts(projectId?: string): Promise<Record<string, number>>;

  // `userId` sale del proyecto: su estancia pasa a `left`. El creador no puede salir.
  // Para liberar sus tareas sin terminar, quien llama usa `TaskRepository.releaseUnfinishedTasks`.
  leave(params: { projectId: string; userId: string }): Promise<void>;

  // El creador (`requestedBy`) saca a `memberUserId`: su estancia pasa a
  // `removed`. No se puede sacar al creador ni a uno mismo.
  remove(params: { projectId: string; memberUserId: string; requestedBy: string }): Promise<void>;

  // Todas las estancias de la persona en el proyecto, activas o no.
  staysOf(projectId: string, userId: string): Promise<MemberStay[]>;

  // Escribe `tasks_taken` y/o `tasks_finished` de una estancia. Lo que no se
  // pasa no se toca.
  saveStayCounters(stayId: string, counters: { taken?: number; finished?: number }): Promise<void>;
}
