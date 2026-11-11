import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProjectInvitation } from "@/src/features/invitations/domain/entities/ProjectInvitation";
import { isPending as isPendingRequest, JoinRequest } from "@/src/features/requests/domain/entities/JoinRequest";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { isOpen, Project } from "../../domain/entities/Project";
import { ProjectRelation, relationOf } from "../../domain/entities/ProjectRelation";
import { ProjectRepository } from "../../domain/repositories/ProjectRepository";

// El detalle público de un proyecto (C4): lo que se ve desde Descubrir o desde
// Guardados. Junta el proyecto (C) con la relación de la persona: si es su
// creador o miembro (D), si tiene una invitación (C), una solicitud (A) o lo
// guardó (A).
export function useProjectDetailViewModel(projectId: string) {
  const projects = useInject<ProjectRepository>(TOKENS.ProjectRepo);
  const members = useInject<MembersRepository>(TOKENS.MembersRepo);
  const invitations = useInject<InvitationRepository>(TOKENS.InvitationRepo);
  const requests = useInject<JoinRequestRepository>(TOKENS.JoinRequestRepo);
  const discover = useInject<DiscoverRepository>(TOKENS.DiscoverRepo);
  const { user, hasAccount, currentUser, ensureWritableSession } = useSession();
  const show = useSnackbar();
  const userId = user?.userId ?? null;

  const [project, setProject] = useState<Project | null>(null);
  const [relation, setRelation] = useState<ProjectRelation>("none");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await projects.getProject(projectId);
        if (cancelled) return;
        if (!found) {
          setProject(null);
          setError("Este proyecto ya no existe.");
          return;
        }
        // Los datos de la relación son secundarios: si alguno no se puede leer
        // (p. ej. un invitado no lee `project_member`), cuenta como «no».
        const account = hasAccount && userId ? userId : null;
        const none = async <T,>(): Promise<T[]> => [];
        const [memberIds, myInvitations, projectRequests, savedIds] = await Promise.all([
          account ? members.activeMemberIds(projectId).catch(none<string>) : none<string>(),
          account ? invitations.pendingFor(account).catch(none<ProjectInvitation>) : none<ProjectInvitation>(),
          account ? requests.requestsForProject(projectId).catch(none<JoinRequest>) : none<JoinRequest>(),
          userId ? discover.savedIds(userId).catch(none<string>) : none<string>(),
        ]);
        if (cancelled) return;
        const isSaved = savedIds.includes(projectId);
        setProject(found);
        setSaved(isSaved);
        setRelation(
          relationOf(found, {
            userId,
            isActiveMember: !!account && memberIds.includes(account),
            // Un proyecto cerrado no recibe invitaciones: no hay nada que responder.
            hasPendingInvitation: isOpen(found) && myInvitations.some((i) => i.projectId === projectId),
            hasPendingRequest: projectRequests.some((r) => r.userId === account && isPendingRequest(r)),
            isSaved,
          }),
        );
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
  }, [projects, members, invitations, requests, discover, projectId, userId, hasAccount, version]);

  // Guarda o quita de guardados al instante; si falla, vuelve atrás. Sin
  // sesión abre una de invitado (guardar no pide cuenta).
  const toggleSaved = async () => {
    if (!(await ensureWritableSession())) return;
    const me = currentUser();
    if (!me) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await discover.save({ userId: me.userId, projectId });
      else await discover.unsave({ userId: me.userId, projectId });
    } catch (e) {
      setSaved(!next);
      show(messageOf(e), { error: true });
    }
  };

  return { project, relation, saved, loading, error, reload, toggleSaved };
}
