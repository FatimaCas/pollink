import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { systemClock } from "@/src/core/utils/clock";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { isOwner } from "@/src/features/members/domain/entities/ProjectMember";
import { isDone, isOverdueAt, ProjectTask } from "../../domain/entities/ProjectTask";
import { Subtask } from "../../domain/entities/Subtask";
import { TaskDeadline } from "../../domain/entities/TaskDeadline";
import { TaskRepository } from "../../domain/repositories/TaskRepository";
import { parseDeadlineInput } from "../utils/parseDeadlineInput";

// Estado y acciones de una tarea: descripción y checklist (un borrador que se
// guarda de una vez) y la fecha límite (se guarda al instante).
export function useTaskDetailViewModel(projectId: string, taskId: string) {
  const repo = useInject<TaskRepository>(TOKENS.TaskRepo);
  const members = useInject<MembersRepository>(TOKENS.MembersRepo);
  const { currentUser } = useSession();
  const show = useSnackbar();

  const [task, setTask] = useState<ProjectTask | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // El borrador: lo que la persona está editando, sin guardar todavía.
  const [description, setDescription] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tasks, active] = await Promise.all([repo.getTasks(projectId), members.activeMembers(projectId)]);
        if (cancelled) return;
        const found = tasks.find((t) => t.id === taskId) ?? null;
        if (!found) {
          setError("La tarea ya no existe.");
          return;
        }
        setTask(found);
        setDescription(found.description);
        setSubtasks(found.subtasks);
        setOwnerId(active.find(isOwner)?.userId ?? null);
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
  }, [repo, members, projectId, taskId, version]);

  const userId = currentUser()?.userId ?? null;
  // Solo quien reservó la tarea trabaja en ella (descripción y checklist).
  const canWork = task !== null && userId !== null && task.assigneeId === userId;
  const canEditDeadline =
    task !== null && userId !== null && ownerId !== null && TaskDeadline.canEdit({ task, userId, projectOwnerId: ownerId });
  const dirty =
    task !== null &&
    (description !== task.description ||
      subtasks.length !== task.subtasks.length ||
      subtasks.some((s, i) => s.title !== task.subtasks[i].title || s.done !== task.subtasks[i].done));
  const overdue = task !== null && isOverdueAt(task, systemClock());

  const addSubtask = (title: string) => {
    const clean = title.trim();
    if (clean === "") return;
    setSubtasks((current) => [...current, { title: clean, done: false }]);
  };
  const toggleSubtask = (index: number) =>
    setSubtasks((current) => current.map((s, i) => (i === index ? { ...s, done: !s.done } : s)));
  const removeSubtask = (index: number) => setSubtasks((current) => current.filter((_, i) => i !== index));

  // Guarda el borrador. Si todas las subtareas quedaron hechas, la tarea queda
  // terminada (lo decide el dominio); se avisa para que no sorprenda.
  const save = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const updated = await repo.saveTaskProgress({ task, description: description.trim(), subtasks });
      setTask(updated);
      setDescription(updated.description);
      setSubtasks(updated.subtasks);
      show(!isDone(task) && isDone(updated) ? "Tarea terminada." : "Cambios guardados.");
    } catch (e) {
      show(messageOf(e), { error: true });
    } finally {
      setSaving(false);
    }
  };

  // Cambia o quita la fecha límite; `text` vacío la quita. `true` si se guardó.
  const saveDeadline = async (text: string) => {
    if (!task || !userId) return false;
    let deadline: Date | null;
    try {
      deadline = parseDeadlineInput(text, systemClock());
    } catch (e) {
      show(messageOf(e), { error: true });
      return false;
    }
    try {
      setTask(await repo.updateTaskDeadline({ task, deadline, userId }));
      return true;
    } catch (e) {
      show(messageOf(e), { error: true });
      return false;
    }
  };

  return {
    task,
    loading,
    error,
    saving,
    description,
    subtasks,
    canWork,
    canEditDeadline,
    dirty,
    overdue,
    setDescription,
    addSubtask,
    toggleSubtask,
    removeSubtask,
    save,
    saveDeadline,
    reload,
  };
}
