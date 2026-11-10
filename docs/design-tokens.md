# Tokens de diseño

Salen del Figma del rebranding (archivo de trabajo `7QeYqCPJtsxiDSJQIkxJoY`). El Figma **no define variables ni estilos**: los valores son los que se ven en las pantallas, tomados de las capturas, así que los marcados «estimado» hay que confirmarlos con diseño.

**Regla:** los colores salen de `useTheme()` (nunca un `#hex` en una pantalla o componente); radios y espaciado, de `src/theme/tokens.ts`.

## Colores (tema claro, fiel al Figma)

| Valor Figma | Rol MD3 | Dónde se ve |
|---|---|---|
| `#FFC009` | `primary` (texto encima: `onPrimary` negro) | avatares, marcador, segmento inactivo de las tabs |
| `#FFDF83` | `primaryContainer` | tarjetas de proyecto, tarjeta «¿Te interesa?» |
| `#000000` | `secondary` (texto: `onSecondary` blanco) | segmento activo de las tabs |
| `#FFD353` | `secondaryContainer` | botón pequeño «Seguir» |
| `#FFC92E` | `tertiary` / `tertiaryContainer` | botón grande «Solicitar unirme» |
| `#D2D2D2` | `surfaceVariant`, `outlineVariant` | chips de habilidades |
| `#858585` | `onSurfaceVariant`, `outline` | descripciones y textos secundarios |
| `#FFFFFF` / `#000000` | `background`, `surface` / `onSurface` | fondo y texto |

El texto sobre `#FFC009` es **negro**: el blanco no pasa el contraste.

**Pendiente con UX:** `#858585` sobre blanco da ≈3,6:1 (WCAG pide 4,5:1 para texto normal) y es peor sobre `#FFDF83`. Se respeta por fidelidad; la prueba `__tests__/unit/theme.test.ts` fija un mínimo para que no empeore.

## Modo oscuro

**No está diseñado.** El tema oscuro es una derivación provisional (mismo amarillo de marca, fondos `#121212`, tab activa blanca). Sustituir cuando UX lo entregue. La app cambia sola entre claro y oscuro según el sistema (`themeFor(useColorScheme())` en `App.tsx`).

## Tipografía

Cabin (400, 500, 600, 700) con `@expo-google-fonts/cabin`, cargada en `App.tsx` y asignada a todas las variantes de Paper en `src/theme/theme.ts`. Tamaños vistos en el Figma: 16 (tabs, títulos de sección), 16,9 (descripción de tarjeta), 12,9 (nombres), 10 (estado, solicitudes). En la escala de Paper los define cada variante (`labelMedium`, `bodyLarge`…); no se fijan tamaños sueltos.

## Forma y espaciado (`src/theme/tokens.ts`)

| Token | Valor | Origen |
|---|---|---|
| `radius.sm` | 7 | tabs segmentadas (Figma) |
| `radius.md` | 12 | tarjetas (estimado) |
| `spacing.gutter` | 13 | margen lateral de las pantallas |
| `size.segmentedBar` | 33 | alto de las tabs segmentadas |

## Pendiente de diseño
Logo e ícono de la app (los de `assets/images/` son los viejos), modo oscuro, barra inferior de cinco íconos (hoy hay tres pestañas).
