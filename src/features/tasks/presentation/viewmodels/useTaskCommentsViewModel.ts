import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { usePeopleNames } from "@/src/features/members/presentation/hooks/usePeopleNames";
import { ProjectTask } from "../../domain/entities/ProjectTask";
import { TaskComment } from "../../domain/entities/TaskComment";
import { TaskRepository } from "../../domain/repositories/TaskRepository";

// Comentarios de una tarea: la lista (del más nuevo al más viejo) y enviar uno.
// Cualquiera con acceso al proyecto puede comentar. Recarga cuando cambia la
// fecha límite, porque el repositorio deja ahí un comentario de aviso.
export function useTaskCommentsViewModel(task: ProjectTask | null) {
  const repo = useInject<TaskRepository>(TOKENS.TaskRepo);
  const { currentUser } = useSession();

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [version, setVersion] = useState(0);
  // Reintentar vuelve a mostrar la espera hasta que responda.
  const reload = useCallback(() => {
    setLoaded(false);
    setVersion((v) => v + 1);
  }, []);

  const userId = currentUser()?.userId ?? null;
  const deadlineKey = task?.deadline?.getTime() ?? null;

  useEffect(() => {
    if (!task) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await repo.getComments(task);
        if (cancelled) return;
        setComments(rows);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(messageOf(e));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `task` se identifica por su id y su fecha límite, no por referencia: el
    // detalle lo reemplaza al guardar y no hay que recargar por eso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, task?.id, deadlineKey, version]);

  // Los nombres vienen del directorio de B; uno mismo es «Tú» y, mientras llega
  // un nombre, «Otra persona».
  const nameFromDirectory = usePeopleNames(comments.map((c) => c.userId));
  const authorOf = (comment: TaskComment) =>
    comment.userId === userId ? "Tú" : (nameFromDirectory(comment.userId) ?? "Otra persona");

  // Guarda el comentario. Devuelve null si se guardó o el mensaje de error
  // (la pantalla decide si limpia la caja).
  const send = async (body: string): Promise<string | null> => {
    const clean = body.trim();
    if (!task || !userId) return "Inicia sesión para comentar.";
    if (clean === "") return "Escribe algo para comentar.";
    setSending(true);
    try {
      const created = await repo.addComment({ task, userId, body: clean });
      setComments((current) => [created, ...current]);
      return null;
    } catch (e) {
      return messageOf(e);
    } finally {
      setSending(false);
    }
  };

  return { comments, loaded, error, sending, authorOf, send, reload };
}
