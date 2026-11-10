import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { ProjectMember } from "../../domain/entities/ProjectMember";
import { MembersRepository } from "../../domain/repositories/MembersRepository";

// Estado de la pestaña Miembros: quienes están hoy en el proyecto (el creador
// primero). El nombre y la carrera dependen del directorio de B; mientras no
// exista se muestra «Tú» / «Otra persona».
export function useProjectMembersViewModel(projectId: string) {
  const repo = useInject<MembersRepository>(TOKENS.MembersRepo);
  const { currentUser } = useSession();

  const [members, setMembers] = useState<ProjectMember[]>([]);
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

  const userId = currentUser()?.userId ?? null;
  const nameOf = (member: ProjectMember) => (member.userId === userId ? "Tú" : "Otra persona");

  return { members, loading, error, reload, userId, nameOf };
}
