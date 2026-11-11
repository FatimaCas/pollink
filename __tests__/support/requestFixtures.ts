import { JoinRequest } from "@/src/features/requests/domain/entities/JoinRequest";

// Una solicitud de prueba; cada prueba cambia solo lo que le importa.
export function joinRequest(overrides: Partial<JoinRequest> = {}): JoinRequest {
  return {
    id: "r1",
    userId: "u_ana",
    projectId: "p1",
    state: "pending",
    createdAt: new Date(2026, 10, 9),
    updatedAt: new Date(2026, 10, 9),
    reviewedBy: null,
    ...overrides,
  };
}
