import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { isPending, JoinRequest } from "../../domain/entities/JoinRequest";
import { JoinRequestRepository } from "../../domain/repositories/JoinRequestRepository";

// Una solicitud y su decisión: la ficha del aplicante y la pantalla de
// resultado la leen por id. Aceptar cruza dos features, así que el view model
// orquesta (un repositorio nunca llama a otro): comprueba que se puede, agrega
// al miembro, marca la solicitud y limpia lo demás que la persona tenía abierto.
export function useApplicantViewModel(requestId: string) {
  const requests = useInject<JoinRequestRepository>(TOKENS.JoinRequestRepo);
  const members = useInject<MembersRepository>(TOKENS.MembersRepo);
  const session = useSession();

  const [request, setRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await requests.requestById(requestId);
        if (cancelled) return;
        setRequest(loaded);
        setError(loaded ? null : "No se encontró la solicitud.");
      } catch (e) {
        if (!cancelled) setError(messageOf(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requests, requestId, version]);

  const userId = session.currentUser()?.userId ?? null;
  const name = request && request.userId === userId ? "Tú" : "Aplicante";

  // `true` si quedó resuelta; si no, `error` dice por qué.
  const decide = useCallback(
    async (accepted: boolean) => {
      const me = session.currentUser();
      if (!request || !me || !isPending(request)) return false;
      setBusy(true);
      setError(null);
      try {
        if (accepted) {
          await requests.ensureAcceptable(request.id);
          // Idempotente: si lo que sigue falla y se reintenta, no duplica al miembro.
          await members.addMember({ projectId: request.projectId, userId: request.userId });
        }
        const decided = await requests.decide({ requestId: request.id, accepted, reviewerId: me.userId });
        setRequest(decided);
        if (accepted) {
          // Ya es miembro: lo demás que tuviera abierto hacia el proyecto sobra.
          // Si falla no importa: la solicitud ya está resuelta.
          await requests.cancelPending({ projectId: request.projectId, userId: request.userId, cancelledBy: me.userId }).catch(() => 0);
        }
        return true;
      } catch (e) {
        setError(messageOf(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [request, session, requests, members],
  );

  return { request, name, loading, error, busy, reload, decide };
}
