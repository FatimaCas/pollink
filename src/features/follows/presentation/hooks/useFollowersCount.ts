import { useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { FollowRepository } from "../../domain/repositories/FollowRepository";

// Cuánta gente sigue a `userId`. Se vuelve a pedir cuando cambia `refreshKey`
// (p. ej. al seguir o dejar de seguir). Si falla, no hay contador.
export function useFollowersCount(userId: string, refreshKey: unknown = null): number | null {
  const repo = useInject<FollowRepository>(TOKENS.FollowRepo);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    repo
      .followersCount(userId)
      .then((n) => !cancelled && setCount(n))
      .catch(() => !cancelled && setCount(null));
    return () => {
      cancelled = true;
    };
  }, [repo, userId, refreshKey]);

  return count;
}
