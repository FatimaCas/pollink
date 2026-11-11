import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Button } from "react-native-paper";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { AccountRequiredDialog } from "@/src/features/auth/presentation/components/AccountRequiredDialog";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import ApplicationSentScreen from "@/src/features/discover/presentation/screens/ApplicationSentScreen";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { ApplyToProject } from "@/src/features/requests/presentation/components/ApplyToProject";
import { ConfirmApplicationDialog } from "@/src/features/requests/presentation/components/ConfirmApplicationDialog";
import ApplicantDetailScreen from "@/src/features/requests/presentation/screens/ApplicantDetailScreen";
import CollaborationRequestsScreen from "@/src/features/requests/presentation/screens/CollaborationRequestsScreen";
import RequestDecisionScreen from "@/src/features/requests/presentation/screens/RequestDecisionScreen";
import { project } from "../../support/discoverFixtures";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";
import { joinRequest } from "../../support/requestFixtures";

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockParams: Record<string, unknown> = {};
let mockSessionOver: Record<string, unknown> = {};
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  useSession: () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../support/sessionMock").fakeSession({
      currentUser: () => ({ userId: "u_owner", name: "Dueña", email: "o@x.co", isAnonymous: false }),
      ...mockSessionOver,
    }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ navigate: mockNavigate, dispatch: mockDispatch, addListener: () => () => {}, setOptions: () => {} }),
}));

function containerWith(requests: Partial<JoinRequestRepository>, members: Partial<MembersRepository> = {}, discover: Partial<DiscoverRepository> = {}) {
  return new Container()
    .register(TOKENS.JoinRequestRepo, fake<JoinRequestRepository>(requests, "JoinRequestRepo"))
    .register(TOKENS.MembersRepo, fake<MembersRepository>(members, "MembersRepo"))
    .register(TOKENS.InvitationRepo, fake<InvitationRepository>({ cancelPending: async () => 0 }, "InvitationRepo"))
    .register(TOKENS.DiscoverRepo, fake<DiscoverRepository>(discover, "DiscoverRepo"));
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockDispatch.mockClear();
  mockParams = {};
  mockSessionOver = {};
});

