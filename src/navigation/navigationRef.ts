import { createNavigationContainerRef } from "@react-navigation/native";

import { RootStackParamList } from "./types";

// Para navegar desde fuera de una pantalla: la sesión manda al login cuando se
// cae sola, o cuando una acción exige cuenta.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function goToLogin() {
  if (!navigationRef.isReady()) return;
  const current = navigationRef.getCurrentRoute()?.name;
  if (current !== "Login" && current !== "Register") navigationRef.navigate("Login");
}

// Tras crear la cuenta o guardar la de invitado: los primeros datos del perfil
// (se pueden omitir). Es de `profile`; auth solo lo dispara.
export function goToOnboarding() {
  if (navigationRef.isReady()) navigationRef.navigate("Onboarding");
}
