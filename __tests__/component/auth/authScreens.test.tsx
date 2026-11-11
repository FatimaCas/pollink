import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import LoginScreen from "@/src/features/auth/presentation/screens/LoginScreen";
import RegisterScreen from "@/src/features/auth/presentation/screens/RegisterScreen";
import { renderScreen } from "../../support/renderScreen";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockSession = {
  busy: false,
  error: null as string | null,
  clearError: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  ensureWritableSession: jest.fn(),
};
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  useSession: () => mockSession,
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, dispatch: mockDispatch, addListener: () => () => {}, setOptions: () => {} }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.error = null;
});

describe("LoginScreen", () => {
  test("entrar con correo y contraseña vuelve atrás si sale bien", async () => {
    mockSession.login.mockResolvedValue(true);
    renderScreen(LoginScreen, new Container());
    fireEvent.changeText(screen.getByTestId(LoginScreen.emailFieldKey), "ana@demo.com");
    fireEvent.changeText(screen.getByTestId(LoginScreen.passwordFieldKey), "123456");
    fireEvent.press(screen.getByTestId(LoginScreen.submitButtonKey));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(mockSession.login).toHaveBeenCalledWith("ana@demo.com", "123456");
  });

  test("si falla, no vuelve atrás y muestra el error de la sesión", async () => {
    mockSession.login.mockResolvedValue(false);
    mockSession.error = "Correo o contraseña incorrectos.";
    renderScreen(LoginScreen, new Container());
    fireEvent.press(screen.getByTestId(LoginScreen.submitButtonKey));
    await waitFor(() => expect(mockSession.login).toHaveBeenCalled());
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(screen.getByTestId(LoginScreen.errorKey).props.children).toBe("Correo o contraseña incorrectos.");
  });

  test("«Continuar como invitado» abre una sesión de invitado y vuelve atrás", async () => {
    mockSession.ensureWritableSession.mockResolvedValue(true);
    renderScreen(LoginScreen, new Container());
    fireEvent.press(screen.getByTestId(LoginScreen.guestButtonKey));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(mockSession.ensureWritableSession).toHaveBeenCalled();
  });

  test("si no se puede abrir la sesión de invitado, se queda en el login", async () => {
    mockSession.ensureWritableSession.mockResolvedValue(false);
    renderScreen(LoginScreen, new Container());
    fireEvent.press(screen.getByTestId(LoginScreen.guestButtonKey));
    await waitFor(() => expect(mockSession.ensureWritableSession).toHaveBeenCalled());
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  test("«No tengo cuenta» lleva al registro", () => {
    renderScreen(LoginScreen, new Container());
    fireEvent.press(screen.getByTestId(LoginScreen.registerButtonKey));
    expect(mockNavigate).toHaveBeenCalledWith("Register");
  });

  test("el ojo muestra y oculta la contraseña", () => {
    renderScreen(LoginScreen, new Container());
    expect(screen.getByTestId(LoginScreen.passwordFieldKey).props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByTestId(LoginScreen.togglePasswordKey));
    expect(screen.getByTestId(LoginScreen.passwordFieldKey).props.secureTextEntry).toBe(false);
  });
});

describe("RegisterScreen", () => {
  test("crear la cuenta cierra las dos rutas (registro y login)", async () => {
    mockSession.register.mockResolvedValue(true);
    renderScreen(RegisterScreen, new Container());
    fireEvent.changeText(screen.getByTestId(RegisterScreen.nameFieldKey), "Laura Pérez");
    fireEvent.changeText(screen.getByTestId(RegisterScreen.emailFieldKey), "l@x.co");
    fireEvent.changeText(screen.getByTestId(RegisterScreen.passwordFieldKey), "123456");
    fireEvent.changeText(screen.getByTestId(RegisterScreen.confirmationFieldKey), "123456");
    fireEvent.press(screen.getByTestId(RegisterScreen.submitButtonKey));
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expect(mockSession.register).toHaveBeenCalledWith({ name: "Laura Pérez", email: "l@x.co", password: "123456", confirmation: "123456" });
    expect(mockDispatch.mock.calls[0][0]).toMatchObject({ type: "POP", payload: { count: 2 } });
  });

  test("si el registro falla muestra el error y no cierra nada", async () => {
    mockSession.register.mockResolvedValue(false);
    mockSession.error = "Las contraseñas no coinciden.";
    renderScreen(RegisterScreen, new Container());
    fireEvent.press(screen.getByTestId(RegisterScreen.submitButtonKey));
    await waitFor(() => expect(mockSession.register).toHaveBeenCalled());
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(screen.getByTestId(RegisterScreen.errorKey).props.children).toBe("Las contraseñas no coinciden.");
  });

  test("«Ya tengo cuenta» vuelve al login", () => {
    renderScreen(RegisterScreen, new Container());
    fireEvent.press(screen.getByText("Ya tengo cuenta"));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
