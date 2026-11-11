import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { PaperProvider } from "react-native-paper";

import { SegmentedTabs } from "@/src/core/components/SegmentedTabs";
import { darkTheme, lightTheme } from "@/src/theme/theme";

const OPTIONS = [
  { value: "members", label: "Miembros" },
  { value: "tasks", label: "Tareas" },
  { value: "assignments", label: "Asignaciones" },
];

function setup(selected = "members", theme = lightTheme) {
  const onSelect = jest.fn();
  render(
    <PaperProvider theme={theme}>
      <SegmentedTabs options={OPTIONS} selected={selected} onSelect={onSelect} testID="tabs" />
    </PaperProvider>,
  );
  return onSelect;
}

test("muestra todas las opciones y marca la elegida", () => {
  setup("tasks");
  expect(screen.getByText("Miembros")).toBeTruthy();
  expect(screen.getByText("Asignaciones")).toBeTruthy();
  expect(screen.getByTestId("tabs.tasks").props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByTestId("tabs.members").props.accessibilityState).toMatchObject({ selected: false });
});

test("tocar un segmento avisa con su valor", () => {
  const onSelect = setup();
  fireEvent.press(screen.getByTestId("tabs.assignments"));
  expect(onSelect).toHaveBeenCalledWith("assignments");
});

test("el elegido es negro con texto blanco; el resto, texto negro sobre el amarillo", () => {
  setup("members");
  const flat = (id: string) => Object.assign({}, ...[screen.getByTestId(id).props.style].flat(2).filter(Boolean));
  expect(flat("tabs.members").backgroundColor).toBe(lightTheme.colors.secondary);
  expect(flat("tabs.tasks").backgroundColor).toBeUndefined();
  expect(flat("tabs").backgroundColor).toBe(lightTheme.colors.primary);
  expect(flat("tabs").height).toBe(33);
});

test("sigue al tema oscuro", () => {
  setup("members", darkTheme);
  const bar = Object.assign({}, ...[screen.getByTestId("tabs").props.style].flat(2).filter(Boolean));
  expect(bar.backgroundColor).toBe(darkTheme.colors.primary);
});
