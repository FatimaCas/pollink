// Lo que una persona hizo en un proyecto: tareas terminadas y tomadas
// (sumadas entre todas sus estancias) frente al total del proyecto.
export type ProjectParticipation = {
  projectId: string;
  tasksFinished: number;
  tasksTaken: number;
  // Tareas del proyecto entero, no solo las de esta persona.
  totalTasks: number;
  // Avance del proyecto, 0–100.
  progress: number;
};

// Entregas con fecha límite: cuántas tenían deadline y cuántas llegaron a tiempo.
export type OnTimeDeliveries = {
  withDeadline: number;
  onTime: number;
};

// Indicadores de confianza, cada uno de 0 a 100.
// `null` es "sin datos" (denominador 0), no 0 %. Un 0 es "hizo 0 de N, N > 0".
export type TrustMetrics = {
  // Promedio de los indicadores base que tienen datos.
  commitment: number | null;
  // De las tareas terminadas con deadline, las que llegaron a tiempo.
  onTime: number | null;
  // De las tareas tomadas, cuántas terminó (promedio entre proyectos).
  fulfillment: number | null;
  // De los proyectos donde participó, los que están al 100 %.
  completedProjects: number | null;
  // Participó en al menos un proyecto.
  hasHistory: boolean;
};

export const NO_TRUST: TrustMetrics = {
  commitment: null,
  onTime: null,
  fulfillment: null,
  completedProjects: null,
  hasHistory: false,
};

// Un proyecto sin tareas no está completado, aunque su avance diga 100.
function isCompleted(p: ProjectParticipation): boolean {
  return p.totalTasks > 0 && p.progress >= 100;
}

// part/whole acotado a [0, 1]; null si no hay nada que dividir.
function ratio(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.min(1, Math.max(0, part / whole));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percent(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100);
}

// Función pura: calcula los indicadores. Promedia sin redondear; el redondeo
// es solo de presentación.
export function calculateTrust(
  participations: ProjectParticipation[],
  deliveries: OnTimeDeliveries = { withDeadline: 0, onTime: 0 },
): TrustMetrics {
  if (participations.length === 0) return NO_TRUST;

  const fulfillment = average(
    participations
      .filter((p) => p.tasksTaken > 0)
      .map((p) => ratio(p.tasksFinished, p.tasksTaken) as number),
  );
  const onTime = ratio(deliveries.onTime, deliveries.withDeadline);
  const completed = ratio(participations.filter(isCompleted).length, participations.length);

  const base = [fulfillment, onTime, completed].filter((v): v is number => v !== null);

  return {
    commitment: percent(average(base)),
    onTime: percent(onTime),
    fulfillment: percent(fulfillment),
    completedProjects: percent(completed),
    hasHistory: true,
  };
}
