import { Alert } from "react-native";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { ProjectTask } from "@/src/features/tasks/domain/entities/ProjectTask";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import { AssignmentsTab } from "@/src/features/tasks/presentation/screens/AssignmentsScreen";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";

let mockUserId = "u1";
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  useSession: () => ({
    currentUser: () => ({ userId: mockUserId, name: "Yo", email: "y@x.co", isAnonymous: false }),
    ensureLoggedIn: () => true,
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: { projectId: "p1" } }),
}));

const members = [
  { userId: "u1", role: "owner" as const, joinedAt: null },
  { userId: "u2", role: "collaborator" as const, joinedAt: null },
];
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

function setup(tasks: Partial<TaskRepository>, memberList = members) {
  const c = new Container();
  c.register(TOKENS.MembersRepo, fake<MembersRepository>({ activeMembers: async () => memberList }, "MembersRepo"));
  c.register(TOKENS.ProfileRepo, fake<ProfileRepository>({ getNamesOf: async () => ({ u1: "Ana Torres", u2: "Beto Ruiz" }) }, "ProfileRepo"));
  c.register(TOKENS.TaskRepo, fake<TaskRepository>(tasks, "TaskRepo"));
  return renderScreen(() => <AssignmentsTab projectId="p1" />, c);
}

async function confirmAlert(label: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
  await act(async () => {
    await buttons.find((b) => b.text === label)!.onPress!();
  });
}

beforeEach(() => {
  mockUserId = "u1";
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

test("muestra «Mis tareas» y una sección por miembro con lo suyo", async () => {
  setup({
    getTasks: async () => [
      task({ id: "t1", title: "Logo", status: "doing", assigneeId: "u1" }),
      task({ id: "t2", title: "Afiche", status: "done", assigneeId: "u2" }),
      task({ id: "t3", title: "Sin dueño" }),
    ],
  });
  expect(await screen.findByTestId("assignments.mine.t1")).toBeTruthy();
  expect(screen.getByTestId("assignments.done.u2.t2")).toBeTruthy();
  expect(screen.getByTestId("assignments.doing.u1.t1")).toBeTruthy();
  expect(screen.queryByText("Sin dueño")).toBeNull();
  await waitFor(() => expect(screen.getByTestId("assignments.person.u2.name").props.children).toBe("Beto Ruiz"));
});

test("sin tareas dice que no hay nada", async () => {
  setup({ getTasks: async () => [] });
  expect(await screen.findByText("No tienes tareas en curso.")).toBeTruthy();
});

test("el creador asigna: elige tarea, elige persona y confirma", async () => {
  const assignTask = jest.fn(async ({ task: t, assigneeId }) => ({ ...t, status: "doing" as const, assigneeId }));
  setup({ getTasks: async () => [task({})], assignTask });
  fireEvent.press(await screen.findByTestId("assignments.assign"));
  fireEvent.press(screen.getByTestId("assignments.pick.t1.press"));
  fireEvent.press(screen.getByTestId("assignments.to.u2"));
  await confirmAlert("Asignar");
  expect(assignTask).toHaveBeenCalledWith({ task: expect.objectContaining({ id: "t1" }), assigneeId: "u2", requestedBy: "u1" });
  expect(await screen.findByTestId("assignments.doing.u2.t1")).toBeTruthy();
  expect(screen.queryByTestId("assignments.picker")).toBeNull();
});

test("si la asignación falla, avisa y no cambia nada", async () => {
  setup({
    getTasks: async () => [task({})],
    assignTask: async () => {
      throw new Error("Esta tarea ya tiene responsable.");
    },
  });
  fireEvent.press(await screen.findByTestId("assignments.assign"));
  fireEvent.press(screen.getByTestId("assignments.pick.t1.press"));
  fireEvent.press(screen.getByTestId("assignments.to.u2"));
  await confirmAlert("Asignar");
  expect(Alert.alert).toHaveBeenLastCalledWith("No se pudo", "Esta tarea ya tiene responsable.");
});

test("quien no es el creador no ve «Asignar tarea»", async () => {
  mockUserId = "u2";
  setup({ getTasks: async () => [task({})] });
  await screen.findByTestId("assignments.mine");
  expect(screen.queryByTestId("assignments.assign")).toBeNull();
});

test("un error de carga se puede reintentar", async () => {
  let fail = true;
  setup({
    getTasks: async () => {
      if (fail) throw new Error("Sin conexión");
      return [];
    },
  });
  expect(await screen.findByText("Sin conexión")).toBeTruthy();
  fail = false;
  fireEvent.press(screen.getByText("Reintentar"));
  expect(await screen.findByTestId("assignments.mine")).toBeTruthy();
});
