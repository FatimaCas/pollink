import { useEffect, useMemo } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { ProfileRepository } from "../../domain/repositories/ProfileRepository";
import { PeopleDirectoryStore } from "../viewmodels/PeopleDirectoryStore";

// Un directorio por repositorio de perfil: así hay uno solo en toda la app y,
// en las pruebas, cada contenedor con sus falsos tiene el suyo.
const stores = new WeakMap<ProfileRepository, PeopleDirectoryStore>();

// El directorio de personas de la sesión. Para precargar los nombres de una
// lista de una vez: `usePeopleDirectory().preload(ids)`.
export function usePeopleDirectory(): PeopleDirectoryStore {
  const profiles = useInject<ProfileRepository>(TOKENS.ProfileRepo);
  const userId = useSession().user?.userId ?? null;

  const store = useMemo(() => {
    let existing = stores.get(profiles);
    if (!existing) {
      existing = new PeopleDirectoryStore(profiles);
      stores.set(profiles, existing);
    }
    return existing;
  }, [profiles]);

  // Al entrar otra persona (o salir), se olvidan los nombres de la anterior.
  useEffect(() => {
    store.bindUser(userId);
  }, [store, userId]);

  return store;
}
