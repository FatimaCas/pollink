import { useRoute } from "@react-navigation/native";
import React from "react";

import { EmptyState } from "./EmptyState";

// Lo que muestra una pantalla que todavía no existe. Cada ruta del plan de
// trabajo arranca así, para que el navegador esté completo desde el principio y
// nadie tenga que tocarlo: quien implementa la pantalla reemplaza el contenido
// de su archivo y nada más. Muestra los parámetros para verificar la navegación.
export function PendingScreen({ task, children }: { task: string; children?: React.ReactNode }) {
  const route = useRoute();
  const params = route.params ? JSON.stringify(route.params) : null;
  return (
    <EmptyState
      icon="hammer-wrench"
      title={`${route.name}: pendiente`}
      message={`Tarea ${task} de docs/plan-de-trabajo.md.${params ? `\nParámetros: ${params}` : ""}`}
      action={children}
    />
  );
}
