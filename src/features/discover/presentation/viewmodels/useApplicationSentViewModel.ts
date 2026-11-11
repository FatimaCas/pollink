import { useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { DiscoverRepository } from "../../domain/repositories/DiscoverRepository";

// El nombre del proyecto al que se postuló la persona, para el texto de «Solicitud enviada».
// Si no se puede leer, la pantalla dice «el proyecto»: la solicitud ya está enviada.
export function useApplicationSentViewModel(projectId: string) {
  const repo = useInject<DiscoverRepository>(TOKENS.DiscoverRepo);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repo
      .projectById(projectId)
      .then((p) => !cancelled && setTitle(p?.title ?? null))
      .catch(() => !cancelled && setTitle(null));
    return () => {
      cancelled = true;
    };
  }, [repo, projectId]);

  return { title };
}
