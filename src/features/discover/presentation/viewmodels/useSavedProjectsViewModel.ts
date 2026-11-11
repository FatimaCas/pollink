import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { DiscoverProject } from "../../domain/entities/DiscoverProject";
import { DiscoverRepository } from "../../domain/repositories/DiscoverRepository";

// «Guardados»: los proyectos que la persona marcó, el más reciente primero.
// Quitar uno lo saca al instante y lo devuelve si el servidor falla.
export function useSavedProjectsViewModel() {
  const repo = useInject<DiscoverRepository>(TOKENS.DiscoverRepo);
  const session = useSession();
  const snackbar = useSnackbar();
  const userId = session.user?.userId ?? null;

  const [projects, setProjects] = useState<DiscoverProject[]>([]);
  const [loading, setLoading] = useState(userId != null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const loaded = await repo.savedProjects(userId);
        if (cancelled) return;
        setProjects(loaded);
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

  const unsave = useCallback(
    async (project: DiscoverProject) => {
      const me = session.currentUser()?.userId;
      if (!me) return;
      setProjects((current) => current.filter((p) => p.id !== project.id));
      try {
        await repo.unsave({ userId: me, projectId: project.id });
      } catch (e) {
        snackbar(messageOf(e), { error: true });
        setVersion((v) => v + 1);
      }
    },
    [repo, session, snackbar],
  );

  // Sin sesión no hay guardados: ni se carga ni se espera.
  return { projects: userId ? projects : [], loading: userId ? loading : false, error: userId ? error : null, reload, unsave };
}
