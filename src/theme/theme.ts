import { configureFonts, MD3DarkTheme, MD3LightTheme, MD3Theme } from "react-native-paper";

// paste the JSON directly as objects
import darkColors from "./dark-colors.json";
import lightColors from "./light-colors.json";

// La tipografía de Pollink es Cabin (la carga `App.tsx`). En Android una fuente
// propia no cambia de peso con `fontWeight`: cada peso es su propia familia, y
// Paper pone el peso de cada variante en `fontWeight`, así que se traduce aquí.
const CABIN: Record<string, string> = {
  "400": "Cabin_400Regular",
  "500": "Cabin_500Medium",
  "600": "Cabin_600SemiBold",
  "700": "Cabin_700Bold",
  normal: "Cabin_400Regular",
  bold: "Cabin_700Bold",
};

function cabinFonts(base: MD3Theme["fonts"]): MD3Theme["fonts"] {
  const config = Object.fromEntries(
    Object.entries(base).map(([variant, style]) => [
      variant,
      { fontFamily: CABIN[String(style.fontWeight)] ?? CABIN["400"], fontWeight: "400" as const },
    ]),
  );
  return configureFonts({ config });
}

// El tema claro sigue al Figma al pie de la letra. El oscuro **no está
// diseñado** todavía: es una derivación provisional (ver docs/design-tokens.md).
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors, // keep defaults
    ...lightColors.colors, // override with the brand values
  },
  fonts: cabinFonts(MD3LightTheme.fonts),
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors.colors,
  },
  fonts: cabinFonts(MD3DarkTheme.fonts),
};

// El tema que corresponde al esquema del sistema. `useColorScheme()` vuelve a
// renderizar cuando el usuario cambia entre claro y oscuro, así que la app
// cambia sola, sin reiniciar.
export function themeFor(scheme: string | null | undefined): MD3Theme {
  return scheme === "dark" ? darkTheme : lightTheme;
}
