import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { Text as RNText } from "react-native";

import ProjectWorkspaceScreen from "@/src/features/projects/presentation/screens/ProjectWorkspaceScreen";
import { Container } from "@/src/core/di/container";
import { renderScreen } from "../../support/renderScreen";

// Los mocks de jest solo pueden usar nombres que empiezan por `mock`.
const MockBody = ({ children }: { children: React.ReactNode }) => <RNText testID="body">{children}</RNText>;
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
let mockTab = "tasks";
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: { projectId: "p1", tab: mockTab } }),
}));
// Cada cuerpo ya tiene sus propias pruebas: aquí solo importa cuál se monta.
jest.mock("@/src/features/members/presentation/screens/ProjectMembersScreen", () => ({
  ProjectMembersTab: ({ projectId }: { projectId: string }) => <MockBody>members:{projectId}</MockBody>,
}));
jest.mock("@/src/features/tasks/presentation/screens/TaskBoardScreen", () => ({
  TaskBoardTab: ({ projectId }: { projectId: string }) => <MockBody>tasks:{projectId}</MockBody>,
}));
jest.mock("@/src/features/tasks/presentation/screens/AssignmentsScreen", () => ({
  AssignmentsTab: ({ projectId }: { projectId: string }) => <MockBody>assignments:{projectId}</MockBody>,
}));

const K = ProjectWorkspaceScreen.tabsKey;

describe("ProjectWorkspaceScreen", () => {
  test("abre en la pestaña pedida y cambia sin salir de la pantalla", () => {
    mockTab = "assignments";
    renderScreen(ProjectWorkspaceScreen, new Container());
    expect(screen.getByTestId("body")).toHaveTextContent("assignments:p1");
    fireEvent.press(screen.getByTestId(`${K}.members`));
    expect(screen.getByTestId("body")).toHaveTextContent("members:p1");
    fireEvent.press(screen.getByTestId(`${K}.tasks`));
    expect(screen.getByTestId("body")).toHaveTextContent("tasks:p1");
  });
});
