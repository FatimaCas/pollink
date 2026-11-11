import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { emptyProfile } from "@/src/features/profile/domain/entities/UserProfile";
import { FollowRepository } from "@/src/features/follows/domain/repositories/FollowRepository";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { ProfileView } from "@/src/features/profile/presentation/components/ProfileView";
import CollaborationHistoryScreen from "@/src/features/profile/presentation/screens/CollaborationHistoryScreen";
import PersonProfileScreen from "@/src/features/profile/presentation/screens/PersonProfileScreen";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { NO_TRUST } from "@/src/features/trust/domain/entities/TrustMetrics";
import { TrustRepository } from "@/src/features/trust/domain/repositories/TrustRepository";
import { fake } from "../../support/fake";
import { profile } from "../../support/profileFixtures";
import { ownProject } from "../../support/projectFixtures";
import { renderScreen } from "../../support/renderScreen";

const mockNavigate = jest.fn();
let mockParams: Record<string, unknown> = { userId: "u9" };
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../../support/sessionMock").fakeSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ navigate: mockNavigate, addListener: () => () => {}, setOptions: () => {} }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
  mockParams = { userId: "u9" };
});

describe("PersonProfileScreen", () => {
  function setup({ getProfileOf = async () => profile({ userId: "u9", name: "Mateo Ríos" }), projects = [ownProject({ id: "a", title: "Huerta" })] as ReturnType<typeof ownProject>[], follows = {} as Partial<FollowRepository> } = {}) {
    const c = new Container()
      .register(TOKENS.FollowRepo, fake<FollowRepository>({ followingIds: async () => [], followersCount: async () => 3, ...follows }, "FollowRepo"))
      .register(TOKENS.ProfileRepo, fake<ProfileRepository>({ getProfileOf }, "ProfileRepo"))
      .register(TOKENS.ProjectRepo, fake<ProjectRepository>({ getProjectsOfPerson: async () => projects }, "ProjectRepo"))
      .register(TOKENS.TrustRepo, fake<TrustRepository>({ getTrustMetricsOf: async () => NO_TRUST }, "TrustRepo"));
    return renderScreen(PersonProfileScreen, c);
  }

  test("muestra el perfil de la otra persona, sin «Editar perfil»", async () => {
    setup();
    expect(await screen.findByTestId(ProfileView.nameKey)).toHaveTextContent("Mateo Ríos");
    expect(screen.getByTestId(ProfileView.programKey)).toHaveTextContent("Diseño Gráfico");
    expect(screen.queryByText("Editar perfil")).toBeNull();
  });

  test("muestra los seguidores y deja seguir a la persona", async () => {
    const follow = jest.fn(async () => {});
    setup({ follows: { follow } });
    expect(await screen.findByTestId(PersonProfileScreen.followersKey)).toHaveTextContent("3 seguidores");
    fireEvent.press(screen.getByTestId(PersonProfileScreen.followKey));
    expect(await screen.findByText("Siguiendo")).toBeTruthy();
    expect(follow).toHaveBeenCalledWith({ followerId: "u2", followedId: "u9" });
  });

  test("en su propio perfil no hay botón de seguir", async () => {
    mockParams = { userId: "u2" };
    setup({ getProfileOf: async () => profile({ userId: "u2", name: "Laura Pérez" }) });
    await screen.findByTestId(ProfileView.nameKey);
    expect(screen.queryByTestId(PersonProfileScreen.followKey)).toBeNull();
  });

  test("sin fila de perfil usa un nombre genérico", async () => {
    setup({ getProfileOf: async () => emptyProfile("u9") });
    expect(await screen.findByTestId(ProfileView.nameKey)).toHaveTextContent("Usuario");
  });

  test("lista en qué anda y abre el proyecto", async () => {
    setup();
    expect(await screen.findByText("En qué anda")).toBeTruthy();
    fireEvent.press(await screen.findByTestId("profileProject.a"));
    expect(mockNavigate).toHaveBeenCalledWith("ProjectInfo", { projectId: "a" });
  });

  test("abre el historial de colaboración", async () => {
    setup();
    fireEvent.press(await screen.findByTestId(PersonProfileScreen.historyKey));
    expect(mockNavigate).toHaveBeenCalledWith("CollaborationHistory", { userId: "u9" });
  });

  test("la confianza solo aparece si se llega desde un proyecto", async () => {
    setup();
    await screen.findByTestId(ProfileView.nameKey);
    expect(screen.queryByTestId(PersonProfileScreen.trustKey)).toBeNull();
  });

  test("desde un proyecto muestra la confianza y abre su detalle", async () => {
    mockParams = { userId: "u9", projectId: "p1" };
    setup();
    fireEvent.press(await screen.findByTestId(PersonProfileScreen.trustKey));
    expect(mockNavigate).toHaveBeenCalledWith("TrustIndicators", { userId: "u9" });
  });

  test("si no carga ofrece reintentar", async () => {
    let fail = true;
    setup({
      getProfileOf: async () => {
        if (fail) throw new Error("Sin conexión.");
        return profile({ userId: "u9", name: "Mateo Ríos" });
      },
    });
    expect(await screen.findByText("Sin conexión.")).toBeTruthy();
    fail = false;
    fireEvent.press(screen.getByTestId(PersonProfileScreen.retryKey));
    expect(await screen.findByTestId(ProfileView.nameKey)).toBeTruthy();
  });
});

describe("CollaborationHistoryScreen", () => {
  const projects = [
    ownProject({ id: "a", title: "Huerta", status: "open" }),
    ownProject({ id: "b", title: "Radio", status: "closed" }),
  ];
  const setup = (getProjectsParticipatedBy: ProjectRepository["getProjectsParticipatedBy"] = async () => projects) =>
    renderScreen(CollaborationHistoryScreen, new Container().register(TOKENS.ProjectRepo, fake<ProjectRepository>({ getProjectsParticipatedBy }, "ProjectRepo")));

  test("lista todos los proyectos en que participó y abre su ficha", async () => {
    setup();
    expect(await screen.findByTestId("history.a")).toBeTruthy();
    expect(screen.getByTestId("history.b")).toBeTruthy();
    fireEvent.press(screen.getByTestId("history.b"));
    expect(mockNavigate).toHaveBeenCalledWith("ProjectInfo", { projectId: "b" });
  });

  test("con onlyPrevious solo los cerrados", async () => {
    mockParams = { userId: "u9", onlyPrevious: true };
    setup();
    expect(await screen.findByTestId("history.b")).toBeTruthy();
    expect(screen.queryByTestId("history.a")).toBeNull();
  });

  test("sin historial lo dice", async () => {
    setup(async () => []);
    expect(await screen.findByText("Sin historial todavía")).toBeTruthy();
  });

  test("si falla ofrece reintentar", async () => {
    let fail = true;
    setup(async () => {
      if (fail) throw new Error("Sin conexión.");
      return projects;
    });
    expect(await screen.findByText("Sin conexión.")).toBeTruthy();
    fail = false;
    fireEvent.press(screen.getByTestId(CollaborationHistoryScreen.retryKey));
    expect(await screen.findByTestId("history.a")).toBeTruthy();
  });
});
