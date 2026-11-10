import { useCallback, useEffect, useMemo, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { systemClock } from "@/src/core/utils/clock";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { ProjectTask } from "../../domain/entities/ProjectTask";
import { TaskStatus } from "../../domain/entities/TaskStatus";
import { TaskRepository } from "../../domain/repositories/TaskRepository";
import { parseDeadlineInput } from "../utils/parseDeadlineInput";

// Estado y acciones del tablero de un proyecto: las tareas agrupadas por
// estado, crear una tarea y reservarla.
export function useTaskBoardViewModel(projectId: string) {
  const repo = useInject<TaskRepository>(TOKENS.TaskRepo);
  const { currentUser, ensureLoggedIn } = useSession();
  const show = useSnackbar();

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Cada vez que `version` cambia se vuelve a pedir el tablero (reintentar, o
  // ver quién se adelantó al reservar).
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await repo.getTasks(projectId);
        if (cancelled) return;
        setTasks(loaded);
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
  }, [repo, projectId, version]);

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, ProjectTask[]> = { todo: [], doing: [], done: [] };
    for (const task of tasks) groups[task.status].push(task);
    return groups;
  }, [tasks]);

  const replace = (updated: ProjectTask) =>
    setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));

  // Crea la tarea; `deadlineText` es lo que se escribió («dd/mm/aaaa» o vacío).
  // Responde `true` si se creó (la hoja se cierra) y `false` si no (se queda
  // abierta con el aviso).
  const createTask = async (params: { title: string; description: string; deadlineText: string }) => {
    const title = params.title.trim();
    if (title === "") {
      show("Ponle un título a la tarea.", { error: true });
      return false;
    }
    let deadline: Date | null;
    try {
      deadline = parseDeadlineInput(params.deadlineText, systemClock());
    } catch (e) {
      show(messageOf(e), { error: true });
      return false;
    }
    if (!ensureLoggedIn()) return false;
    setCreating(true);
    try {
      const created = await repo.createTask({
        projectId,
        title,
        description: params.description.trim() || undefined,
        deadline,
      });
      setTasks((current) => [...current, created]);
      return true;
    } catch (e) {
      show(messageOf(e), { error: true });
      return false;
    } finally {
      setCreating(false);
    }
  };

  // Reserva la tarea para quien tiene la sesión. Si otra persona se adelantó, el
  // repositorio lo rechaza: se avisa y se recarga el tablero para ver quién la
  // tiene.
  const reserve = async (task: ProjectTask) => {
    if (!ensureLoggedIn()) return;
    const user = currentUser();
    if (!user) return;
    setBusyTaskId(task.id);
    try {
      replace(await repo.reserveTask({ task, userId: user.userId }));
    } catch (e) {
      show(messageOf(e), { error: true });
      reload();
    } finally {
      setBusyTaskId(null);
    }
  };

  return {
    loading,
    error,
    byStatus,
    total: tasks.length,
    busyTaskId,
    creating,
    userId: currentUser()?.userId ?? null,
    reload,
    createTask,
    reserve,
  };
}
