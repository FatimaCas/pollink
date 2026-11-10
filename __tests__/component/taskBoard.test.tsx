import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { ProjectTask } from "@/src/features/tasks/domain/entities/ProjectTask";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import { TasksFailure } from "@/src/features/tasks/domain/TasksFailure";
import TaskBoardScreen from "@/src/features/tasks/presentation/screens/TaskBoardScreen";
import { fake } from "../support/fake";
import { renderScreen } from "../support/renderScreen";

jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  useSession: () => ({
    currentUser: () => ({ userId: "u1", name: "Yo", email: "y@x.co", isAnonymous: false }),
    ensureLoggedIn: () => true,
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: { projectId: "p1" } }),
}));

const task = (over: Partial<ProjectTask>): ProjectTask => ({
  id: "t1",
  projectId: "p1",
  title: "Diseñar logo",
  description: "",
  status: "todo",
  assigneeId: null,
  subtasks: [],
  deadline: null,
  creatorId: "u1",
  finishedAt: null,
  ...over,
});

function setup(repo: Partial<TaskRepository>) {
  const c = new Container();
  c.register(TOKENS.TaskRepo, fake<TaskRepository>(repo, "TaskRepo"));
  return renderScreen(TaskBoardScreen, c);
}

test("reparte las tareas por columna y muestra el conteo", async () => {
  setup({
    getTasks: async () => [task({ id: "a" }), task({ id: "b", status: "doing", assigneeId: "u1" }), task({ id: "c", status: "done" })],
  });
  expect(await screen.findByText("Pendiente (1)")).toBeTruthy();
  expect(screen.getByText("En progreso (1)")).toBeTruthy();
  expect(screen.getByText("Terminada (1)")).toBeTruthy();
  expect(screen.getByTestId("taskCard.a")).toBeTruthy();
  expect(screen.queryByTestId("taskCard.b")).toBeNull();
  fireEvent.press(screen.getByTestId("taskBoard.tabs.doing"));
  expect(screen.getByTestId("taskCard.b")).toBeTruthy();
  expect(screen.getByText("Tú")).toBeTruthy();
});

test("reservar mueve la tarea a «en progreso»", async () => {
  const reserveTask = jest.fn(async ({ task: t, userId }) => ({ ...t, status: "doing", assigneeId: userId }));
  setup({ getTasks: async () => [task({ id: "a" })], reserveTask });
  fireEvent.press(await screen.findByTestId("taskCard.a.reserve"));
  await waitFor(() => expect(screen.getByText("En progreso (1)")).toBeTruthy());
  expect(reserveTask).toHaveBeenCalledWith({ task: expect.objectContaining({ id: "a" }), userId: "u1" });
  expect(screen.queryByTestId("taskCard.a")).toBeNull();
});

test("si otra persona se adelantó, recarga el tablero", async () => {
  const getTasks = jest
    .fn()
    .mockResolvedValueOnce([task({ id: "a" })])
    .mockResolvedValueOnce([task({ id: "a", status: "doing", assigneeId: "u2" })]);
  setup({ getTasks, reserveTask: async () => { throw new TasksFailure("Ya la tomó otra persona."); } });
  fireEvent.press(await screen.findByTestId("taskCard.a.reserve"));
  await waitFor(() => expect(screen.getByText("En progreso (1)")).toBeTruthy());
  expect(getTasks).toHaveBeenCalledTimes(2);
});

test("crear una tarea con fecha límite", async () => {
  const createTask = jest.fn(async (p) => task({ id: "n", title: p.title, deadline: p.deadline }));
  setup({ getTasks: async () => [], createTask });
  fireEvent.press(await screen.findByTestId("taskBoard.new"));
  fireEvent.changeText(screen.getByTestId("newTask.title"), "  Escribir informe ");
  fireEvent.changeText(screen.getByTestId("newTask.deadline"), "31/12/2099");
  fireEvent.press(screen.getByTestId("newTask.submit"));
  await waitFor(() => expect(screen.getByText("Pendiente (1)")).toBeTruthy());
  expect(createTask).toHaveBeenCalledWith(
    expect.objectContaining({ projectId: "p1", title: "Escribir informe", deadline: expect.any(Date) }),
  );
});

test("sin título no crea nada", async () => {
  const createTask = jest.fn();
  setup({ getTasks: async () => [], createTask });
  fireEvent.press(await screen.findByTestId("taskBoard.new"));
  fireEvent.press(screen.getByTestId("newTask.submit"));
  expect(createTask).not.toHaveBeenCalled();
});
