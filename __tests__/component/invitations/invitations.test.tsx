import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { DummyData } from "@/src/core/data/dummyData";
import { createLocalContainer } from "@/src/core/di/localContainer";
import { TABLES } from "@/src/core/roble/tables";
import InvitationsScreen from "@/src/features/invitations/presentation/screens/InvitationsScreen";
import { renderScreen } from "../../support/renderScreen";

// Contra el contenedor en memoria con los proyectos de demo de A: p_1 (de Ana,
// abierto) y p_3 (de Carla, cerrado). Beto es quien recibe las invitaciones.
const beto = { userId: "u_beto", name: "Beto", email: "beto@demo.com", isAnonymous: false };
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../../support/sessionMock").fakeSession({ user: beto, currentUser: () => beto }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return { ...actual, useNavigation: () => ({ ...actual.useNavigation(), navigate: mockNavigate }) };
});

const invite = (id: string, projectId: string, invitedBy: string) => ({
  _id: id,
  _owner: invitedBy,
  project_id: projectId,
  user_id: "u_beto",
  email: "beto@demo.com",
  status: "pending",
  createdAt: "2026-11-01T12:00:00.000Z",
});

function setup() {
  const data = new DummyData({ latencyMs: 0 });
  data.session = { userId: "u_beto" };
  const container = createLocalContainer(data);
  data.table(TABLES.projectInvitation).push(invite("i1", "p_1", "u_ana"), invite("i3", "p_3", "u_carla"));
  // Beto se había postulado a p_1: al aceptar la invitación esa solicitud sobra.
  data.table(TABLES.projectJoinRequest).push({ _id: "r1", project_id: "p_1", user_id: "u_beto", status: { state: "pending" } });
  renderScreen(InvitationsScreen, container);
  return data;
}

beforeEach(() => mockNavigate.mockClear());

test("muestra solo las invitaciones a proyectos abiertos, con quién invitó", async () => {
  setup();
  expect(await screen.findByText("Fresitas")).toBeTruthy();
  expect(screen.queryByTestId("invitation.i3")).toBeNull();
  expect(screen.getByTestId("invitation.i1.inviter")).toHaveTextContent(/Te invitó el creador del proyecto/);
  fireEvent.press(screen.getByTestId("invitation.i1.inviter"));
  expect(mockNavigate).toHaveBeenCalledWith("PersonProfile", { userId: "u_ana" });
  fireEvent.press(screen.getByTestId("invitation.i1.project"));
  expect(mockNavigate).toHaveBeenCalledWith("ProjectDetail", { projectId: "p_1" });
});

test("aceptar lo vuelve miembro, marca la invitación y cancela su solicitud", async () => {
  const data = setup();
  fireEvent.press(await screen.findByTestId("invitation.i1.accept"));
  expect(await screen.findByText("No tienes invitaciones pendientes")).toBeTruthy();
  expect(screen.queryByTestId("invitation.i1")).toBeNull();
  expect(data.table(TABLES.projectMember)).toContainEqual(
    expect.objectContaining({ project_id: "p_1", user_id: "u_beto", status: "active" }),
  );
  expect(data.table(TABLES.projectInvitation).find((r) => r._id === "i1")?.status).toBe("accepted");
  expect(JSON.stringify(data.table(TABLES.projectJoinRequest)[0].status)).toContain("cancelled");
});

test("rechazar la marca y no lo vuelve miembro", async () => {
  const data = setup();
  fireEvent.press(await screen.findByTestId("invitation.i1.decline"));
  await waitFor(() => expect(data.table(TABLES.projectInvitation).find((r) => r._id === "i1")?.status).toBe("declined"));
  expect(data.table(TABLES.projectMember).some((m) => m.project_id === "p_1" && m.user_id === "u_beto")).toBe(false);
});
