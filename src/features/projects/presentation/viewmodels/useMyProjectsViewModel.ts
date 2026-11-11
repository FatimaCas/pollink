import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { answerable } from "@/src/features/invitations/domain/entities/ProjectInvitation";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { isOpen, Project } from "../../domain/entities/Project";
import { ProjectRepository } from "../../domain/repositories/ProjectRepository";

// La pestaña Proyectos (C3): «Mis proyectos» (los que creó) y «Otros
// proyectos» (en los que colabora hoy). Sin cuenta no hay nada que leer: la
// pantalla muestra el aviso para invitados.
export function useMyProjectsViewModel() {
  const repo = useInject<ProjectRepository>(TOKENS.ProjectRepo);
  const invitations = useInject<InvitationRepository>(TOKENS.InvitationRepo);
  const { user, hasAccount, ensureLoggedIn } = useSession();
  const userId = hasAccount ? (user?.userId ?? null) : null;

  const [owned, setOwned] = useState<Project[]>([]);
  const [joined, setJoined] = useState<Project[]>([]);
  const [loading, setLoading] = useState(userId !== null);
  const [error, setError] = useState<string | null>(null);
  const [invitationCount, setInvitationCount] = useState(0);

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
        // Cuántas invitaciones puede responder (el número junto a
        // «Invitaciones»). Es un aviso: si falla, se muestra sin número.
        try {
          const pending = await invitations.pendingFor(userId);
          const invited = await repo.getProjects(pending.map((i) => i.projectId));
          if (cancelled) return;
          const open = new Set(invited.filter(isOpen).map((p) => p.id));
          setInvitationCount(answerable(pending, open, new Set(all.map((p) => p.id))).length);
        } catch {
          if (!cancelled) setInvitationCount(0);
        }
      } catch (e) {
        if (!cancelled) setError(messageOf(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, invitations, userId, version]);

  const needsAccount = userId === null;
  return {
    needsAccount,
    // Lo leído con otra cuenta no se muestra a quien ya no la tiene.
    owned: needsAccount ? [] : owned,
    joined: needsAccount ? [] : joined,
    loading: needsAccount ? false : loading,
    error: needsAccount ? null : error,
    invitationCount: needsAccount ? 0 : invitationCount,
    reload,
    // Lleva al login (o al registro) a quien no tiene cuenta.
    signIn: ensureLoggedIn,
  };
}
