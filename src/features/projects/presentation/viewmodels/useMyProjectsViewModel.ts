import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { Project } from "../../domain/entities/Project";
import { ProjectRepository } from "../../domain/repositories/ProjectRepository";

// La pestaña Proyectos (C3): «Mis proyectos» (los que creó) y «Otros
// proyectos» (en los que colabora hoy). Sin cuenta no hay nada que leer: la
// pantalla muestra el aviso para invitados.
export function useMyProjectsViewModel() {
  const repo = useInject<ProjectRepository>(TOKENS.ProjectRepo);
  const { user, hasAccount, ensureLoggedIn } = useSession();
  const userId = hasAccount ? (user?.userId ?? null) : null;

  const [owned, setOwned] = useState<Project[]>([]);
  const [joined, setJoined] = useState<Project[]>([]);
  const [loading, setLoading] = useState(userId !== null);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    // Sin cuenta no se lee nada; lo que se muestra se calcula abajo.
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        // `getProjectsOfPerson` trae primero los creados: se separan por dueño.
        const all = await repo.getProjectsOfPerson(userId);
        if (cancelled) return;
        setOwned(all.filter((p) => p.ownerId === userId));
        setJoined(all.filter((p) => p.ownerId !== userId));
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

  const needsAccount = userId === null;
  return {
    needsAccount,
    // Lo leído con otra cuenta no se muestra a quien ya no la tiene.
    owned: needsAccount ? [] : owned,
    joined: needsAccount ? [] : joined,
    loading: needsAccount ? false : loading,
    error: needsAccount ? null : error,
    reload,
    // Lleva al login (o al registro) a quien no tiene cuenta.
    signIn: ensureLoggedIn,
  };
}
