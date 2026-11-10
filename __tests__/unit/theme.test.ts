import { darkTheme, lightTheme, themeFor } from "@/src/theme/theme";

// Luminancia y contraste según WCAG 2.x.
function rgb(color: string): [number, number, number] {
  const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(color);
  if (!m) throw new Error(`Color no opaco o ilegible: ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function luminance(color: string) {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Cada texto sobre su fondo.
const PAIRS = [
  ["onPrimary", "primary"],
  ["onPrimaryContainer", "primaryContainer"],
  ["onSecondary", "secondary"],
  ["onSecondaryContainer", "secondaryContainer"],
  ["onTertiary", "tertiary"],
  ["onTertiaryContainer", "tertiaryContainer"],
  ["onError", "error"],
  ["onErrorContainer", "errorContainer"],
  ["onBackground", "background"],
  ["onSurface", "surface"],
  ["onSurfaceVariant", "surface"],
  ["inverseOnSurface", "inverseSurface"],
] as const;

// El gris secundario del Figma (#858585) no llega a 4,5:1 sobre blanco: se
// respeta por fidelidad y queda como pendiente de confirmar con UX. Aquí se
// fija un mínimo para que no empeore sin que nadie lo note.
const FIDELITY_EXCEPTIONS: Record<string, number> = { "light:onSurfaceVariant/surface": 3.5 };

describe.each([
  ["light", lightTheme],
  ["dark", darkTheme],
] as const)("tema %s", (name, theme) => {
  test.each(PAIRS)("%s sobre %s tiene contraste suficiente", (fg, bg) => {
    const min = FIDELITY_EXCEPTIONS[`${name}:${fg}/${bg}`] ?? 4.5;
    expect(contrast(theme.colors[fg], theme.colors[bg])).toBeGreaterThanOrEqual(min);
  });

  test("el texto sobre el amarillo de marca es negro (el blanco no pasa)", () => {
    expect(theme.colors.primary).toBe("rgb(255, 192, 9)");
    expect(theme.colors.onPrimary).toBe("rgb(0, 0, 0)");
  });

  test("la tipografía es Cabin en todas las variantes", () => {
    for (const style of Object.values(theme.fonts)) expect(style.fontFamily).toMatch(/^Cabin_/);
  });
});

test("el tema claro sigue al Figma", () => {
  const c = lightTheme.colors;
  expect(c.primaryContainer).toBe("rgb(255, 223, 131)"); // tarjetas #ffdf83
  expect(c.secondary).toBe("rgb(0, 0, 0)"); // tab activa
  expect(c.background).toBe("rgb(255, 255, 255)");
  expect(c.onSurfaceVariant).toBe("rgb(133, 133, 133)"); // #858585
});

test("claro y oscuro definen los mismos roles", () => {
  expect(Object.keys(darkTheme.colors).sort()).toEqual(Object.keys(lightTheme.colors).sort());
});

test("el tema sigue al esquema del sistema", () => {
  expect(themeFor("dark")).toBe(darkTheme);
  expect(themeFor("light")).toBe(lightTheme);
  expect(themeFor(null)).toBe(lightTheme);
  expect(themeFor("unspecified")).toBe(lightTheme);
});
