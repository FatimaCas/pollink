// En la base de datos el valor es `open` / `closed`; la etiqueta es lo que se
// le muestra a la gente.
export type ProjectStatus = "open" | "closed";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  open: "Abierto",
  closed: "Cerrado",
};

// Un estado que la app no conoce no puede tumbar la lista: se trata como
// abierto, que es también el estado con el que nace un proyecto.
export function projectStatusOf(name: unknown): ProjectStatus {
  return name === "closed" ? "closed" : "open";
}
