import { MemberRole } from "./MemberStay";

// Una persona que está en un proyecto ahora mismo (su estancia activa). El
// nombre y la carrera salen del directorio de personas (B), no de aquí.
export interface ProjectMember {
  userId: string;
  role: MemberRole;
  joinedAt: Date | null;
}

export const isOwner = (member: ProjectMember) => member.role === "owner";
