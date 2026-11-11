import { JoinRequest } from "../entities/JoinRequest";

// El contrato de las solicitudes de unión. Los errores llegan como
// `RequestsFailure`. Aceptar una solicitud agrega a la persona como miembro: eso
// lo orquesta el view model con `MembersRepository.addMember`; este repositorio
// solo escribe la solicitud.
export interface JoinRequestRepository {
  // Crea una solicitud pendiente. Falla si el proyecto está cerrado o si ya hay
  // una pendiente de esa persona en ese proyecto. Que ya sea miembro lo revisa
  // quien llama (es del repositorio de miembros).
  apply(params: { projectId: string; userId: string }): Promise<JoinRequest>;

  // Las solicitudes de un proyecto, las pendientes primero y dentro de cada
  // grupo la más reciente arriba.
  requestsForProject(projectId: string): Promise<JoinRequest[]>;

  // Cuántas pendientes tiene el proyecto (el «(5) Solicitudes» de la tarjeta).
  pendingCount(projectId: string): Promise<number>;

  // Una solicitud por id, o `null`.
  requestById(requestId: string): Promise<JoinRequest | null>;

  // Comprueba que la solicitud se puede aceptar (existe, sigue pendiente y el
  // proyecto sigue abierto) y la devuelve. Va antes de agregar al miembro, para
  // no dejar a alguien dentro con la solicitud sin resolver.
  ensureAcceptable(requestId: string): Promise<JoinRequest>;

  // Marca la solicitud como aceptada o rechazada, con quien la resolvió. Solo
  // se resuelve una pendiente, y solo el creador del proyecto; aceptar exige
  // que el proyecto siga abierto.
  decide(params: { requestId: string; accepted: boolean; reviewerId: string }): Promise<JoinRequest>;

  // Cancela las pendientes de la persona en el proyecto (ya es miembro: lo demás
  // que tuviera abierto sobra). Devuelve cuántas canceló.
  cancelPending(params: { projectId: string; userId: string; cancelledBy: string }): Promise<number>;
}
