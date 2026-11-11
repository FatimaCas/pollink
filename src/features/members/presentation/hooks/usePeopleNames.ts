import { useEffect, useReducer } from "react";

import { usePeopleDirectory } from "@/src/features/profile/presentation/hooks/usePeopleDirectory";

// Los nombres de una lista de personas, del directorio de B. Precarga todos de
// una vez y vuelve a pintar cuando llegan; mientras tanto `nameOf` da `null`.
// Para un solo nombre basta `usePersonName`.
export function usePeopleNames(userIds: readonly string[]): (userId: string) => string | null {
  const directory = usePeopleDirectory();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => directory.subscribe(rerender), [directory]);

  const key = [...new Set(userIds)].sort().join(",");
  useEffect(() => {
    if (key) void directory.preload(key.split(","));
  }, [directory, key]);

  return (userId) => directory.nameOf(userId);
}
