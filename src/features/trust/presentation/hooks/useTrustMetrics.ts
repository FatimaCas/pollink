import { useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { messageOf } from "@/src/core/utils/formatters";
import { TrustMetrics } from "../../domain/entities/TrustMetrics";
import { TrustRepository } from "../../domain/repositories/TrustRepository";

// Los indicadores de confianza de `userId`. Si no se pudieron calcular no hay
// números: `error` dice por qué y `reload` reintenta. Nunca se rellenan con
// ceros. Lo usan el perfil, el de otra persona y la ficha de un aplicante (A).
export function useTrustMetrics(userId: string) {
  const repo = useInject<TrustRepository>(TOKENS.TrustRepo);
  const [metrics, setMetrics] = useState<TrustMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = () => {
    setLoading(true);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const found = await repo.getTrustMetricsOf(userId);
        if (cancelled) return;
        setMetrics(found);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setMetrics(null);
        setError(messageOf(e, "No pudimos calcular los indicadores."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, userId, version]);

  return { metrics, loading: userId ? loading : false, error, reload };
}
