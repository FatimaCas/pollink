import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Button, PaperProvider } from "react-native-paper";

import { initialsOf, PersonRow } from "@/src/core/components/PersonRow";

const wrap = (ui: React.ReactElement) => render(<PaperProvider>{ui}</PaperProvider>);

describe("initialsOf", () => {
  test.each([
    ["Andrés Torres", "AT"],
    ["  laura  ", "L"],
    ["Ana María de la Cruz", "AM"],
    ["émile zola", "ÉZ"],
    ["", "?"],
    ["   ", "?"],
  ])("%j → %s", (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});

test("muestra nombre, detalle e iniciales", () => {
  wrap(<PersonRow name="Andrés Torres" subtitle="Líder del proyecto" testID="p" />);
  expect(screen.getByText("Andrés Torres")).toBeTruthy();
  expect(screen.getByText("Líder del proyecto")).toBeTruthy();
  expect(screen.getByText("AT")).toBeTruthy();
});

test("sin detalle no deja un hueco", () => {
  wrap(<PersonRow name="Ana" testID="p" />);
  expect(screen.queryByTestId("p.subtitle")).toBeNull();
});

test("la acción de la derecha es independiente de la fila", () => {
  const onFollow = jest.fn();
  const onOpen = jest.fn();
  wrap(
    <PersonRow
      name="Ana"
      onPress={onOpen}
      action={<Button onPress={onFollow}>Seguir</Button>}
    />,
  );
  fireEvent.press(screen.getByText("Seguir"));
  expect(onFollow).toHaveBeenCalledTimes(1);
  expect(onOpen).not.toHaveBeenCalled();
});

test("con onPress la fila se toca y avisa", () => {
  const onOpen = jest.fn();
  wrap(<PersonRow name="Ana" onPress={onOpen} testID="p" />);
  fireEvent.press(screen.getByTestId("p"));
  expect(onOpen).toHaveBeenCalledTimes(1);
});
