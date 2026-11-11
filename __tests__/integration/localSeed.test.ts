/** @jest-environment node */
import { seedLocalData } from "@/src/core/data/localSeed";
import { DummyData } from "@/src/core/data/dummyData";
import { createLocalContainer } from "@/src/core/di/localContainer";
import { TOKENS } from "@/src/core/di/tokens";
import { AuthRepository } from "@/src/features/auth/domain/repositories/AuthRepository";
import { NO_FILTER } from "@/src/features/discover/domain/entities/ProjectFilter";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { FollowRepository } from "@/src/features/follows/domain/repositories/FollowRepository";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import { TrustRepository } from "@/src/features/trust/domain/repositories/TrustRepository";

test("los datos locales dejan a Ana con proyectos, solicitudes, una invitación y tareas en las tres columnas", async () => {
  const c = createLocalContainer(new DummyData({ latencyMs: 0 }));
  await seedLocalData(c);
  const auth = c.resolve<AuthRepository>(TOKENS.AuthRepo);
  const projects = c.resolve<ProjectRepository>(TOKENS.ProjectRepo);
  const tasks = c.resolve<TaskRepository>(TOKENS.TaskRepo);

  // Arranca sin sesión, como siempre.
  expect(await auth.restoreSession()).toBeNull();

  const feed = await c.resolve<DiscoverRepository>(TOKENS.DiscoverRepo).feedPage({ filter: NO_FILTER, limit: 50, offset: 0 });
  expect(feed.projects.length).toBeGreaterThanOrEqual(12);

  const ana = await auth.loginWithEmail(DummyData.demoEmail, DummyData.demoPassword);
  const own = await projects.getProjectsByOwner(ana.userId);
  expect(own.length).toBeGreaterThanOrEqual(2);
  expect((await projects.getProjectsParticipatedBy(ana.userId)).length).toBeGreaterThanOrEqual(2);
  expect((await c.resolve<InvitationRepository>(TOKENS.InvitationRepo).pendingFor(ana.userId)).length).toBe(1);
  expect(await c.resolve<JoinRequestRepository>(TOKENS.JoinRequestRepo).pendingCount(own[0].id)).toBeGreaterThan(0);

  const statuses = new Set((await tasks.getTasks(own.find((p) => p.title.startsWith("Atlas"))!.id)).map((t) => t.status));
  expect([...statuses].sort()).toEqual(["doing", "done", "todo"]);

  expect(feed.projects.some((p) => p.status === "closed")).toBe(true);
  expect((await c.resolve<TrustRepository>(TOKENS.TrustRepo).getTrustMetricsOf(ana.userId)).hasHistory).toBe(true);
  const follows = c.resolve<FollowRepository>(TOKENS.FollowRepo);
  expect((await follows.followingIds(ana.userId)).length).toBeGreaterThanOrEqual(3);
  expect(await follows.followersCount(ana.userId)).toBeGreaterThanOrEqual(3);
});
