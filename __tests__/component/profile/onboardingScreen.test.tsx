import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { emptyProfile } from "@/src/features/profile/domain/entities/UserProfile";
import { ProfileUpdate } from "@/src/features/profile/domain/entities/ProfileUpdate";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import OnboardingScreen from "@/src/features/profile/presentation/screens/OnboardingScreen";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";

const mockGoBack = jest.fn();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../../support/sessionMock").fakeSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn(), addListener: () => () => {}, setOptions: () => {} }),
}));

const K = OnboardingScreen;

function setup({ getMyProfile, updateMyProfile }: { getMyProfile?: ProfileRepository["getMyProfile"]; updateMyProfile?: ProfileRepository["updateMyProfile"] } = {}) {
  const saved: ProfileUpdate[] = [];
  const c = new Container().register(
    TOKENS.ProfileRepo,
    fake<ProfileRepository>(
      {
        getMyProfile: getMyProfile ?? (async () => emptyProfile("u2", "Laura Pérez")),
        updateMyProfile:
          updateMyProfile ??
          (async (u) => {
            saved.push(u);
            return emptyProfile("u2", "Laura Pérez");
          }),
      },
      "ProfileRepo",
    ),
  );
  renderScreen(OnboardingScreen, c);
  return saved;
}

beforeEach(() => mockGoBack.mockClear());

test("saluda por el primer nombre", async () => {
  setup();
  expect(await screen.findByTestId(K.titleKey)).toHaveTextContent("¡Hola, Laura!");
});

test("«Ahora no» vuelve sin escribir nada", async () => {
  const saved = setup();
  fireEvent.press(await screen.findByTestId(K.skipKey));
  expect(mockGoBack).toHaveBeenCalled();
  expect(saved).toEqual([]);
});

test("guardar con el formulario vacío es lo mismo que omitir", async () => {
  const saved = setup();
  fireEvent.press(await screen.findByTestId(K.saveKey));
  await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  expect(saved).toEqual([]);
});

test("guarda lo escrito y vuelve", async () => {
  const saved = setup();
  fireEvent.changeText(await screen.findByTestId("onboarding.program"), "Derecho");
  fireEvent.changeText(screen.getByTestId("onboarding.skills.input"), "Oratoria");
  fireEvent.press(screen.getByTestId("onboarding.skills.add"));
  fireEvent.press(screen.getByTestId(K.saveKey));
  await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  expect(saved).toEqual([{ career: { program: "Derecho", institution: "" }, bio: "", skills: ["Oratoria"] }]);
});

test("si guardar falla muestra el error y no vuelve", async () => {
  setup({
    updateMyProfile: async () => {
      throw new Error("No se pudo guardar tu perfil.");
    },
  });
  fireEvent.changeText(await screen.findByTestId("onboarding.program"), "Derecho");
  fireEvent.press(screen.getByTestId(K.saveKey));
  expect(await screen.findByTestId("onboarding.error")).toHaveTextContent("No se pudo guardar tu perfil.");
  expect(mockGoBack).not.toHaveBeenCalled();
});

test("si el perfil no cargó no ofrece el formulario (guardaría vacíos), pero deja omitir", async () => {
  setup({
    getMyProfile: async () => {
      throw new Error("Sin conexión.");
    },
  });
  expect(await screen.findByTestId(K.retryKey)).toBeTruthy();
  expect(screen.queryByTestId(K.saveKey)).toBeNull();
  fireEvent.press(screen.getByTestId(K.skipKey));
  expect(mockGoBack).toHaveBeenCalled();
});
