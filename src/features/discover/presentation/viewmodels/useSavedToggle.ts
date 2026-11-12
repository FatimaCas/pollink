import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { DiscoverProject } from "../../domain/entities/DiscoverProject";
import { DiscoverRepository } from "../../domain/repositories/DiscoverRepository";

// El marcador de las tarjetas (Descubrir y Explorar): qué proyectos guardó la
// persona y el cambio optimista al tocarlo, que se deshace si falla.
export function useSavedToggle() {
  const repo = useInject<DiscoverRepository>(TOKENS.DiscoverRepo);
  const session = useSession();
  const snackbar = useSnackbar();
  const userId = session.user?.userId ?? null;
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    repo
      .savedIds(userId)
      .then((ids) => !cancelled && setSavedIds(new Set(ids)))
      .catch(() => !cancelled && setSavedIds(new Set()));
    return () => {
      cancelled = true;
    };
  }, [repo, userId]);

  // Guardar no pide cuenta: a quien no tiene sesión se le abre una de invitado.
  const toggleSaved = useCallback(
    async (project: DiscoverProject) => {
      if (!(await session.ensureWritableSession())) return;
      const me = session.currentUser()?.userId;
      if (!me) return;
      const wasSaved = savedIds.has(project.id);
      const flip = (on: boolean) =>
        setSavedIds((current) => {
          const next = new Set(current);
          if (on) next.add(project.id);
          else next.delete(project.id);
          return next;
        });
      flip(!wasSaved);
      try {
        if (wasSaved) await repo.unsave({ userId: me, projectId: project.id });
        else await repo.save({ userId: me, projectId: project.id });
      } catch (e) {
        flip(wasSaved);
        snackbar(messageOf(e), { error: true });
      }
    },
    [repo, session, savedIds, snackbar],
  );

  return { savedIds, toggleSaved };
}
