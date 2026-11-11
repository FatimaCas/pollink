import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { PaperProvider } from "react-native-paper";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { NO_TRUST, TrustMetrics } from "@/src/features/trust/domain/entities/TrustMetrics";
import { TrustRepository } from "@/src/features/trust/domain/repositories/TrustRepository";
import { TrustIndicators } from "@/src/features/trust/presentation/components/TrustIndicators";
import { TrustPill } from "@/src/features/trust/presentation/components/TrustPill";
import { useTrustMetrics } from "@/src/features/trust/presentation/hooks/useTrustMetrics";
import TrustIndicatorsScreen from "@/src/features/trust/presentation/screens/TrustIndicatorsScreen";
import { fake } from "../../support/fake";
import { renderScreen } from "../../support/renderScreen";

let mockParams: { userId: string } = { userId: "u2" };
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  ...jest.requireActual("@/src/features/auth/presentation/context/SessionContext"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../../support/sessionMock").fakeSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ navigate: jest.fn(), addListener: () => () => {}, setOptions: () => {} }),
}));

const FULL: TrustMetrics = { commitment: 80, onTime: 90, fulfillment: 70, completedProjects: 80, hasHistory: true };

function containerWith(getTrustMetricsOf: TrustRepository["getTrustMetricsOf"]) {
  return new Container().register(TOKENS.TrustRepo, fake<TrustRepository>({ getTrustMetricsOf }, "TrustRepo"));
}

describe("TrustIndicators", () => {
  const wrap = (ui: React.ReactElement) => render(<PaperProvider>{ui}</PaperProvider>);

  test("muestra el valor de cada indicador", () => {
    wrap(<TrustIndicators metrics={FULL} />);
    expect(screen.getByTestId("trustIndicators.commitment.value")).toHaveTextContent("80%");
    expect(screen.getByTestId("trustIndicators.fulfillment.value")).toHaveTextContent("70%");
    expect(screen.getByTestId("trustIndicators.onTime.value")).toHaveTextContent("90%");
    expect(screen.getByTestId("trustIndicators.completedProjects.value")).toHaveTextContent("80%");
  });

  test("sin datos muestra «—» y «Sin datos aún», nunca 0 %", () => {
    wrap(<TrustIndicators metrics={{ ...FULL, onTime: null, commitment: null }} />);
    expect(screen.getByTestId("trustIndicators.onTime.value")).toHaveTextContent("—");
    expect(screen.getByTestId("trustIndicators.commitment.value")).toHaveTextContent("—");
    expect(screen.getAllByText("Sin datos aún")).toHaveLength(2);
  });

  test("un 0 real se muestra como 0 %", () => {
    wrap(<TrustIndicators metrics={{ ...FULL, fulfillment: 0 }} />);
    expect(screen.getByTestId("trustIndicators.fulfillment.value")).toHaveTextContent("0%");
  });

  test("con explicaciones dice qué mide cada uno", () => {
    wrap(<TrustIndicators metrics={FULL} showExplanations />);
    expect(screen.getByText("De las tareas que tomó, cuántas terminó.")).toBeTruthy();
    expect(screen.getByText("De las tareas con fecha límite, cuántas entregó a tiempo.")).toBeTruthy();
  });

  test("sin explicaciones no las pone", () => {
    wrap(<TrustIndicators metrics={FULL} />);
    expect(screen.queryByText("De las tareas que tomó, cuántas terminó.")).toBeNull();
  });
});

describe("useTrustMetrics", () => {
  const hook = (repo: Container, id = "u2") =>
    renderHook(() => useTrustMetrics(id), { wrapper: ({ children }: { children: React.ReactNode }) => <DIProvider container={repo}>{children}</DIProvider> });

  test("carga los indicadores", async () => {
    const { result } = hook(containerWith(async () => FULL));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics).toEqual(FULL);
  });

  test("un fallo no deja números y reload reintenta", async () => {
    let fail = true;
    const { result } = hook(
      containerWith(async () => {
        if (fail) throw new Error("Sin conexión.");
        return FULL;
      }),
    );
    await waitFor(() => expect(result.current.error).toBe("Sin conexión."));
    expect(result.current.metrics).toBeNull();
    fail = false;
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.metrics).toEqual(FULL));
    expect(result.current.error).toBeNull();
  });

  test("sin userId no consulta nada", async () => {
    const getTrustMetricsOf = jest.fn(async () => FULL);
    const { result } = hook(containerWith(getTrustMetricsOf), "");
    expect(result.current.loading).toBe(false);
    expect(getTrustMetricsOf).not.toHaveBeenCalled();
  });
});

describe("TrustPill", () => {
  const wrap = (c: Container, ui: React.ReactElement) => render(<DIProvider container={c}><PaperProvider>{ui}</PaperProvider></DIProvider>);

  test("muestra el índice general como «NN% Confianza»", async () => {
    wrap(containerWith(async () => FULL), <TrustPill userId="u2" />);
    expect(await screen.findByText("80% Confianza")).toBeTruthy();
  });

  test("sin datos o mientras carga muestra «—»", async () => {
    wrap(containerWith(async () => NO_TRUST), <TrustPill userId="u2" />);
    expect(screen.getByText("— Confianza")).toBeTruthy();
    await act(async () => {});
    expect(screen.getByText("— Confianza")).toBeTruthy();
  });

  test("con onPress es un botón", async () => {
    const onPress = jest.fn();
    wrap(containerWith(async () => FULL), <TrustPill userId="u2" onPress={onPress} />);
    fireEvent.press(await screen.findByTestId("trustPill"));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("TrustIndicatorsScreen", () => {
  beforeEach(() => {
    mockParams = { userId: "u2" };
  });

  test("con historial muestra los indicadores con sus explicaciones", async () => {
    renderScreen(TrustIndicatorsScreen, containerWith(async () => FULL));
    expect(await screen.findByTestId("trustIndicators.commitment.value")).toHaveTextContent("80%");
    expect(screen.getByText("De los proyectos en que participó, cuántos llegaron al 100 %.")).toBeTruthy();
  });

  test("sin historial lo dice con la persona gramatical de quien mira", async () => {
    renderScreen(TrustIndicatorsScreen, containerWith(async () => NO_TRUST));
    expect(await screen.findByText("Todavía no hay indicadores")).toBeTruthy();
    expect(screen.getByText("Aparecen cuando colabores en un proyecto.")).toBeTruthy();
  });

  test("en el de otra persona usa la tercera persona", async () => {
    mockParams = { userId: "u9" };
    renderScreen(TrustIndicatorsScreen, containerWith(async () => NO_TRUST));
    expect(await screen.findByText("Aparecen cuando colabora en un proyecto.")).toBeTruthy();
  });

  test("si falla no muestra números y ofrece reintentar", async () => {
    let fail = true;
    renderScreen(
      TrustIndicatorsScreen,
      containerWith(async () => {
        if (fail) throw new Error("No pudimos calcular los indicadores.");
        return FULL;
      }),
    );
    expect(await screen.findByTestId(TrustIndicatorsScreen.errorKey)).toBeTruthy();
    expect(screen.queryByTestId("trustIndicators")).toBeNull();
    fail = false;
    fireEvent.press(screen.getByTestId(TrustIndicatorsScreen.retryKey));
    expect(await screen.findByTestId("trustIndicators.commitment.value")).toBeTruthy();
  });
});
