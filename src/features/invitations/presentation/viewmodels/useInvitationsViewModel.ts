import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { isOpen, Project } from "@/src/features/projects/domain/entities/Project";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { answerable, ProjectInvitation } from "../../domain/entities/ProjectInvitation";
import { InvitationRepository } from "../../domain/repositories/InvitationRepository";

// Una invitación junto al proyecto al que invita (para su título y su dueño).
export interface InvitationItem {
  invitation: ProjectInvitation;
  project: Project;
}

// Las invitaciones pendientes de la persona (C6) y su respuesta. Solo se
// listan las que se pueden responder: proyecto abierto y donde aún no colabora.
//
// Aceptar cruza features y lo orquesta este view model: comprobar que el
// proyecto sigue abierto (C) → miembro (D) → invitación aceptada (C) → cancelar
// la solicitud que sobra (A, sin tumbar la operación si falla).
export function useInvitationsViewModel() {
  const invitations = useInject<InvitationRepository>(TOKENS.InvitationRepo);
  const projects = useInject<ProjectRepository>(TOKENS.ProjectRepo);
  const members = useInject<MembersRepository>(TOKENS.MembersRepo);
  const requests = useInject<JoinRequestRepository>(TOKENS.JoinRequestRepo);
  const { user, hasAccount } = useSession();
  const show = useSnackbar();
  const userId = hasAccount ? (user?.userId ?? null) : null;

  const [items, setItems] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(userId !== null);
  const [error, setError] = useState<string | null>(null);
  // La invitación que se está respondiendo (para bloquear sus botones).
  const [busyId, setBusyId] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [pending, mine] = await Promise.all([invitations.pendingFor(userId), projects.getProjectsOfPerson(userId)]);
        const invited = await projects.getProjects(pending.map((i) => i.projectId));
        if (cancelled) return;
        const byId = new Map(invited.map((p) => [p.id, p]));
        const open = new Set(invited.filter(isOpen).map((p) => p.id));
        const shown = answerable(pending, open, new Set(mine.map((p) => p.id)));
        setItems(shown.map((invitation) => ({ invitation, project: byId.get(invitation.projectId)! })));
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
  }, [invitations, projects, userId, version]);

  const drop = (id: string) => setItems((current) => current.filter((i) => i.invitation.id !== id));

  // Acepta. Devuelve el proyecto al que entró, o null (ya avisó por qué).
  const accept = async ({ invitation }: InvitationItem): Promise<Project | null> => {
    if (!userId || busyId) return null;
    if (invitation.userId !== userId) {
      show("Esta invitación no es para tu cuenta.", { error: true });
      return null;
    }
    setBusyId(invitation.id);
    try {
      // Se lee de nuevo: pudo cerrarse mientras la lista estaba abierta.
      const project = await projects.getProject(invitation.projectId);
      if (!project || !isOpen(project)) {
        drop(invitation.id);
        show("Este proyecto ya está cerrado: no recibe invitaciones.", { error: true });
        return null;
      }
      await members.addMember({ projectId: project.id, userId });
      await invitations.accept(invitation.id);
      // Ya es miembro: si se había postulado, la solicitud sobra.
      await requests.cancelPending({ projectId: project.id, userId, cancelledBy: userId }).catch(() => 0);
      drop(invitation.id);
      show(`Ahora colaboras en «${project.title}».`);
      return project;
    } catch (e) {
      show(messageOf(e), { error: true });
      return null;
    } finally {
      setBusyId(null);
    }
  };

  // Rechaza. `true` si quedó rechazada. No toca la membresía.
  const decline = async ({ invitation, project }: InvitationItem): Promise<boolean> => {
    if (!userId || busyId) return false;
    setBusyId(invitation.id);
    try {
      await invitations.decline(invitation.id);
      drop(invitation.id);
      show(`Rechazaste la invitación a «${project.title}».`);
      return true;
    } catch (e) {
      show(messageOf(e), { error: true });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const needsAccount = userId === null;
  return {
    needsAccount,
    items: needsAccount ? [] : items,
    loading: needsAccount ? false : loading,
    error: needsAccount ? null : error,
    busyId,
    reload,
    accept,
    decline,
  };
}
