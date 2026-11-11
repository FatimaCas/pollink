import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { isPending, JoinRequest } from "../../domain/entities/JoinRequest";
import { JoinRequestRepository } from "../../domain/repositories/JoinRequestRepository";

// Estado de la lista de solicitudes de un proyecto (la del creador): las
// pendientes arriba y las ya resueltas después. El nombre sale del directorio
// de personas de B; mientras no exista se muestra «Tú» / «Aplicante».
export function useJoinRequestsViewModel(projectId: string) {
  const repo = useInject<JoinRequestRepository>(TOKENS.JoinRequestRepo);
  const { currentUser } = useSession();

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await repo.requestsForProject(projectId);
        if (cancelled) return;
        setRequests(loaded);
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
  const nameOf = (request: JoinRequest) => (request.userId === userId ? "Tú" : "Aplicante");

  return {
    requests,
    pendingCount: requests.filter(isPending).length,
    loading,
    error,
    reload,
    nameOf,
  };
}
