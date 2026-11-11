import { useEffect, useSyncExternalStore } from "react";

import { usePeopleDirectory } from "./usePeopleDirectory";

// El nombre de `userId`, o `fallback` mientras llega (o si no tiene perfil).
// Pide el nombre al montarse y vuelve a pintar cuando llega.
export function usePersonName(userId: string, fallback = "Otra persona"): string {
  const directory = usePeopleDirectory();
  const name = useSyncExternalStore(
    directory.subscribe,
    () => directory.nameOf(userId),
    () => null,
  );

  useEffect(() => {
    if (userId) void directory.preload([userId]);
  }, [directory, userId]);

  return name ?? fallback;
}
