import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { DummyData } from "@/src/core/data/dummyData";
import { createLocalContainer } from "@/src/core/di/localContainer";
import { TABLES } from "@/src/core/roble/tables";
import ProjectDetailScreen from "@/src/features/projects/presentation/screens/ProjectDetailScreen";
import { CloseProjectDialog } from "@/src/features/projects/presentation/components/CloseProjectDialog";
import { ProjectActionsMenu } from "@/src/features/projects/presentation/components/ProjectActionsMenu";
import ProjectInfoScreen from "@/src/features/projects/presentation/screens/ProjectInfoScreen";
import { renderScreen } from "../support/renderScreen";

// Contra el contenedor en memoria, con los proyectos de demo que siembra
// `registerDiscoverLocal`: p_1 (de Ana, abierto), p_2 (de Beto), p_3 (de Carla, cerrado).
let mockUser = { userId: "u_beto", name: "Beto", email: "beto@demo.com", isAnonymous: false };
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../support/sessionMock").fakeSession({ user: mockUser, currentUser: () => mockUser }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

let mockProjectId = "p_1";
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useRoute: () => ({ params: { projectId: mockProjectId } }),
    // La navegación real (para el header), con `navigate` espiado.
    useNavigation: () => ({ ...actual.useNavigation(), navigate: mockNavigate }),
  };
});

function setup(Screen: React.ComponentType, projectId: string, userId = "u_beto", prepare?: (data: DummyData) => void) {
  mockProjectId = projectId;
  mockUser = { ...mockUser, userId };
  const data = new DummyData({ latencyMs: 0 });
  data.session = { userId };
  const container = createLocalContainer(data);
  prepare?.(data);
  renderScreen(Screen, container);
  return data;
}

beforeEach(() => mockNavigate.mockClear());

describe("ProjectDetailScreen", () => {
  const K = ProjectDetailScreen;

  test("un proyecto ajeno y abierto muestra su información y «Solicitar unirme»", async () => {
    setup(ProjectDetailScreen, "p_1");
    expect(await screen.findByTestId(K.titleKey)).toHaveTextContent("Fresitas");
    expect(screen.getByTestId(K.membersKey)).toHaveTextContent("1 integrante");
    expect(screen.getByText("Gastronomía")).toBeTruthy();
    expect(screen.getByTestId(K.applyKey)).toBeTruthy();
    expect(screen.queryByTestId(K.relationKey)).toBeNull();
  });

  test("al creador le dice que es suyo y lo deja abrir la ficha", async () => {
    setup(ProjectDetailScreen, "p_2");
    expect(await screen.findByTestId(K.relationKey)).toHaveTextContent("Eres el creador de este proyecto.");
    expect(screen.queryByTestId(K.applyKey)).toBeNull();
    fireEvent.press(screen.getByTestId(K.openKey));
    expect(mockNavigate).toHaveBeenCalledWith("ProjectInfo", { projectId: "p_2" });
  });

  test("un proyecto cerrado avisa y no deja postularse", async () => {
    setup(ProjectDetailScreen, "p_3");
    expect(await screen.findByTestId("closedProjectBanner")).toBeTruthy();
    expect(screen.queryByTestId(K.applyKey)).toBeNull();
  });

  test("quien tiene una invitación pendiente va a sus invitaciones", async () => {
    setup(ProjectDetailScreen, "p_1", "u_beto", (data) =>
      data.table(TABLES.projectInvitation).push({ _id: "i1", project_id: "p_1", user_id: "u_beto", status: "pending" }),
    );
    fireEvent.press(await screen.findByTestId(K.invitationsKey));
    expect(mockNavigate).toHaveBeenCalledWith("Invitations");
    expect(screen.queryByTestId(K.applyKey)).toBeNull();
  });

  test("guardar lo marca en el header", async () => {
    const data = setup(ProjectDetailScreen, "p_1");
    fireEvent.press(await screen.findByTestId(K.saveKey));
    await waitFor(() => expect(data.table(TABLES.projectSaved)).toEqual([expect.objectContaining({ project_id: "p_1", user_id: "u_beto" })]));
  });

  test("un proyecto que no existe lo dice", async () => {
    setup(ProjectDetailScreen, "nada");
    expect(await screen.findByText("Este proyecto ya no existe.")).toBeTruthy();
  });
});

