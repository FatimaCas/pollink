import { useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { isOpen, Project } from "@/src/features/projects/domain/entities/Project";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";

// El historial de colaboración de `userId` (B7): todos los proyectos en los
// que tuvo alguna estancia, en cualquier estado, los creados primero. Con
// `onlyPrevious` solo los ya cerrados (la ficha de un aplicante).
export function useCollaborationHistoryViewModel(userId: string, onlyPrevious: boolean) {
  const repo = useInject<ProjectRepository>(TOKENS.ProjectRepo);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = () => {
    setLoading(true);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await repo.getProjectsParticipatedBy(userId);
        if (cancelled) return;
        setProjects(onlyPrevious ? found.filter((p) => !isOpen(p)) : found);
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
  }, [repo, userId, onlyPrevious, version]);

  return { projects, loading, error, reload };
}
