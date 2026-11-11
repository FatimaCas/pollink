import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { ProjectTask } from "@/src/features/tasks/domain/entities/ProjectTask";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import { TasksFailure } from "@/src/features/tasks/domain/TasksFailure";
import TaskBoardScreen from "@/src/features/tasks/presentation/screens/TaskBoardScreen";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";

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


// El calendario real se prueba aparte (dayPickerModal.test.tsx): aquí se simula
// con un botón que elige el 31/12/2099.
jest.mock("@/src/core/components/DayPickerModal", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable } = require("react-native");
  return {
    DayPickerModal: ({ visible, onConfirm }: { visible: boolean; onConfirm: (d: Date) => void }) =>
      visible ? <Pressable testID="dayPicker.pick" onPress={() => onConfirm(new Date(2099, 11, 31))} /> : null,
  };
});

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
  c.register(TOKENS.ProfileRepo, fake<ProfileRepository>({ getNamesOf: async () => ({}) }, "ProfileRepo"));
  c.register(TOKENS.TaskRepo, fake<TaskRepository>(repo, "TaskRepo"));
  return renderScreen(TaskBoardScreen, c);
}

test("reparte las tareas por columna", async () => {
  setup({
    getTasks: async () => [task({ id: "a" }), task({ id: "b", status: "doing", assigneeId: "u1" }), task({ id: "c", status: "done" })],
  });
  expect(await screen.findByTestId("taskCard.a")).toBeTruthy();
  expect(screen.queryByTestId("taskCard.b")).toBeNull();
  fireEvent.press(screen.getByTestId("taskBoard.tabs.doing"));
  expect(screen.getByTestId("taskCard.b")).toBeTruthy();
  expect(screen.getByText("Reservada por ti")).toBeTruthy();
  fireEvent.press(screen.getByTestId("taskBoard.tabs.done"));
  expect(screen.getByTestId("taskCard.c")).toBeTruthy();
});

test("reservar mueve la tarea a «en progreso»", async () => {
  const reserveTask = jest.fn(async ({ task: t, userId }) => ({ ...t, status: "doing", assigneeId: userId }));
  setup({ getTasks: async () => [task({ id: "a" })], reserveTask });
  fireEvent.press(await screen.findByTestId("taskCard.a.reserve"));
  await waitFor(() =>
    expect(reserveTask).toHaveBeenCalledWith({ task: expect.objectContaining({ id: "a" }), userId: "u1" }),
  );
  fireEvent.press(screen.getByTestId("taskBoard.tabs.doing"));
  expect(await screen.findByText("Reservada por ti")).toBeTruthy();
  fireEvent.press(screen.getByTestId("taskBoard.tabs.todo"));
  expect(screen.queryByTestId("taskCard.a")).toBeNull();
});

test("si otra persona se adelantó, recarga el tablero", async () => {
  const getTasks = jest
    .fn()
    .mockResolvedValueOnce([task({ id: "a" })])
    .mockResolvedValueOnce([task({ id: "a", status: "doing", assigneeId: "u2" })]);
  setup({ getTasks, reserveTask: async () => { throw new TasksFailure("Ya la tomó otra persona."); } });
  fireEvent.press(await screen.findByTestId("taskCard.a.reserve"));
  await waitFor(() => expect(getTasks).toHaveBeenCalledTimes(2));
  fireEvent.press(screen.getByTestId("taskBoard.tabs.doing"));
  expect(await screen.findByText("Reservada por Otra persona")).toBeTruthy();
});

test("crear una tarea con fecha límite elegida en el calendario", async () => {
  const createTask = jest.fn(async (p) => task({ id: "n", title: p.title, deadline: p.deadline }));
  setup({ getTasks: async () => [], createTask });
  fireEvent.press(await screen.findByTestId("taskBoard.new"));
  fireEvent.changeText(screen.getByTestId("newTask.title"), "  Escribir informe ");
  fireEvent.press(screen.getByTestId("newTask.deadline"));
  fireEvent.press(screen.getByTestId("dayPicker.pick"));
  expect(screen.getByText("Límite: 31/12/2099")).toBeTruthy();
  fireEvent.press(screen.getByTestId("newTask.submit"));
  await waitFor(() => expect(screen.getByTestId("taskCard.n")).toBeTruthy());
  const { deadline } = createTask.mock.calls[0][0];
  expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p1", title: "Escribir informe" }));
  // Vence al final del día elegido.
  expect([deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), deadline.getHours()]).toEqual([2099, 11, 31, 23]);
});

test("la fecha límite elegida se puede quitar", async () => {
  setup({ getTasks: async () => [] });
  fireEvent.press(await screen.findByTestId("taskBoard.new"));
  fireEvent.press(screen.getByTestId("newTask.deadline"));
  fireEvent.press(screen.getByTestId("dayPicker.pick"));
  fireEvent.press(screen.getByTestId("newTask.deadline.clear"));
  expect(screen.getByText("Fecha límite (opcional)")).toBeTruthy();
});

test("sin nombre no crea nada y lo dice", async () => {
  const createTask = jest.fn();
  setup({ getTasks: async () => [], createTask });
  fireEvent.press(await screen.findByTestId("taskBoard.new"));
  fireEvent.press(screen.getByTestId("newTask.submit"));
  expect(createTask).not.toHaveBeenCalled();
  expect(screen.getByText("Escribe un nombre")).toBeTruthy();
});

test("una tarea vencida y una terminada se rotulan distinto", async () => {
  setup({
    getTasks: async () => [
      task({ id: "v", deadline: new Date(2020, 0, 1) }),
      task({ id: "f", deadline: new Date(2099, 0, 1) }),
    ],
  });
  expect(await screen.findByText("Vencida el 01/01/2020")).toBeTruthy();
  expect(screen.getByText("Vence el 01/01/2099")).toBeTruthy();
});

test("cancelar descarta lo escrito", async () => {
  setup({ getTasks: async () => [] });
  fireEvent.press(await screen.findByTestId("taskBoard.new"));
  fireEvent.changeText(screen.getByTestId("newTask.title"), "Algo");
  fireEvent.press(screen.getByText("Cancelar"));
  fireEvent.press(screen.getByTestId("taskBoard.new"));
  expect(screen.getByTestId("newTask.title").props.value).toBe("");
});
