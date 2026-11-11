import { render, screen } from "@testing-library/react-native";
import React from "react";

import { BrandHeader } from "@/src/core/components/BrandHeader";

test("dibuja el logo de Pollink", () => {
  render(<BrandHeader testID="logo" />);
  expect(screen.getByTestId("logo")).toBeTruthy();
});
