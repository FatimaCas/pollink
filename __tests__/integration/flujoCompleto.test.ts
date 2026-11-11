/** @jest-environment node */
import { DummyData } from "@/src/core/data/dummyData";
import { createLocalContainer } from "@/src/core/di/localContainer";
import { TOKENS } from "@/src/core/di/tokens";
import { AuthRepository } from "@/src/features/auth/domain/repositories/AuthRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import { TrustRepository } from "@/src/features/trust/domain/repositories/TrustRepository";

// El recorrido de punta a punta sobre los repositorios reales y los datasources
// en memoria: registro, proyecto, solicitud, equipo, tareas, progreso, confianza y salida.
test("dos personas arman un proyecto, trabajan una tarea y una sale", async () => {
  const c = createLocalContainer(new DummyData({ latencyMs: 0 }));
  const auth = c.resolve<AuthRepository>(TOKENS.AuthRepo);
  const projects = c.resolve<ProjectRepository>(TOKENS.ProjectRepo);
  const members = c.resolve<MembersRepository>(TOKENS.MembersRepo);
  const requests = c.resolve<JoinRequestRepository>(TOKENS.JoinRequestRepo);
  const tasks = c.resolve<TaskRepository>(TOKENS.TaskRepo);
  const trust = c.resolve<TrustRepository>(TOKENS.TrustRepo);

  // 1. Dos personas se registran.
  const a = await auth.registerWithEmail("Ana Prueba", "ana.flujo@test.com", "123456");
  await auth.logout();
  const b = await auth.registerWithEmail("Beto Prueba", "beto.flujo@test.com", "123456");
  await auth.logout();

  // 2. A crea un proyecto y se añade como creador.
  await auth.loginWithEmail("ana.flujo@test.com", "123456");
  const project = await projects.createProject({
    draft: { title: "Proyecto de flujo", description: "Recorrido completo.", jobs: ["Ingeniería de Sistemas"], skills: ["React Native"] },
    ownerId: a.userId,
  });
  await members.addMember({ projectId: project.id, userId: a.userId, role: "owner" });
  await auth.logout();

  // 3. B se postula y A acepta.
  await auth.loginWithEmail("beto.flujo@test.com", "123456");
  const request = await requests.apply({ projectId: project.id, userId: b.userId });
  await auth.logout();
  await auth.loginWithEmail("ana.flujo@test.com", "123456");
  await requests.decide({ requestId: request.id, accepted: true, reviewerId: a.userId });
  await members.addMember({ projectId: project.id, userId: b.userId });

  // 4. Los dos son miembros activos, el creador primero.
  const active = await members.activeMembers(project.id);
  expect(active.map((m) => m.userId)).toEqual([a.userId, b.userId]);
  expect(active[0].role).toBe("owner");

  // 5. A crea dos tareas y B reserva una.
  const t1 = await tasks.createTask({ projectId: project.id, title: "Primera", deadline: new Date(Date.now() + 86_400_000) });
  await tasks.createTask({ projectId: project.id, title: "Segunda" });
  await auth.logout();
  await auth.loginWithEmail("beto.flujo@test.com", "123456");
  const reserved = await tasks.reserveTask({ task: t1, userId: b.userId });
  expect(reserved.status).toBe("doing");
  expect(reserved.assigneeId).toBe(b.userId);
  expect((await members.staysOf(project.id, b.userId))[0].taken).toBe(1);

  // 6. B completa el checklist: la tarea queda terminada.
  const done = await tasks.saveTaskProgress({
    task: reserved,
    description: reserved.description,
    subtasks: [{ title: "Paso 1", done: true }, { title: "Paso 2", done: true }],
  });
  expect(done.status).toBe("done");
  expect(done.finishedAt).not.toBeNull();
  expect((await members.staysOf(project.id, b.userId))[0].finished).toBe(1);

  // 7. Una de dos tareas terminadas: 50 %.
  expect(await tasks.recalculateProgress(project.id)).toBe(50);

  // 8. B ya tiene indicadores de confianza.
  const metrics = await trust.getTrustMetricsOf(b.userId);
  expect(metrics).not.toBeNull();
  expect(metrics.hasHistory).toBe(true);

  // 9. B toma la segunda y sale: la tarea sin terminar vuelve a pendiente, sin responsable.
  const second = (await tasks.getTasks(project.id)).find((t) => t.title === "Segunda")!;
  await tasks.reserveTask({ task: second, userId: b.userId });
  await members.leave({ projectId: project.id, userId: b.userId });
  expect(await tasks.releaseUnfinishedTasks({ projectId: project.id, userId: b.userId })).toBe(1);
  const after = await tasks.getTasks(project.id);
  const released = after.find((t) => t.title === "Segunda")!;
  expect(released.status).toBe("todo");
  expect(released.assigneeId).toBeNull();
  expect(after.find((t) => t.title === "Primera")!.status).toBe("done");
  expect((await members.activeMemberIds(project.id))).toEqual([a.userId]);
});
