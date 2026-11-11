import { useCallback, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { JoinRequestRepository } from "../../domain/repositories/JoinRequestRepository";

// Los pasos de postularse: nada → (sin cuenta) aviso de «necesitas cuenta», o →
// confirmación → enviada.
export type ApplyStep = "idle" | "needsAccount" | "confirm";

// El flujo de «Solicitar unirme»: pide cuenta (un invitado no se postula),
// confirma, revisa que no sea ya miembro y envía. Postularse necesita **cuenta**
// porque la solicitud queda a nombre de alguien a quien el creador puede
// revisar; guardar o mirar no la piden.
export function useApplyViewModel(projectId: string) {
  const requests = useInject<JoinRequestRepository>(TOKENS.JoinRequestRepo);
  const members = useInject<MembersRepository>(TOKENS.MembersRepo);
  const session = useSession();

  const [step, setStep] = useState<ApplyStep>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(() => {
    setError(null);
    setStep(session.hasAccount ? "confirm" : "needsAccount");
  }, [session.hasAccount]);

  const cancel = useCallback(() => {
    if (!busy) setStep("idle");
  }, [busy]);

  // `true` si la solicitud quedó enviada.
  const confirm = useCallback(async () => {
    const me = session.currentUser();
    if (!me || me.isAnonymous) {
      setStep("needsAccount");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      if ((await members.activeMemberIds(projectId)).includes(me.userId)) {
        setError("Ya colaboras en este proyecto.");
        return false;
      }
      await requests.apply({ projectId, userId: me.userId });
      setStep("idle");
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [session, members, requests, projectId]);

  return { step, busy, error, start, cancel, confirm };
}
