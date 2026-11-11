import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { DummyData } from "@/src/core/data/dummyData";
import { createLocalContainer } from "@/src/core/di/localContainer";
import { TABLES } from "@/src/core/roble/tables";
import CreateProjectScreen from "@/src/features/projects/presentation/screens/CreateProjectScreen";
import { renderScreen } from "../../support/renderScreen";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession({ currentUser: () => ({ userId: "u_ana", name: "Ana", email: "ana@demo.com", isAnonymous: false }) });
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  useSession: () => mockSession,
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  // La navegación real, con «volver» espiado (la pantalla está sola en el stack).
  return { ...actual, useNavigation: () => ({ ...actual.useNavigation(), goBack: mockGoBack }) };
});

const K = CreateProjectScreen;

function setup() {
  const data = new DummyData({ latencyMs: 0 });
  data.session = { userId: "u_ana" };
  renderScreen(CreateProjectScreen, createLocalContainer(data));
  return data;
}

function addTo(field: string, value: string) {
  fireEvent.changeText(screen.getByTestId(`${field}.input`), value);
  fireEvent.press(screen.getByTestId(`${field}.add`));
}

beforeEach(() => mockGoBack.mockClear());

test("crea el proyecto con su creador e invitados y vuelve", async () => {
  const data = setup();
  const before = data.table(TABLES.project).length;
  fireEvent.changeText(screen.getByTestId(K.titleKey), "Robótica para colegios");
  fireEvent.changeText(screen.getByTestId(K.descriptionKey), "Talleres de robótica los sábados.");
  addTo(K.jobsKey, "Ingeniería Mecánica");
  addTo(K.skillsKey, "Arduino");
  addTo(K.emailsKey, "beto@demo.com");
  expect(screen.getByText("Arduino")).toBeTruthy();

  fireEvent.press(screen.getByTestId(K.submitKey));
  await waitFor(() => expect(mockGoBack).toHaveBeenCalled());

  const projects = data.table(TABLES.project);
  expect(projects).toHaveLength(before + 1);
  const created = projects[projects.length - 1];
  expect(created).toMatchObject({ title: "Robótica para colegios", jobs: '["Ingeniería Mecánica"]', status: "open" });
  expect(data.table(TABLES.projectMember).filter((m) => m.project_id === created._id)).toEqual([
    expect.objectContaining({ user_id: "u_ana", role: { name: "owner" }, status: "active" }),
  ]);
  expect(data.table(TABLES.projectInvitation)).toEqual([
    expect.objectContaining({ project_id: created._id, user_id: "u_beto", status: "pending" }),
  ]);
});

test("un correo sin cuenta no deja crear nada", async () => {
  const data = setup();
  const before = data.table(TABLES.project).length;
  fireEvent.changeText(screen.getByTestId(K.titleKey), "Robótica");
  fireEvent.changeText(screen.getByTestId(K.descriptionKey), "Talleres");
  addTo(K.emailsKey, "nadie@demo.com");
  fireEvent.press(screen.getByTestId(K.submitKey));
  expect(await screen.findByTestId(K.errorKey)).toHaveTextContent(/nadie@demo\.com/);
  expect(data.table(TABLES.project)).toHaveLength(before);
  expect(mockGoBack).not.toHaveBeenCalled();
});

test("sin nombre lo pide", async () => {
  setup();
  fireEvent.press(screen.getByTestId(K.submitKey));
  expect(await screen.findByText("Ponle un nombre al proyecto.")).toBeTruthy();
});

test("un repetido se avisa junto al campo", () => {
  setup();
  addTo(K.skillsKey, "Python");
  addTo(K.skillsKey, "python");
  expect(screen.getByTestId(`${K.skillsKey}.error`)).toHaveTextContent("Ese conocimiento ya está en la lista.");
});
