import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { academicInfo, isProfileComplete, UserProfile } from "../../domain/entities/UserProfile";
import { ProfileRepository } from "../../domain/repositories/ProfileRepository";

// La pestaña Perfil (B2): el perfil de la sesión. Al entrar garantiza que la
// persona tenga fila en `profile` (así quien la revise después la encuentra) y
// luego la lee. Sin cuenta (sin sesión o invitado) no hay nada que leer: la
// pantalla muestra el aviso para crear una.
export function useMyProfileViewModel() {
  const repo = useInject<ProfileRepository>(TOKENS.ProfileRepo);
  const { user, hasAccount, isGuest, ensureLoggedIn } = useSession();
  const userId = hasAccount ? (user?.userId ?? null) : null;
  const name = user?.name ?? "";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(userId !== null);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => {
    setLoading(true);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        await repo.ensureMyProfile(name);
        const mine = await repo.getMyProfile();
        if (cancelled) return;
        setProfile(mine);
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
  }, [repo, userId, name, version]);

  const needsAccount = userId === null;
  // Lo leído con otra cuenta no se muestra a quien ya no la tiene.
  const shown = needsAccount ? null : profile;
  return {
    needsAccount,
    isGuest,
    // Nombre de la sesión: respaldo si la fila de perfil no trae el suyo.
    sessionName: name,
    profile: shown,
    loading: needsAccount ? false : loading,
    error: needsAccount ? null : error,
    // «Completa tu perfil»: falta la carrera o alguna habilidad.
    incomplete: shown !== null && !isProfileComplete(shown),
    academicInfo: shown ? academicInfo(shown) : "",
    reload,
    signIn: ensureLoggedIn,
  };
}
