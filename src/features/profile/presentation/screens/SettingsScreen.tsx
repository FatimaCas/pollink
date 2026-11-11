import React from "react";

import { AccountPanel } from "@/src/features/auth/presentation/components/AccountPanel";

// Ajustes (B2): la cuenta de quien está dentro (correo, guardar la cuenta de
// invitado y cerrar sesión), que es lo que maneja `auth`. El Figma no dibuja
// esta pantalla.
export default function SettingsScreen() {
  return <AccountPanel />;
}
