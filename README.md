# Pollink

App móvil en React Native (Expo) con [Roble](https://roble-api.test-openlab.uninorte.edu.co)
(Uninorte OpenLab) como backend, a través de `roble-client`.

> **Antes de escribir código, lee [CONVENTIONS.md](CONVENTIONS.md).** Ahí están
> las reglas del proyecto. Este README explica qué hay y cómo correrlo. Si los
> dos se contradicen, manda CONVENTIONS.md.

## Estado actual

Pollink parte de la base técnica de r_market, ya sin sus features de carros.
Hoy tiene **autenticación** (entrar, registrarse, entrar como invitado y
guardar la cuenta después) y el **esqueleto** de toda la app: las pestañas
Descubrir · Proyectos · Perfil y todas las rutas, con pantallas pendientes.

Pollink va a recrear el alcance de Imker (`design-thinking/app`). El reparto
del trabajo está en [docs/plan-de-trabajo.md](docs/plan-de-trabajo.md), y lo
que falta de la base en [CONVENTIONS.md → Pendientes](CONVENTIONS.md#pendientes).

## Cómo correrlo

Pollink usa un proyecto de Roble que ya existe. Solo hay que apuntar la app a él:

```bash
cp .env.example .env     # y llena las variables de abajo
npm install
npm start
```

| Variable | Qué es |
|---|---|
| `EXPO_PUBLIC_ROBLE_BASE_URL` | host de la API de Roble |
| `EXPO_PUBLIC_ROBLE_CONTRACT_ID` | id del proyecto de Roble de Pollink |

El `.env` no se sube al repositorio. Sin él la app no arranca: muestra qué
variables faltan. Si cambias el `.env`, reinicia con `npx expo start --clear`.

Para comprobar la conexión con el proyecto antes de abrir la app:

```bash
npm run smoke
```

Registra una cuenta desechable, prueba el árbol JSON, el tiempo real, las
notificaciones y el modo invitado, y al terminar borra la cuenta.

### Sin servidor

```bash
npm run start:local
```

Arranca con `EXPO_PUBLIC_DATA_SOURCE=local`: los mismos repositorios, pero con
los datasources en memoria y los datos de `src/core/data/dummyData.ts`. La
cuenta de prueba es `ana@demo.com` / `123456`. Todo se pierde al cerrar la app, y
solo funcionan las features que tienen datasource en memoria.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo (Expo Go) |
| `npm run android` / `ios` / `web` | La app en esa plataforma |
| `npm run start:local` | La app con datos en memoria, sin Roble |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run lint` | ESLint de Expo |
| `npm run test:ci` | Todas las pruebas, una vez |
| `npm run test:unit` / `test:component` / `test:integration` | Un solo tipo de prueba |
| `npm test` | Pruebas en modo observación |
| `npm run smoke` | Verifica el proyecto de Roble del `.env` |

Antes de subir cambios: `npm run typecheck`, `npm run lint` y `npm run test:ci`.

## Arquitectura

MVVM por feature, con inyección de dependencias. La lógica de cada pantalla vive
en su **view model**: un hook `useXxxViewModel` o, si el estado es global, un
contexto. El view model habla con la **interfaz** del repositorio. No hay casos
de uso. Las reglas completas están en [CONVENTIONS.md](CONVENTIONS.md#2-arquitectura).

```
App.tsx                 providers: DI, Paper, Snackbar, sesión
src/
  core/
    di/                 contenedor, TOKENS, appContainer y localContainer
    roble/              el cliente (uno solo), la config del .env, guardRoble y tables.ts
    feedback/           la Snackbar
    data/               datos de prueba para correr sin servidor
    components/ utils/  componentes y funciones compartidas
  navigation/           stack raíz + pestañas, rutas tipadas, navigationRef
  theme/                theme de React Native Paper (claro y oscuro)
  features/
    auth/               sesión, login, registro, invitado, guardar cuenta   (A)
    discover/           feed de proyectos, filtros, postularse          (A)
    requests/           solicitudes para colaborar                      (A)
    profile/            perfil propio y ajeno, onboarding, ajustes      (B)
    trust/              indicadores de confianza                        (B)
    projects/           crear, mis proyectos, ficha, cerrar             (C)
    invitations/        invitaciones a proyectos                        (C)
    members/            miembros, salir y quitar                        (D)
    tasks/              tablero, checklist, fechas, comentarios         (D)
```

Cada feature repite las mismas capas:

```
features/<nombre>/
  domain/          entities, repositories (interfaces) y su Failure
  di.ts            registra sus repositorios (con Roble y en memoria)
  data/
    datasources/   interfaz + implementación con Roble (+ en memoria, opcional)
    repositories/  uno por feature: convierte filas en entidades y traduce errores
  presentation/    screens/, components/, viewmodels/, hooks/, context/
```

Las llamadas a Roble viven solo en `data/datasources/`. Los repositorios
traducen las excepciones del paquete al `Failure` de la feature con `guardRoble`
(un 403 se muestra como «tu cuenta no puede hacer esto»), así que la pantalla
nunca ve un código HTTP.

## Roble

- **Esquema:** `roble.schema.desired.json` describe las tablas que la app espera
  encontrar en el proyecto de Pollink. `roble_queries/` contiene las consultas
  guardadas que se llaman con `executeQueryByName`. Los cambios a cualquiera de
  los dos van en el mismo commit que el código que los usa.
- **Administrar el proyecto:** con el MCP de Roble (`roble_schema_plan` /
  `roble_schema_apply`). El token va en `.roble.mcp.env`, que no se sube al
  repositorio.
- Después de cambiar el esquema o la configuración, corre `npm run smoke`.

## Pruebas

Ninguna prueba habla con Roble: todas usan falsos o datasources en memoria.
`__tests__/unit/sinRoble.test.ts` hace cumplir esa regla.

| Carpeta | Qué prueba | Comando |
|---|---|---|
| `__tests__/unit/<feature>/` | repositorios, view models y dominio puro | `npm run test:unit` |
| `__tests__/component/<feature>/` | una pantalla o un componente | `npm run test:component` |
| `__tests__/integration/` | la app entera, con `createLocalContainer` | `npm run test:integration` |
| `__tests__/support/` | utilidades (no son pruebas) | — |

Herramientas de `__tests__/support/`:

- `fake<X>({ ... })`: un falso con solo los métodos que la prueba necesita. Si
  el código llama a uno que no está, la prueba falla diciendo cuál.
- `renderScreen(Pantalla, container)`: monta una pantalla con Paper, la
  navegación, los contextos y un `Container` de falsos.

Los elementos que tocan las pruebas llevan `testID` con forma
`<pantalla>.<elemento>` (`login.submit`), declarado como propiedad estática del
componente. Los detalles están en [CONVENTIONS.md](CONVENTIONS.md#8-pruebas).