describe("ProjectInfoScreen", () => {
  const K = ProjectInfoScreen;

  test("«Progreso» muestra el avance y lleva a Miembros, Tareas y Solicitudes", async () => {
    setup(ProjectInfoScreen, "p_1", "u_ana");
    expect(await screen.findByTestId(K.percentKey)).toHaveTextContent("60%");
    expect(screen.getByTestId(K.tasksSummaryKey)).toHaveTextContent("Aún no hay tareas en este proyecto.");
    fireEvent.press(screen.getByTestId(K.membersKey));
    expect(mockNavigate).toHaveBeenCalledWith("ProjectMembers", { projectId: "p_1" });
    fireEvent.press(screen.getByTestId(K.tasksKey));
    expect(mockNavigate).toHaveBeenCalledWith("TaskBoard", { projectId: "p_1" });
    fireEvent.press(screen.getByTestId(K.requestsKey));
    expect(mockNavigate).toHaveBeenCalledWith("CollaborationRequests", { projectId: "p_1" });
  });

  test("un miembro no ve Solicitudes ni puede editar la información", async () => {
    setup(ProjectInfoScreen, "p_1", "u_beto");
    await screen.findByTestId(K.percentKey);
    expect(screen.queryByTestId(K.requestsKey)).toBeNull();
    fireEvent.press(screen.getByTestId(`${K.tabsKey}.info`));
    expect(screen.getByTestId(K.readOnlyKey)).toHaveTextContent("Solo el creador del proyecto puede editar esta información.");
    expect(screen.queryByTestId(K.saveKey)).toBeNull();
  });

  test("el creador edita la información básica y se guarda", async () => {
    const data = setup(ProjectInfoScreen, "p_1", "u_ana");
    fireEvent.press(await screen.findByTestId(`${K.tabsKey}.info`));
    fireEvent.changeText(screen.getByTestId(K.titleFieldKey), "Fresitas con crema");
    fireEvent.changeText(screen.getByTestId(`${K.skillsKey}.input`), "Repostería");
    fireEvent.press(screen.getByTestId(`${K.skillsKey}.add`));
    fireEvent.press(screen.getByTestId(K.saveKey));
    await waitFor(() =>
      expect(data.table(TABLES.project).find((p) => p._id === "p_1")).toMatchObject({
        title: "Fresitas con crema",
        skills: JSON.stringify(["Postres", "Costos", "Repostería"]),
      }),
    );
  });
});

describe("cerrar proyecto (C5)", () => {
  const K = ProjectInfoScreen;

  // Abre ⋮ y elige «Cerrar proyecto». El menú de Paper ignora toques mientras
  // termina de aparecer: se reintenta hasta que el diálogo se abre.
  async function openCloseDialog() {
    await screen.findByTestId(K.statusKey);
    fireEvent.press(screen.getByTestId(ProjectActionsMenu.openKey));
    await waitFor(() => {
      fireEvent.press(screen.getByTestId(ProjectActionsMenu.closeKey));
      expect(screen.getByTestId(CloseProjectDialog.confirmKey)).toBeTruthy();
    });
  }

  test("el creador lo cierra desde ⋮, confirma y queda cerrado", async () => {
    const data = setup(ProjectInfoScreen, "p_1", "u_ana");
    expect(await screen.findByTestId(K.statusKey)).toHaveTextContent("Abierto");
    await openCloseDialog();
    expect(screen.getByText("¿Cerrar «Fresitas»?")).toBeTruthy();
    fireEvent.press(screen.getByTestId(CloseProjectDialog.confirmKey));

    await waitFor(() => expect(data.table(TABLES.project).find((p) => p._id === "p_1")?.status).toBe("closed"));
    expect(await screen.findByTestId("closedProjectBanner")).toBeTruthy();
    expect(screen.getByTestId(K.statusKey)).toHaveTextContent("Cerrado");
    // Ya cerrado: no hay ⋮ y la info básica no se edita.
    await waitFor(() => expect(screen.queryByTestId(ProjectActionsMenu.openKey)).toBeNull());
    fireEvent.press(screen.getByTestId(`${K.tabsKey}.info`));
    expect(screen.getByTestId(K.readOnlyKey)).toHaveTextContent(/El proyecto está cerrado/);
  });

  test("cancelar no cierra nada", async () => {
    const data = setup(ProjectInfoScreen, "p_1", "u_ana");
    await openCloseDialog();
    fireEvent.press(screen.getByTestId(CloseProjectDialog.cancelKey));
    // (El diálogo se va con una animación que en Jest no siempre termina: se
    // comprueba lo que importa, que el proyecto sigue abierto.)
    expect(data.table(TABLES.project).find((p) => p._id === "p_1")?.status).toBe("open");
    expect(screen.getByTestId(K.statusKey)).toHaveTextContent("Abierto");
    expect(screen.getByTestId(ProjectActionsMenu.openKey)).toBeTruthy();
  });

  test("un miembro no tiene ⋮", async () => {
    setup(ProjectInfoScreen, "p_1", "u_beto");
    await screen.findByTestId(K.percentKey);
    expect(screen.queryByTestId(ProjectActionsMenu.openKey)).toBeNull();
  });

  test("el detalle público muestra el estado", async () => {
    setup(ProjectDetailScreen, "p_3");
    expect(await screen.findByTestId(ProjectDetailScreen.statusKey)).toHaveTextContent("Cerrado");
  });
});
