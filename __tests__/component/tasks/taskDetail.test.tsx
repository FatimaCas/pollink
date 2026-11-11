import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { ProjectTask } from "@/src/features/tasks/domain/entities/ProjectTask";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import TaskDetailScreen from "@/src/features/tasks/presentation/screens/TaskDetailScreen";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";

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
  c.register(TOKENS.ProfileRepo, fake<ProfileRepository>({ getNamesOf: async () => ({}) }, "ProfileRepo"));
  c.register(TOKENS.TaskRepo, fake<TaskRepository>({ getComments: async () => [], ...repo }, "TaskRepo"));
  c.register(
    TOKENS.MembersRepo,
    fake<MembersRepository>({ activeMembers: async () => [{ userId: owner, role: "owner", joinedAt: null }] }, "MembersRepo"),
  );
  return renderScreen(TaskDetailScreen, c);
}

beforeEach(() => {
  mockSessionUser = "u1";
});

test("completar el checklist guarda y la tarea queda terminada", async () => {
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
  // Ya guardado: el borrador coincide con la tarea y «Guardar» vuelve a apagarse.
  await waitFor(() => expect(screen.getByTestId("taskDetail.save").props.accessibilityState?.disabled).toBe(true));
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
  expect(deadline.props.children).toContain("Vencida el");
});

test("quien no la reservó no puede editarla", async () => {
  mockSessionUser = "u2";
  setup({ getTasks: async () => [task()] });
  await screen.findByTestId("taskDetail.description");
  expect(screen.queryByTestId("taskDetail.save")).toBeNull();
  expect(screen.getByText("Solo quien reservó la tarea puede editarla.")).toBeTruthy();
});

test("el creador cambia la fecha límite con el calendario", async () => {
  const updateTaskDeadline = jest.fn(async ({ task: t, deadline }) => ({ ...t, deadline }));
  setup({ getTasks: async () => [task()], updateTaskDeadline });
  fireEvent.press(await screen.findByTestId("taskDetail.editDeadline"));
  fireEvent.press(screen.getByTestId("dayPicker.pick"));
  await waitFor(() => expect(updateTaskDeadline).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" })));
  const { deadline } = updateTaskDeadline.mock.calls[0][0];
  expect([deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), deadline.getHours()]).toEqual([2099, 11, 31, 23]);
  await waitFor(() => expect(screen.getByTestId("taskDetail.deadline").props.children).toContain("31/12/2099"));
});

test("el creador quita la fecha límite", async () => {
  const updateTaskDeadline = jest.fn(async ({ task: t, deadline }) => ({ ...t, deadline }));
  setup({ getTasks: async () => [task({ deadline: new Date(2099, 0, 1) })], updateTaskDeadline });
  fireEvent.press(await screen.findByTestId("taskDetail.clearDeadline"));
  await waitFor(() => expect(updateTaskDeadline).toHaveBeenCalledWith(expect.objectContaining({ deadline: null })));
  await waitFor(() => expect(screen.getByText("Sin fecha límite")).toBeTruthy());
});

test("una tarea sin reservar pide reservarla para editarla", async () => {
  mockSessionUser = "u2";
  setup({ getTasks: async () => [task({ status: "todo", assigneeId: null })] });
  expect(await screen.findByText("Reserva la tarea para poder editarla.")).toBeTruthy();
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

test("muestra los comentarios y envía uno nuevo", async () => {
  const addComment = jest.fn(async ({ body }: { body: string }) => ({
    id: "c2",
    userId: "u1",
    body,
    createdAt: new Date(),
  }));
  setup({
    getTasks: async () => [task()],
    getComments: async () => [{ id: "c1", userId: "u2", body: "Va bien", createdAt: new Date() }],
    addComment,
  });
  expect(await screen.findByText("Va bien")).toBeTruthy();
  expect(screen.getByText("Otra persona")).toBeTruthy();
  expect(screen.getByTestId("taskComments.send").props.accessibilityState?.disabled).toBe(true);

  fireEvent.changeText(screen.getByTestId("taskComments.input"), "  Listo el boceto  ");
  fireEvent.press(screen.getByTestId("taskComments.send"));

  expect(await screen.findByText("Listo el boceto")).toBeTruthy();
  expect(addComment).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", body: "Listo el boceto" }));
  expect(screen.getByTestId("taskComments.input").props.value).toBe("");
  expect(screen.getByTestId("taskComments.count")).toHaveTextContent("2 comentarios");
});

test("sin comentarios, y si falla enviar conserva el texto", async () => {
  setup({
    getTasks: async () => [task()],
    addComment: async () => {
      throw new Error("Sin conexión");
    },
  });
  expect(await screen.findByTestId("taskComments.empty")).toHaveTextContent(/Aún no hay comentarios/);
  fireEvent.changeText(screen.getByTestId("taskComments.input"), "Hola");
  fireEvent.press(screen.getByTestId("taskComments.send"));
  await waitFor(() => expect(screen.getByTestId("taskComments.send").props.accessibilityState?.disabled).toBe(false));
  expect(screen.getByTestId("taskComments.input").props.value).toBe("Hola");
});

test("si no cargan los comentarios lo dice y reintentar los trae", async () => {
  let fail = true;
  setup({
    getTasks: async () => [task()],
    getComments: async () => {
      if (fail) throw new Error("Sin conexión");
      return [{ id: "c1", userId: "u1", body: "Ya cargó", createdAt: null }];
    },
  });
  expect(await screen.findByTestId("taskComments.empty")).toHaveTextContent(/Sin conexión/);
  fail = false;
  fireEvent.press(screen.getByTestId("taskComments.retry"));
  expect(await screen.findByText("Ya cargó")).toBeTruthy();
  expect(screen.getByText("Tú")).toBeTruthy();
});
