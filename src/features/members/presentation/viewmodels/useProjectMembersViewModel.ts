import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import { isOwner, ProjectMember } from "../../domain/entities/ProjectMember";
import { MembersRepository } from "../../domain/repositories/MembersRepository";
import { usePeopleNames } from "../hooks/usePeopleNames";

// Estado de la pestaña Miembros: quienes están hoy en el proyecto (el creador
// primero). Los nombres vienen del directorio de B; uno mismo es «Tú» y, mientras
// llega un nombre, «Otra persona».
export function useProjectMembersViewModel(projectId: string) {
  const repo = useInject<MembersRepository>(TOKENS.MembersRepo);
  const tasks = useInject<TaskRepository>(TOKENS.TaskRepo);
  const profiles = useInject<ProfileRepository>(TOKENS.ProfileRepo);
  const { currentUser } = useSession();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  // Carrera por `userId`. Si un perfil no carga, esa persona queda sin carrera.
  const [careers, setCareers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await repo.activeMembers(projectId);
        if (cancelled) return;
        setMembers(loaded);
        setError(null);
        const results = await Promise.allSettled(loaded.map((m) => profiles.getProfileOf(m.userId)));
        if (cancelled) return;
        const found: Record<string, string> = {};
        results.forEach((r, i) => {
          const program = r.status === "fulfilled" ? r.value.career.program.trim() : "";
          if (program) found[loaded[i].userId] = program;
        });
        setCareers(found);
      } catch (e) {
        if (!cancelled) setError(messageOf(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, profiles, projectId, version]);

  const userId = currentUser()?.userId ?? null;
  const me = members.find((m) => m.userId === userId);
  const iAmCreator = !!me && isOwner(me);
  // Salir: quien está en el proyecto y no es el creador. Quitar: solo el
  // creador, a cualquiera menos a sí mismo (el dominio vuelve a validarlo).
  const canLeave = !!me && !iAmCreator;
  const canRemove = (member: ProjectMember) => iAmCreator && member.userId !== userId && !isOwner(member);

  // Ya fuera, libera sus tareas sin terminar. Es limpieza: si falla, la
  // persona ya salió y las tareas siguen reservadas hasta que alguien las suelte.
  const releaseTasksOf = async (memberId: string) => {
    try {
      await tasks.releaseUnfinishedTasks({ projectId, userId: memberId });
    } catch {
      /* limpieza best-effort */
    }
  };

  // Devuelven null si salió bien o el mensaje de error.
  const leave = async (): Promise<string | null> => {
    if (!userId || !canLeave) return "No puedes salir de este proyecto.";
    try {
      await repo.leave({ projectId, userId });
    } catch (e) {
      return messageOf(e);
    }
    await releaseTasksOf(userId);
    return null;
  };

  const remove = async (member: ProjectMember): Promise<string | null> => {
    if (!userId || !canRemove(member)) return "No puedes quitar a esta persona.";
    try {
      await repo.remove({ projectId, memberUserId: member.userId, requestedBy: userId });
    } catch (e) {
      return messageOf(e);
    }
    await releaseTasksOf(member.userId);
    setMembers((current) => current.filter((m) => m.userId !== member.userId));
    return null;
  };
  const nameFromDirectory = usePeopleNames(members.map((m) => m.userId));
  const nameOf = (member: ProjectMember) =>
    member.userId === userId ? "Tú" : (nameFromDirectory(member.userId) ?? "Otra persona");

  const careerOf = (member: ProjectMember): string | null => careers[member.userId] ?? null;

  return { members, loading, error, reload, userId, nameOf, careerOf, canLeave, canRemove, leave, remove };
}
