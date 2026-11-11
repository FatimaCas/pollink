import { useEffect, useMemo, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { isOpen, Project } from "@/src/features/projects/domain/entities/Project";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";

export type ProjectFilter = "all" | "inProgress" | "finished";

// La sección «Proyectos» del perfil: en qué anda `userId`, con el filtro del
// Figma («Todo (n)», «En desarrollo», «Finalizados»). «En desarrollo» son los
// abiertos y «Finalizados» los cerrados.
export function useProfileProjectsViewModel(userId: string) {
  const repo = useInject<ProjectRepository>(TOKENS.ProjectRepo);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [version, setVersion] = useState(0);

  const reload = () => {
    setLoading(true);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await repo.getProjectsOfPerson(userId);
        if (cancelled) return;
        setProjects(found);
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

  const shown = useMemo(() => {
    if (filter === "inProgress") return projects.filter(isOpen);
    if (filter === "finished") return projects.filter((p) => !isOpen(p));
    return projects;
  }, [projects, filter]);

  return { projects: shown, total: projects.length, filter, setFilter, loading, error, reload };
}
