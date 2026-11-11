import { registerAuth } from "@/src/features/auth/di";
import { registerDiscover } from "@/src/features/discover/di";
import { registerInvitations } from "@/src/features/invitations/di";
import { registerMembers } from "@/src/features/members/di";
import { registerProfile } from "@/src/features/profile/di";
import { registerProjects } from "@/src/features/projects/di";
import { registerRequests } from "@/src/features/requests/di";
import { registerTasks } from "@/src/features/tasks/di";
import { registerTrust } from "@/src/features/trust/di";
import { robleConfig } from "../roble/robleConfig";
import { RobleClient } from "../roble/RobleClient";
import { Container } from "./container";
import { TOKENS } from "./tokens";

// Raíz de composición: el único sitio que arma la app con Roble. Cada feature
// registra lo suyo en su `di.ts`; este archivo no cambia al implementar una.
export function createAppContainer(): Container {
  // Un solo cliente para toda la app: uno por pantalla daría a cada copia su propia sesión.
  const client = new RobleClient(robleConfig);
  const c = new Container().register(TOKENS.RobleClient, client);

  registerAuth(c, client);
  registerDiscover(c, client);
  registerRequests(c, client);
  registerProfile(c, client);
  registerTrust(c, client);
  registerProjects(c, client);
  registerInvitations(c, client);
  registerMembers(c, client);
  registerTasks(c, client);
  return c;
}
