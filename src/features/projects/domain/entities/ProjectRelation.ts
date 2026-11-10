import { Project } from "./Project";

// Cómo se relaciona una persona con un proyecto, con una sola respuesta.
//
// Una persona puede tener a la vez un guardado (A), una solicitud (A), una
// invitación (C) y una estancia (D) en el mismo proyecto. Para que ninguna
// pantalla lo calcule por su cuenta, la relación es la primera que se cumpla en
// este orden: owner > active > invited > pending > saved > none.
export type ProjectRelation =
  | "owner" // creó el proyecto
  | "active" // colabora hoy (estancia activa en `project_member`)
  | "invited" // tiene una invitación pendiente sin responder
  | "pending" // se postuló y espera la decisión del creador
  | "saved" // solo lo guardó
  | "none"; // nada: puede guardar y postularse (también quien salió o lo sacaron)

// Lo que se sabe de la persona frente al proyecto. Cada dato sale del
// repositorio de su feature; quien llama los junta.
export interface RelationFacts {
  userId: string | null;
  isActiveMember: boolean;
  hasPendingInvitation: boolean;
  hasPendingRequest: boolean;
  isSaved: boolean;
}

export function relationOf(project: Project, facts: RelationFacts): ProjectRelation {
  if (facts.userId && project.ownerId === facts.userId) return "owner";
  if (facts.isActiveMember) return "active";
  if (facts.hasPendingInvitation) return "invited";
  if (facts.hasPendingRequest) return "pending";
  if (facts.isSaved) return "saved";
  return "none";
}
