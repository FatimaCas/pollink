// Los valores de diseño que no son colores, sacados del Figma del rebranding
// (ver docs/design-tokens.md). Los colores NO van aquí: salen de `useTheme()`.

// Radios de esquina. `sm` es el de las tabs segmentadas del Figma (7); `md` el
// de las tarjetas (estimado de la captura: confirmar con diseño).
export const radius = {
  sm: 7,
  md: 12,
  full: 999,
} as const;

// Espaciado. `gutter` (13) es el margen lateral de las pantallas del Figma.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  gutter: 13,
  lg: 16,
  xl: 24,
} as const;

// Alturas fijas del Figma.
export const size = {
  segmentedBar: 33,
} as const;
