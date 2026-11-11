import { Alert } from "react-native";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import ProjectMembersScreen from "@/src/features/members/presentation/screens/ProjectMembersScreen";
import { profile } from "../../support/profileFixtures";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";

let mockGuest = false;
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  useSession: () => ({
    currentUser: () => (mockGuest ? { userId: "g1", name: "", email: "", isAnonymous: true } : { userId: "u2", name: "Yo", email: "y@x.co", isAnonymous: false }),
    ensureLoggedIn: () => true,
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: { projectId: "p1" } }),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, addListener: () => () => {}, setOptions: () => {} }),
}));

const members = [
  { userId: "u1", role: "owner" as const, joinedAt: new Date(2026, 9, 1) },
  { userId: "u2", role: "collaborator" as const, joinedAt: new Date(2026, 9, 2) },
];

function setup(
  repo: Partial<MembersRepository>,
  tasks: Partial<TaskRepository> = {},
  names: Record<string, string> = {},
  getProfileOf?: ProfileRepository["getProfileOf"],
) {
  const c = new Container();
  c.register(TOKENS.TaskRepo, fake<TaskRepository>(tasks, "TaskRepo"));
  c.register(TOKENS.MembersRepo, fake<MembersRepository>(repo, "MembersRepo"));
  c.register(TOKENS.ProfileRepo, fake<ProfileRepository>({ getNamesOf: async () => names, ...(getProfileOf && { getProfileOf }) }, "ProfileRepo"));
  return renderScreen(ProjectMembersScreen, c);
}

beforeEach(() => {
  mockGuest = false;
  mockNavigate.mockClear();
  mockGoBack.mockClear();
});

// Pulsa el botón de confirmación del Alert abierto.
async function confirmAlert(label: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
  await act(async () => {
    await buttons.find((b) => b.text === label)!.onPress!();
  });
}

test("lista a los miembros con papel y fecha, y marca «Tú»", async () => {
  setup({ activeMembers: async () => members });
  expect(await screen.findByText("2 miembros")).toBeTruthy();
  expect(screen.getByTestId("members.row.u1.name").props.children).toBe("Otra persona");
  expect(screen.getByTestId("members.row.u1.subtitle").props.children).toMatch(/^Creador · desde 1 oct 2026$/);
  expect(screen.getByTestId("members.row.u2.name").props.children).toBe("Tú");
});

test("muestra el nombre de los demás cuando llega del directorio", async () => {
  setup({ activeMembers: async () => members }, {}, { u1: "Ifeoma Zuluaga" });
  await waitFor(() => expect(screen.getByTestId("members.row.u1.name").props.children).toBe("Ifeoma Zuluaga"));
  expect(screen.getByTestId("members.row.u2.name").props.children).toBe("Tú");
});

test("pone la carrera en el subtítulo y, si el perfil falla, deja la fila como estaba", async () => {
  setup({ activeMembers: async () => members }, {}, {}, async (userId) => {
    if (userId === "u1") return profile({ userId, career: { program: "Ingeniería Acústica", institution: "Uninorte" } });
    throw new Error("sin red");
  });
  await waitFor(() =>
    expect(screen.getByTestId("members.row.u1.subtitle").props.children).toBe("Ingeniería Acústica · Creador · desde 1 oct 2026"),
  );
  expect(screen.getByTestId("members.row.u2.subtitle").props.children).toBe("Colaborador · desde 2 oct 2026");
});

test("un invitado ve la lista de miembros, sin «Salir» ni «Quitar»", async () => {
  mockGuest = true;
  setup({ activeMembers: async () => members });
  expect(await screen.findByText("2 miembros")).toBeTruthy();
  expect(screen.getByTestId("members.row.u1.name").props.children).toBe("Otra persona");
  expect(screen.queryByText("Salir del proyecto")).toBeNull();
  expect(screen.queryByLabelText("Quitar del proyecto")).toBeNull();
});

