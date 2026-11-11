import { render, screen } from "@testing-library/react-native";
import React from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DayPickerModal } from "@/src/core/components/DayPickerModal";
import { safeAreaMetrics } from "../../support/renderScreen";

// Humo del selector real: se abre en español, con el tema de Paper, y sin romper
// con una fecha inicial anterior al mínimo.
test("abre el calendario en español", () => {
  render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <PaperProvider>
        <DayPickerModal
          visible
          initial={new Date(2020, 0, 1)}
          minDay={new Date(2026, 10, 10)}
          onDismiss={() => {}}
          onConfirm={() => {}}
        />
      </PaperProvider>
    </SafeAreaProvider>,
  );
  expect(screen.getByText("Fecha límite")).toBeTruthy();
  expect(screen.getByText("Guardar")).toBeTruthy();
});
