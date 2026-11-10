import { configure, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { AppRoot } from "@/App";
import { DummyData } from "@/src/core/data/dummyData";
import { createLocalContainer } from "@/src/core/di/localContainer";
import LoginScreen from "@/src/features/auth/presentation/screens/LoginScreen";

// La app entera —navegación, pantallas, view models y repositorios de verdad—
// con una sola cosa cambiada: los datasources. `createLocalContainer` le mete
// los de memoria en vez de los de Roble, así que esto prueba la app y no el
// servidor, y corre sin red ni cuenta.
//
// Corre en Jest, como las demás, con los componentes nativos simulados. El
// equivalente en un dispositivo de verdad sería Maestro o Detox.
//
// Se toca y se recorre por `testID`; se comprueba por texto lo que la persona lee.

jest.setTimeout(20000);
// La app entera tarda más que una pantalla suelta (latencia simulada, varias
// cargas seguidas): las esperas llegan a 5 s en vez de 1 s.
configure({ asyncUtilTimeout: 5000 });

function startApp() {
  // Cada prueba con su propio backend en memoria: la sesión de una no se cuela
  // en la siguiente.
  render(<AppRoot container={createLocalContainer(new DummyData({ latencyMs: 20 }))} />);
  return screen.findByText("No has entrado");
}

describe("la app con datos en memoria", () => {
  it("sin sesión, el perfil ofrece entrar", async () => {
    await startApp();

    expect(screen.getByText("Entra o crea una cuenta para continuar.")).toBeTruthy();
  });

  it("entrar con la cuenta de demo", async () => {
    await startApp();

    fireEvent.press(screen.getByText("Entrar"));

    fireEvent.changeText(await screen.findByTestId(LoginScreen.emailFieldKey), DummyData.demoEmail);
    fireEvent.changeText(screen.getByTestId(LoginScreen.passwordFieldKey), DummyData.demoPassword);
    fireEvent.press(screen.getByTestId(LoginScreen.submitButtonKey));
    await waitFor(() => expect(screen.queryByTestId(LoginScreen.submitButtonKey)).toBeNull());

    // De vuelta en la app, el perfil es el de Ana.
    expect(await screen.findByText("Ana Torres")).toBeTruthy();
  });
});