describe("postularse (A7)", () => {
  function ApplyHarness() {
    return (
      <ApplyToProject projectId="p1" projectTitle="Fresitas">
        {({ start }) => <Button onPress={start} testID="harness.start">Solicitar unirme</Button>}
      </ApplyToProject>
    );
  }
  const requests = (over: Partial<JoinRequestRepository> = {}) => ({ apply: async () => joinRequest(), ...over });

  test("con cuenta: confirma con el nombre del proyecto y pasa a «Solicitud enviada»", async () => {
    const apply = jest.fn().mockResolvedValue(joinRequest());
    renderScreen(ApplyHarness, containerWith(requests({ apply }), { activeMemberIds: async () => [] }));
    fireEvent.press(screen.getByTestId("harness.start"));
    expect(await screen.findByText("¿Postularte al proyecto?")).toBeTruthy();
    expect(screen.getByTestId(ConfirmApplicationDialog.titleKey).props.children).toBe("Fresitas");
    fireEvent.press(screen.getByTestId(ConfirmApplicationDialog.confirmKey));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("ApplicationSent", { projectId: "p1" }));
    expect(apply).toHaveBeenCalledWith({ projectId: "p1", userId: "u_owner" });
  });

  test("cancelar cierra el diálogo sin enviar nada", async () => {
    const apply = jest.fn();
    renderScreen(ApplyHarness, containerWith(requests({ apply }), { activeMemberIds: async () => [] }));
    fireEvent.press(screen.getByTestId("harness.start"));
    fireEvent.press(await screen.findByTestId(ConfirmApplicationDialog.cancelKey));
    expect(apply).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("si el servidor rechaza, el diálogo muestra el motivo y no navega", async () => {
    const apply = async () => {
      throw new Error("Ya tienes una postulación pendiente aquí.");
    };
    renderScreen(ApplyHarness, containerWith(requests({ apply }), { activeMemberIds: async () => [] }));
    fireEvent.press(screen.getByTestId("harness.start"));
    fireEvent.press(await screen.findByTestId(ConfirmApplicationDialog.confirmKey));
    expect(await screen.findByText("Ya tienes una postulación pendiente aquí.")).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("un invitado ve «Necesitas una cuenta» y puede ir a entrar o a crearla", async () => {
    mockSessionOver = { hasAccount: false, isGuest: true };
    renderScreen(ApplyHarness, containerWith(requests()));
    fireEvent.press(screen.getByTestId("harness.start"));
    expect(await screen.findByText("Necesitas una cuenta")).toBeTruthy();
    expect(screen.queryByText("¿Postularte al proyecto?")).toBeNull();
    fireEvent.press(screen.getByTestId(AccountRequiredDialog.registerKey));
    expect(mockNavigate).toHaveBeenCalledWith("Register");
  });

  test("«Solicitud enviada» nombra el proyecto y ofrece ver el proyecto o ir al inicio", async () => {
    mockParams = { projectId: "p1" };
    renderScreen(ApplicationSentScreen, containerWith({}, {}, { projectById: async () => project({ title: "Fresitas" }) }));
    expect(await screen.findByText("Tu solicitud para unirte al proyecto Fresitas ha sido enviada.")).toBeTruthy();
    fireEvent.press(screen.getByTestId(ApplicationSentScreen.homeKey));
    expect(mockNavigate).toHaveBeenCalledWith("Tabs", { screen: "Discover" });
    fireEvent.press(screen.getByTestId(ApplicationSentScreen.viewProjectKey));
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  test("si no se puede leer el proyecto, «Solicitud enviada» dice «el proyecto»", async () => {
    mockParams = { projectId: "p1" };
    renderScreen(ApplicationSentScreen, containerWith({}, {}, { projectById: async () => { throw new Error("x"); } }));
    expect(await screen.findByText("Tu solicitud para unirte al proyecto el proyecto ha sido enviada.")).toBeTruthy();
  });
});

describe("lista de solicitudes (A8)", () => {
  beforeEach(() => {
    mockParams = { projectId: "p1" };
  });

  test("cuenta las pendientes, marca las resueltas y abre la ficha al tocar", async () => {
    const list = [joinRequest({ id: "a" }), joinRequest({ id: "b", state: "rejected" })];
    renderScreen(CollaborationRequestsScreen, containerWith({ requestsForProject: async () => list }));
    expect(await screen.findByText("1 solicitud pendiente")).toBeTruthy();
    expect(screen.getByTestId("requests.row.b.subtitle").props.children).toMatch(/^Rechazada/);
    fireEvent.press(screen.getByTestId("requests.row.a"));
    expect(mockNavigate).toHaveBeenCalledWith("ApplicantDetail", { requestId: "a" });
  });

  test("sin solicitudes muestra el vacío", async () => {
    renderScreen(CollaborationRequestsScreen, containerWith({ requestsForProject: async () => [] }));
    expect(await screen.findByText("Aún no hay solicitudes")).toBeTruthy();
  });

  test("si falla ofrece reintentar y se recupera", async () => {
    const requestsForProject = jest.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue([joinRequest()]);
    renderScreen(CollaborationRequestsScreen, containerWith({ requestsForProject }));
    fireEvent.press(await screen.findByTestId(CollaborationRequestsScreen.retryKey));
    expect(await screen.findByText("1 solicitud pendiente")).toBeTruthy();
  });
});

describe("ficha del aplicante (A8)", () => {
  beforeEach(() => {
    mockParams = { requestId: "r1" };
  });
  const accepting = (over: Partial<JoinRequestRepository> = {}) => ({
    requestById: async () => joinRequest(),
    ensureAcceptable: async () => joinRequest(),
    decide: async () => joinRequest({ state: "accepted" }),
    cancelPending: async () => 0,
    ...over,
  });

  test("aceptar agrega al miembro y va a la pantalla de resultado", async () => {
    const addMember = jest.fn().mockResolvedValue({});
    renderScreen(ApplicantDetailScreen, containerWith(accepting(), { addMember }));
    fireEvent.press(await screen.findByTestId(ApplicantDetailScreen.acceptKey));
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));
    expect(addMember).toHaveBeenCalledWith({ projectId: "p1", userId: "u_ana" });
    expect(mockDispatch.mock.calls[0][0]).toMatchObject({ payload: { name: "RequestDecision", params: { requestId: "r1", accepted: true } } });
  });

  test("rechazar pide confirmación antes de hacerlo", async () => {
    const decide = jest.fn().mockResolvedValue(joinRequest({ state: "rejected" }));
    renderScreen(ApplicantDetailScreen, containerWith(accepting({ decide })));
    fireEvent.press(await screen.findByTestId(ApplicantDetailScreen.rejectKey));
    expect(decide).not.toHaveBeenCalled();
    fireEvent.press(await screen.findByTestId(ApplicantDetailScreen.confirmRejectKey));
    await waitFor(() => expect(decide).toHaveBeenCalledWith({ requestId: "r1", accepted: false, reviewerId: "u_owner" }));
  });

  test("si no se puede aceptar muestra el motivo y se queda en la ficha", async () => {
    const ensureAcceptable = async () => {
      throw new Error("Este proyecto está cerrado y ya no recibe solicitudes.");
    };
    renderScreen(ApplicantDetailScreen, containerWith(accepting({ ensureAcceptable })));
    fireEvent.press(await screen.findByTestId(ApplicantDetailScreen.acceptKey));
    expect(await screen.findByTestId(ApplicantDetailScreen.errorKey)).toBeTruthy();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test("una solicitud resuelta no ofrece aceptar ni rechazar", async () => {
    renderScreen(ApplicantDetailScreen, containerWith(accepting({ requestById: async () => joinRequest({ state: "accepted" }) })));
    expect(await screen.findByTestId("applicant.state")).toBeTruthy();
    expect(screen.queryByTestId(ApplicantDetailScreen.acceptKey)).toBeNull();
    expect(screen.queryByTestId(ApplicantDetailScreen.rejectKey)).toBeNull();
  });

  test("abre el perfil y el historial (solo proyectos cerrados) del aplicante", async () => {
    renderScreen(ApplicantDetailScreen, containerWith(accepting()));
    fireEvent.press(await screen.findByTestId(ApplicantDetailScreen.profileKey));
    expect(mockNavigate).toHaveBeenCalledWith("PersonProfile", { userId: "u_ana" });
    fireEvent.press(screen.getByTestId(ApplicantDetailScreen.historyKey));
    expect(mockNavigate).toHaveBeenCalledWith("CollaborationHistory", { userId: "u_ana", onlyPrevious: true });
  });
});

describe("resultado de la decisión (A8)", () => {
  test.each([
    [true, "¡Solicitud aceptada!"],
    [false, "Solicitud rechazada"],
  ])("accepted=%s dice «%s» y vuelve a la lista del proyecto", async (accepted, title) => {
    mockParams = { requestId: "r1", accepted };
    renderScreen(RequestDecisionScreen, containerWith({ requestById: async () => joinRequest({ projectId: "p7" }) }));
    expect(await screen.findByText(title)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId(RequestDecisionScreen.backKey).props.accessibilityState?.disabled).toBeFalsy());
    fireEvent.press(screen.getByTestId(RequestDecisionScreen.backKey));
    expect(mockNavigate).toHaveBeenCalledWith("CollaborationRequests", { projectId: "p7" });
  });
});
