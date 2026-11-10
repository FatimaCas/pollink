import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import ProjectMembersScreen from "@/src/features/members/presentation/screens/ProjectMembersScreen";
import { fake } from "../support/fake";
import { renderScreen } from "../support/renderScreen";

const mockNavigate = jest.fn();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  useSession: () => ({
    currentUser: () => ({ userId: "u2", name: "Yo", email: "y@x.co", isAnonymous: false }),
    ensureLoggedIn: () => true,
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: { projectId: "p1" } }),
  useNavigation: () => ({ navigate: mockNavigate, addListener: () => () => {}, setOptions: () => {} }),
}));

const members = [
  { userId: "u1", role: "owner" as const, joinedAt: new Date(2026, 9, 1) },
  { userId: "u2", role: "collaborator" as const, joinedAt: new Date(2026, 9, 2) },
];

function setup(repo: Partial<MembersRepository>) {
  const c = new Container();
  c.register(TOKENS.MembersRepo, fake<MembersRepository>(repo, "MembersRepo"));
  return renderScreen(ProjectMembersScreen, c);
}

beforeEach(() => mockNavigate.mockClear());

test("lista a los miembros con papel y fecha, y marca «Tú»", async () => {
  setup({ activeMembers: async () => members });
  expect(await screen.findByText("2 miembros")).toBeTruthy();
  expect(screen.getByTestId("members.row.u1.name").props.children).toBe("Otra persona");
  expect(screen.getByTestId("members.row.u1.subtitle").props.children).toMatch(/^Creador · desde 1 oct 2026$/);
  expect(screen.getByTestId("members.row.u2.name").props.children).toBe("Tú");
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
