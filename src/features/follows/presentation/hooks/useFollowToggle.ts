import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { FollowRepository } from "../../domain/repositories/FollowRepository";

// «Seguir» / «Siguiendo» de una persona. Cambia al instante y vuelve atrás si
// el servidor rechaza. Un invitado ve el botón, pero al tocarlo se le pide iniciar sesión.
// `userIds`: a quién se puede seguir desde esta pantalla (uno o varios).
export function useFollowToggle(userIds: string[]) {
  const repo = useInject<FollowRepository>(TOKENS.FollowRepo);
  const { currentUser, ensureLoggedIn } = useSession();
  const me = currentUser();
  const myId = me && !me.isAnonymous ? me.userId : null;

  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Sube cuando termina una escritura: las pantallas lo usan para releer contadores.
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    repo
      .followingIds(myId)
      .then((ids) => !cancelled && setFollowing(new Set(ids)))
      // Sin la lista el botón queda en «Seguir»; no se rompe la pantalla.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, myId, userIds.join(",")]);

  const isFollowing = (userId: string) => !!myId && following.has(userId);

  const toggle = useCallback(
    async (userId: string) => {
      if (!ensureLoggedIn() || !myId) return;
      const was = following.has(userId);
      const set = (value: boolean) =>
        setFollowing((current) => {
          const next = new Set(current);
          if (value) next.add(userId);
          else next.delete(userId);
          return next;
        });
      set(!was);
      setError(null);
      try {
        if (was) await repo.unfollow({ followerId: myId, followedId: userId });
        else await repo.follow({ followerId: myId, followedId: userId });
      } catch (e) {
        set(was);
        setError(messageOf(e));
      } finally {
        setSettled((n) => n + 1);
      }
    },
    [repo, myId, following, ensureLoggedIn],
  );

  return { isFollowing, toggle, error, settled };
}