test("«Seguir» sale desactivado, no en la fila propia, con el aviso discreto", async () => {
  setup({ activeMembers: async () => members });
  await screen.findByText("2 miembros");
  expect(screen.getByTestId("members.follow.u1")).toBeTruthy();
  expect(screen.queryByTestId("members.follow.u2")).toBeNull();
  expect(screen.getByTestId("members.followSoon")).toBeTruthy();
});

test("tocar una fila abre el perfil de esa persona", async () => {
  setup({ activeMembers: async () => members });
  fireEvent.press(await screen.findByTestId("members.row.u1"));
  expect(mockNavigate).toHaveBeenCalledWith("PersonProfile", { userId: "u1", projectId: "p1" });
});

test("si falla la carga ofrece reintentar y se recupera", async () => {
  const activeMembers = jest.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue(members);
  setup({ activeMembers });
  fireEvent.press(await screen.findByText("Reintentar"));
  await waitFor(() => expect(screen.getByText("2 miembros")).toBeTruthy());
});

test("sin miembros muestra el vacío", async () => {
  setup({ activeMembers: async () => [] });
  expect(await screen.findByText("Aún no hay miembros en este proyecto.")).toBeTruthy();
});

describe("salir y quitar (D3)", () => {
  beforeEach(() => jest.spyOn(Alert, "alert").mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  test("un colaborador puede salir, no quitar; sale, libera sus tareas y vuelve atrás", async () => {
    const leave = jest.fn().mockResolvedValue(undefined);
    const release = jest.fn().mockResolvedValue(1);
    setup({ activeMembers: async () => members, leave }, { releaseUnfinishedTasks: release });
    fireEvent.press(await screen.findByTestId("members.leave"));
    expect(screen.queryByTestId("members.remove.u1")).toBeNull();
    await confirmAlert("Salir");
    expect(leave).toHaveBeenCalledWith({ projectId: "p1", userId: "u2" });
    expect(release).toHaveBeenCalledWith({ projectId: "p1", userId: "u2" });
    expect(mockGoBack).toHaveBeenCalled();
  });

  test("si salir falla avisa y no vuelve atrás ni libera tareas", async () => {
    const release = jest.fn();
    setup(
      { activeMembers: async () => members, leave: jest.fn().mockRejectedValue(new Error("sin red")) },
      { releaseUnfinishedTasks: release },
    );
    fireEvent.press(await screen.findByTestId("members.leave"));
    await confirmAlert("Salir");
    expect((Alert.alert as jest.Mock).mock.calls.at(-1)![0]).toBe("No se pudo");
    expect(release).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  test("el creador ve «Quitar» en los demás, no «Salir»; quita, libera y actualiza la lista", async () => {
    const asCreator = [
      { userId: "u2", role: "owner" as const, joinedAt: new Date(2026, 9, 1) },
      { userId: "u3", role: "collaborator" as const, joinedAt: new Date(2026, 9, 3) },
    ];
    const remove = jest.fn().mockResolvedValue(undefined);
    const release = jest.fn().mockResolvedValue(0);
    setup({ activeMembers: async () => asCreator, remove }, { releaseUnfinishedTasks: release });
    expect(await screen.findByText("2 miembros")).toBeTruthy();
    expect(screen.queryByTestId("members.leave")).toBeNull();
    expect(screen.queryByTestId("members.remove.u2")).toBeNull();
    fireEvent.press(screen.getByTestId("members.remove.u3"));
    await confirmAlert("Quitar");
    expect(remove).toHaveBeenCalledWith({ projectId: "p1", memberUserId: "u3", requestedBy: "u2" });
    expect(release).toHaveBeenCalledWith({ projectId: "p1", userId: "u3" });
    await waitFor(() => expect(screen.getByText("1 miembro")).toBeTruthy());
  });

  test("un colaborador no ve «Quitar» en nadie", async () => {
    setup({ activeMembers: async () => members });
    await screen.findByText("2 miembros");
    expect(screen.queryByTestId("members.remove.u1")).toBeNull();
  });
});
