import AsyncStorage from "@react-native-async-storage/async-storage";
import { InitialState, NavigationState } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

// Conserva la navegación al recargar la app o al volver de segundo plano: se
// guarda en cada cambio y se restaura al arrancar.
//
// La clave lleva versión: si cambian las rutas de `types.ts` de forma que un
// estado viejo ya no sirva, se sube la versión y el estado viejo se ignora.
const KEY = "pollink.navigation.v2";

export function useNavigationPersistence(enabled: boolean) {
  const [ready, setReady] = useState(!enabled);
  const [initialState, setInitialState] = useState<InitialState | undefined>();

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (active && saved) setInitialState(JSON.parse(saved) as InitialState);
      })
      // Un estado ilegible no impide arrancar: se empieza desde el principio.
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const onStateChange = useCallback(
    (state: NavigationState | undefined) => {
      if (!enabled || !state) return;
      AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
    },
    [enabled],
  );

  return { ready, initialState, onStateChange };
}
