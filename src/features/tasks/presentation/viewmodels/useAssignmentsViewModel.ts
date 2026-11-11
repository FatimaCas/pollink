import { useCallback, useEffect, useMemo, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { isOwner, ProjectMember } from "@/src/features/members/domain/entities/ProjectMember";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { usePeopleNames } from "@/src/features/members/presentation/hooks/usePeopleNames";
import { ProjectTask } from "../../domain/entities/ProjectTask";
import { TaskRepository } from "../../domain/repositories/TaskRepository";

// Estado de «Asignaciones»: las tareas del proyecto por persona (en curso y
// terminadas), «Mis tareas» de quien mira y, si es el creador, asignar una tarea
// pendiente a un miembro.
export function useAssignmentsViewModel(projectId: string) {
  const tasksRepo = useInject<TaskRepository>(TOKENS.TaskRepo);
  const membersRepo = useInject<MembersRepository>(TOKENS.MembersRepo);
  const { currentUser } = useSession();
  const userId = currentUser()?.userId ?? null;

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedMembers, loadedTasks] = await Promise.all([
          membersRepo.activeMembers(projectId),
          tasksRepo.getTasks(projectId),
        ]);
        if (cancelled) return;
        setMembers(loadedMembers);
        setTasks(loadedTasks);
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
  }, [membersRepo, tasksRepo, projectId, version]);

  const nameFor = usePeopleNames(members.map((m) => m.userId));
  const nameOf = (id: string) => (id === userId ? "Tú" : (nameFor(id) ?? "Otra persona"));

  const me = members.find((m) => m.userId === userId);
  const canAssign = !!me && isOwner(me);

  // Las tareas con responsable, por persona: en curso y terminadas.
  const sections = useMemo(
    () =>
      members.map((member) => {
        const own = tasks.filter((t) => t.assigneeId === member.userId);
        return {
          member,
          doing: own.filter((t) => t.status === "doing"),
          done: own.filter((t) => t.status === "done"),
        };
      }),
    [members, tasks],
  );
  const mine = sections.find((s) => s.member.userId === userId);
  const pending = useMemo(() => tasks.filter((t) => t.status === "todo" && t.assigneeId === null), [tasks]);

  // Responde `null` si se asignó, o el mensaje de por qué no (y recarga, por si
  // alguien se adelantó).
  const assign = async (task: ProjectTask, assigneeId: string): Promise<string | null> => {
    if (!userId) return "Inicia sesión para asignar tareas.";
    try {
      const updated = await tasksRepo.assignTask({ task, assigneeId, requestedBy: userId });
      setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      return null;
    } catch (e) {
      reload();
      return messageOf(e);
    }
  };

  return { loading, error, reload, userId, nameOf, canAssign, sections, mine, pending, members, assign };
}
