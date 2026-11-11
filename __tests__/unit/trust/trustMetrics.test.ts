import { calculateTrust, NO_TRUST, ProjectParticipation } from "@/src/features/trust/domain/entities/TrustMetrics";

const part = (o: Partial<ProjectParticipation> = {}): ProjectParticipation => ({
  projectId: "p1",
  tasksFinished: 0,
  tasksTaken: 0,
  totalTasks: 0,
  progress: 0,
  ...o,
});

describe("calculateTrust", () => {
  it("sin participaciones no hay historial", () => {
    expect(calculateTrust([])).toEqual(NO_TRUST);
  });

  it("sin tareas tomadas ni entregas, todo es null pero hay historial", () => {
    const m = calculateTrust([part()]);
    expect(m.hasHistory).toBe(true);
    expect(m.fulfillment).toBeNull();
    expect(m.onTime).toBeNull();
    expect(m.completedProjects).toBe(0);
  });

  it("cumplimiento promedia por proyecto", () => {
    const m = calculateTrust([
      part({ projectId: "a", tasksTaken: 2, tasksFinished: 2 }),
      part({ projectId: "b", tasksTaken: 4, tasksFinished: 0 }),
    ]);
    expect(m.fulfillment).toBe(50);
  });

  it("proyecto sin tareas no cuenta como completado", () => {
    expect(calculateTrust([part({ progress: 100, totalTasks: 0 })]).completedProjects).toBe(0);
    expect(calculateTrust([part({ progress: 100, totalTasks: 3 })]).completedProjects).toBe(100);
  });

  it("entrega a tiempo usa solo las entregas con deadline", () => {
    const m = calculateTrust([part()], { withDeadline: 4, onTime: 3 });
    expect(m.onTime).toBe(75);
  });

  it("compromiso promedia solo los indicadores con datos", () => {
    const m = calculateTrust([part({ tasksTaken: 1, tasksFinished: 1 })], { withDeadline: 0, onTime: 0 });
    // cumplimiento 100 y completados 0 (onTime sin datos) -> 50
    expect(m.commitment).toBe(50);
  });

  it("acota las razones a [0, 100]", () => {
    expect(calculateTrust([part({ tasksTaken: 1, tasksFinished: 5 })]).fulfillment).toBe(100);
  });
});
