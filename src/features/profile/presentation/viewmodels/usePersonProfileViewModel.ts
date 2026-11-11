import { useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { UserProfile } from "../../domain/entities/UserProfile";
import { ProfileRepository } from "../../domain/repositories/ProfileRepository";

// El perfil de otra persona, de solo lectura (B7). Sin fila de perfil, uno
// vacío: la pantalla pone un nombre genérico.
export function usePersonProfileViewModel(userId: string) {
  const repo = useInject<ProfileRepository>(TOKENS.ProfileRepo);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = () => {
    setLoading(true);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await repo.getProfileOf(userId);
        if (cancelled) return;
        setProfile(found);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(messageOf(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, userId, version]);

  return { profile, loading, error, reload };
}
