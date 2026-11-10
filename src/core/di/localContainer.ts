import { registerAuthLocal } from "@/src/features/auth/di";
import { registerDiscoverLocal } from "@/src/features/discover/di";
import { registerInvitationsLocal } from "@/src/features/invitations/di";
import { registerMembersLocal } from "@/src/features/members/di";
import { registerProfileLocal } from "@/src/features/profile/di";
import { registerProjectsLocal } from "@/src/features/projects/di";
import { registerRequestsLocal } from "@/src/features/requests/di";
import { registerTasksLocal } from "@/src/features/tasks/di";
import { registerTrustLocal } from "@/src/features/trust/di";
import { DummyData } from "../data/dummyData";
import { Container } from "./container";

// Los mismos repositorios, con los datasources de memoria. Es lo que usa la
// prueba de integración y sirve para trabajar en la UI sin servidor
// (`EXPO_PUBLIC_DATA_SOURCE=local`). Que solo cambie el datasource es la prueba
// de que la separación vale. Cada feature registra lo suyo en su `di.ts`.
export function createLocalContainer(data: DummyData = new DummyData()): Container {
  const c = new Container();
  registerAuthLocal(c, data);
  registerDiscoverLocal(c, data);
  registerRequestsLocal(c, data);
  registerProfileLocal(c, data);
  registerTrustLocal(c, data);
  registerProjectsLocal(c, data);
  registerInvitationsLocal(c, data);
  registerMembersLocal(c, data);
  registerTasksLocal(c, data);
  return c;
}
