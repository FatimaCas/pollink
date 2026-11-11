import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { ProfileUpdate } from "@/src/features/profile/domain/entities/ProfileUpdate";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import EditProfileScreen from "@/src/features/profile/presentation/screens/EditProfileScreen";
import { fake } from "../support/fake";
import { profile } from "../support/profileFixtures";
import { renderScreen } from "../support/renderScreen";

const mockGoBack = jest.fn();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../support/sessionMock").fakeSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn(), addListener: () => () => {}, setOptions: () => {} }),
}));

const K = EditProfileScreen;

function setup(updateMyProfile?: ProfileRepository["updateMyProfile"]) {
  const saved: ProfileUpdate[] = [];
  const c = new Container().register(
    TOKENS.ProfileRepo,
    fake<ProfileRepository>(
      {
        getMyProfile: async () => profile(),
        updateMyProfile:
          updateMyProfile ??
          (async (u) => {
            saved.push(u);
            return profile();
          }),
      },
      "ProfileRepo",
    ),
  );
  renderScreen(EditProfileScreen, c);
  return saved;
}

beforeEach(() => mockGoBack.mockClear());

test("llena el formulario con el perfil actual", async () => {
  setup();
  expect((await screen.findByTestId(K.programKey)).props.value).toBe("Diseño Gráfico");
  expect(screen.getByTestId(K.institutionKey).props.value).toBe("Universidad del Norte");
  expect(screen.getByTestId(K.bioKey).props.value).toBe("Me gusta el diseño.");
  expect(screen.getByTestId(`${K.skillsKey}.chip.0`)).toBeTruthy();
});

test("guarda lo editado, incluida una habilidad nueva, y vuelve atrás", async () => {
  const saved = setup();
  fireEvent.changeText(await screen.findByTestId(K.programKey), "Arquitectura");
  fireEvent.changeText(screen.getByTestId(`${K.skillsKey}.input`), "AutoCAD");
  fireEvent.press(screen.getByTestId(`${K.skillsKey}.add`));
  fireEvent.press(screen.getByTestId(K.saveKey));
  await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  expect(saved).toEqual([{ career: { program: "Arquitectura", institution: "Universidad del Norte" }, bio: "Me gusta el diseño.", skills: ["Figma", "Ilustración", "AutoCAD"] }]);
});

test("una habilidad repetida muestra el porqué", async () => {
  setup();
  await screen.findByTestId(K.programKey);
  fireEvent.changeText(screen.getByTestId(`${K.skillsKey}.input`), "figma");
  fireEvent.press(screen.getByTestId(`${K.skillsKey}.add`));
  expect(await screen.findByTestId(`${K.skillsKey}.error`)).toHaveTextContent("Esa habilidad ya está en la lista.");
});

test("si guardar falla muestra el error y no vuelve atrás", async () => {
  setup(async () => {
    throw new Error("No tienes permiso para editar este perfil.");
  });
  fireEvent.press(await screen.findByTestId(K.saveKey));
  expect(await screen.findByTestId(K.errorKey)).toHaveTextContent(/No tienes permiso/);
  expect(mockGoBack).not.toHaveBeenCalled();
});
