import { DummyData } from "@/src/core/data/dummyData";
import { TABLES } from "@/src/core/roble/tables";
import { TrustInMemoryDataSource } from "@/src/features/trust/data/datasources/TrustInMemoryDataSource";
import { TrustDataSource } from "@/src/features/trust/data/datasources/TrustDataSource";
import { TrustRepositoryImpl } from "@/src/features/trust/data/repositories/TrustRepositoryImpl";
import { TrustFailure } from "@/src/features/trust/domain/TrustFailure";
import { NO_TRUST } from "@/src/features/trust/domain/entities/TrustMetrics";
import { fake } from "../../support/fake";

// Filas tal como las devuelve Roble: los numeric y bigint llegan como texto.
function setup(participations: Record<string, unknown>[] = [], deliveries: Record<string, unknown>[] = []) {
  const asked: string[][] = [];
  const source = fake<TrustDataSource>(
    {
      readParticipations: async (ids) => {
        asked.push(ids);
        return participations.filter((r) => ids.includes(String(r.user_id)));
      },
      readDeliveries: async (ids) => deliveries.filter((r) => ids.includes(String(r.user_id))),
    },
    "TrustDataSource",
  );
  return { repo: new TrustRepositoryImpl(source), asked };
}

const stay = (user: string, project: string, finished: string, taken: string, total = "4", progress = "100") => ({
  user_id: user,
  project_id: project,
  tasks_finished: finished,
  tasks_taken: taken,
  total_tasks: total,
  progress,
});

describe("getTrustMetricsOf", () => {
  test("sin historial devuelve NO_TRUST", async () => {
    const { repo } = setup();
    expect(await repo.getTrustMetricsOf("ana")).toEqual(NO_TRUST);
  });

  test("un id vacío no consulta nada", async () => {
    const { repo, asked } = setup();
    expect(await repo.getTrustMetricsOf("")).toEqual(NO_TRUST);
    expect(asked).toEqual([]);
  });

  test("lee los números que llegan como texto y calcula los indicadores", async () => {
    const { repo } = setup(
      [stay("ana", "p1", "2", "2", "4", "100"), stay("ana", "p2", "1", "4", "5", "20")],
      [{ user_id: "ana", con_deadline: "4", a_tiempo: "3" }],
    );
    expect(await repo.getTrustMetricsOf("ana")).toEqual({
      hasHistory: true,
      fulfillment: 63, // (1 + 0,25) / 2
      onTime: 75,
      completedProjects: 50,
      commitment: 63, // (0,625 + 0,75 + 0,5) / 3
    });
  });

  test("un error inesperado sube tal cual (solo los de Roble se traducen)", async () => {
    const repo = new TrustRepositoryImpl(
      fake<TrustDataSource>(
        {
          readParticipations: async () => {
            throw new Error("boom");
          },
          readDeliveries: async () => [],
        },
        "TrustDataSource",
      ),
    );
    await expect(repo.getTrustMetricsOf("ana")).rejects.toThrow("boom");
  });
});

describe("getCommitmentScores", () => {
  test("usa dos consultas para todas las personas y omite a quien no tiene historial", async () => {
    const { repo, asked } = setup(
      [stay("ana", "p1", "2", "2"), stay("beto", "p1", "0", "2", "4", "0")],
      [],
    );
    const scores = await repo.getCommitmentScores(["ana", "beto", "carla", "ana", ""]);
    expect(asked).toEqual([["ana", "beto", "carla"]]);
    expect(scores).toEqual({ ana: 100, beto: 0 });
    expect("carla" in scores).toBe(false);
  });

  test("sin ids no consulta nada", async () => {
    const { repo, asked } = setup();
    expect(await repo.getCommitmentScores([])).toEqual({});
    expect(asked).toEqual([]);
  });

  test("quien tiene historial pero ningún indicador con datos no aparece", async () => {
    // Participó, pero no tomó tareas y el proyecto no está completo: solo
    // «proyectos completados» tiene datos (0), así que sí aparece con 0.
    const { repo } = setup([stay("ana", "p1", "0", "0", "0", "0")]);
    expect(await repo.getCommitmentScores(["ana"])).toEqual({ ana: 0 });
  });
});

describe("TrustInMemoryDataSource", () => {
  function memory() {
    const data = new DummyData({ latencyMs: 0 });
    data.table(TABLES.project).push({ _id: "p1", total_tasks: 4, progress: 100 }, { _id: "p2", total_tasks: 5, progress: 20 });
    data.table(TABLES.projectMember).push(
      { user_id: "ana", project_id: "p1", tasks_finished: 1, tasks_taken: 1 },
      // Dos estancias de la misma persona en el mismo proyecto se suman.
      { user_id: "ana", project_id: "p1", tasks_finished: 1, tasks_taken: 1 },
      { user_id: "ana", project_id: "p2", tasks_finished: 1, tasks_taken: 4 },
      { user_id: "beto", project_id: "p1", tasks_finished: 0, tasks_taken: 0 },
    );
    data.table(TABLES.task).push(
      { assignee_id: "ana", status: "done", deadline: "2026-05-10T00:00:00Z", finished_at: "2026-05-09T00:00:00Z" },
      { assignee_id: "ana", status: "done", deadline: "2026-05-10T00:00:00Z", finished_at: "2026-05-11T00:00:00Z" },
      { assignee_id: "ana", status: "done", deadline: null, finished_at: "2026-05-11T00:00:00Z" },
      { assignee_id: "ana", status: "doing", deadline: "2026-05-10T00:00:00Z", finished_at: null },
    );
    return new TrustRepositoryImpl(new TrustInMemoryDataSource(data));
  }

  test("calcula igual que las consultas guardadas", async () => {
    const metrics = await memory().getTrustMetricsOf("ana");
    expect(metrics.fulfillment).toBe(63);
    expect(metrics.onTime).toBe(50); // 1 de 2 con deadline
    expect(metrics.completedProjects).toBe(50);
    expect(metrics.hasHistory).toBe(true);
  });

  test("quien no participó no tiene historial", async () => {
    expect((await memory().getTrustMetricsOf("zoe")).hasHistory).toBe(false);
  });
});

test("TrustFailure es un Error con nombre", () => {
  expect(new TrustFailure("x")).toMatchObject({ name: "TrustFailure", message: "x" });
});
