import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProjectTask } from "@/src/features/tasks/domain/entities/ProjectTask";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import TaskDetailScreen from "@/src/features/tasks/presentation/screens/TaskDetailScreen";
import { fake } from "../support/fake";
import { renderScreen } from "../support/renderScreen";

let mockSessionUser = "u1";
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  useSession: () => ({
    currentUser: () => ({ userId: mockSessionUser, name: "Yo", email: "y@x.co", isAnonymous: false }),
    ensureLoggedIn: () => true,
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: { projectId: "p1", taskId: "t1" } }),
}));

const task = (over: Partial<ProjectTask> = {}): ProjectTask => ({
  id: "t1",
  projectId: "p1",
  title: "Diseñar logo",
  description: "Boceto inicial",
  status: "doing",
  assigneeId: "u1",
  subtasks: [
    { title: "Bocetos", done: true },
    { title: "Versión final", done: false },
  ],
  deadline: null,
  creatorId: "u1",
  finishedAt: null,
  ...over,
});

function setup(repo: Partial<TaskRepository>, owner = "u9") {
  const c = new Container();
  c.register(TOKENS.TaskRepo, fake<TaskRepository>(repo, "TaskRepo"));
  c.register(
    TOKENS.MembersRepo,
    fake<MembersRepository>({ activeMembers: async () => [{ userId: owner, role: "owner", joinedAt: null }] }, "MembersRepo"),
  );
  return renderScreen(TaskDetailScreen, c);
}

beforeEach(() => {
  mockSessionUser = "u1";
});

test("completar el checklist guarda y avisa que la tarea terminó", async () => {
  const saveTaskProgress = jest.fn(async ({ task: t, description, subtasks }) => ({
    ...t,
    description,
    subtasks,
    status: "done",
    finishedAt: new Date(),
  }));
  setup({ getTasks: async () => [task()], saveTaskProgress });
  const save = await screen.findByTestId("taskDetail.save");
  expect(save.props.accessibilityState?.disabled).toBe(true);
  fireEvent.press(screen.getByTestId("taskDetail.item.1"));
  fireEvent.press(screen.getByTestId("taskDetail.save"));
  await waitFor(() => expect(saveTaskProgress).toHaveBeenCalled());
  expect(saveTaskProgress.mock.calls[0][0].subtasks.every((s: { done: boolean }) => s.done)).toBe(true);
  await waitFor(() => expect(screen.getByTestId("taskDetail.status").props.children.join("")).toContain("Terminada"));
});

test("agregar una subtarea la suma al borrador", async () => {
  const saveTaskProgress = jest.fn(async ({ task: t, description, subtasks }) => ({ ...t, description, subtasks }));
  setup({ getTasks: async () => [task()], saveTaskProgress });
  fireEvent.changeText(await screen.findByTestId("taskDetail.newItem"), "  Exportar ");
  fireEvent.press(screen.getByTestId("taskDetail.addItem"));
  fireEvent.press(screen.getByTestId("taskDetail.save"));
  await waitFor(() => expect(saveTaskProgress).toHaveBeenCalled());
  expect(saveTaskProgress.mock.calls[0][0].subtasks.map((s: { title: string }) => s.title)).toEqual([
    "Bocetos",
    "Versión final",
    "Exportar",
  ]);
});

test("una tarea vencida lo señala", async () => {
  setup({ getTasks: async () => [task({ deadline: new Date(2020, 0, 1) })] });
  const deadline = await screen.findByTestId("taskDetail.deadline");
  expect(deadline.props.children).toContain("Vencida");
});

test("quien no la reservó no puede editarla", async () => {
  mockSessionUser = "u2";
  setup({ getTasks: async () => [task()] });
  await screen.findByTestId("taskDetail.description");
  expect(screen.queryByTestId("taskDetail.save")).toBeNull();
  expect(screen.getByText(/Solo quien reservó/)).toBeTruthy();
});

test("el creador cambia la fecha límite", async () => {
  const updateTaskDeadline = jest.fn(async ({ task: t, deadline }) => ({ ...t, deadline }));
  setup({ getTasks: async () => [task()], updateTaskDeadline });
  fireEvent.press(await screen.findByTestId("taskDetail.editDeadline"));
  fireEvent.changeText(screen.getByTestId("taskDetail.deadlineInput"), "31/12/2099");
  fireEvent.press(screen.getByTestId("taskDetail.deadlineSave"));
  await waitFor(() => expect(updateTaskDeadline).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" })));
  await waitFor(() => expect(screen.getByTestId("taskDetail.deadline").props.children).toContain("31/12/2099"));
});

test("quien no creó la tarea ni el proyecto no ve «Cambiar»", async () => {
  mockSessionUser = "u2";
  setup({ getTasks: async () => [task()] });
  await screen.findByTestId("taskDetail.description");
  expect(screen.queryByTestId("taskDetail.editDeadline")).toBeNull();
});

test("si la tarea ya no existe lo dice", async () => {
  setup({ getTasks: async () => [] });
  expect(await screen.findByText("La tarea ya no existe.")).toBeTruthy();
});
