# Pollink

Pollink conecta a estudiantes con proyectos universitarios. Quien tiene una idea
publica el proyecto y dice qué carreras y habilidades busca; quien quiere
colaborar lo encuentra, se postula y, si lo aceptan, se reparte las tareas con
el resto del equipo.

App móvil en React Native (Expo) con [Roble](https://roble-api.test-openlab.uninorte.edu.co)
(Uninorte OpenLab) como backend, a través de `roble-client`.

**Demo en video:** https://youtu.be/LqTnDAZvnjw

Las reglas de código están en [CONVENTIONS.md](CONVENTIONS.md). Si este README
y CONVENTIONS.md se contradicen, manda CONVENTIONS.md.

## Qué hace

- **Acceso:** entrar, registrarse, entrar como invitado y guardar la cuenta
  después. Onboarding opcional al crear la cuenta.
- **Descubrir:** feed de proyectos con filtros por carrera, habilidad y «solo
  abiertos». Guardar proyectos y postularse.
- **Proyectos:** crear un proyecto e invitar por correo, «Mis proyectos» y
  «Otros proyectos», ficha con progreso e información básica editable, cerrar
  un proyecto.
- **Solicitudes e invitaciones:** el creador acepta o rechaza a quien se
  postula; quien recibe una invitación la acepta o la rechaza.
- **Miembros:** lista de integrantes con su papel y su carrera; salir de un proyecto o quitar
  a alguien (sus tareas sin terminar quedan libres).
- **Tareas:** tablero Pendientes · En progreso · Terminadas, fecha límite
  opcional, reservar una tarea, checklist (completarlo la termina) y
  comentarios.
- **Perfil y confianza:** perfil propio y de otras personas, historial de
  colaboración e indicadores de compromiso y de entregas a tiempo.

## Cómo correrlo

```bash
cp .env.example .env     # y llena las variables de abajo
npm install
npm start
```

| Variable | Qué es |
|---|---|
| `EXPO_PUBLIC_ROBLE_BASE_URL` | host de la API de Roble |
| `EXPO_PUBLIC_ROBLE_CONTRACT_ID` | id del proyecto de Roble |

El `.env` no se sube al repositorio. Sin él la app no arranca y muestra qué
variables faltan. Si cambias el `.env`, reinicia con `npx expo start --clear`.

Para comprobar la conexión antes de abrir la app:

```bash
npm run smoke
```

Registra una cuenta desechable, prueba el árbol JSON, el tiempo real, las
notificaciones y el modo invitado, y al terminar borra la cuenta.

### Sin servidor

```bash
npm run start:local
```

Usa los mismos repositorios con datasources en memoria
(`EXPO_PUBLIC_DATA_SOURCE=local`) y arranca con datos de ejemplo: proyectos, equipos y
tareas de ejemplo. La cuenta de prueba es `ana@demo.com` / `123456`.
Los datos se pierden al cerrar la app.

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
contexto. El view model habla con la **interfaz** del repositorio; no hay casos
de uso. Detalle en [CONVENTIONS.md](CONVENTIONS.md#2-arquitectura).

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
  theme/                tema de React Native Paper (claro y oscuro)
  features/
    auth/               sesión, login, registro, invitado, guardar cuenta
    discover/           feed de proyectos, filtros, postularse
    requests/           solicitudes para colaborar
    profile/            perfil propio y ajeno, onboarding, ajustes, directorio de nombres
    trust/              indicadores de confianza
    projects/           crear, mis proyectos, ficha, cerrar
    invitations/        invitaciones a proyectos
    members/            miembros, salir y quitar
    tasks/              tablero, checklist, fechas, comentarios
```

Cada feature repite las mismas capas:

```
features/<nombre>/
  domain/          entities, repositories (interfaces) y su Failure
  di.ts            registra sus repositorios (con Roble y en memoria)
  data/
    datasources/   interfaz + implementación con Roble y en memoria
    repositories/  convierte filas en entidades y traduce errores
  presentation/    screens/, components/, viewmodels/, hooks/, context/
```

Las llamadas a Roble viven solo en `data/datasources/`. Los repositorios
traducen las excepciones al `Failure` de la feature con `guardRoble` (un 403 se
muestra como «tu cuenta no puede hacer esto»), así que la pantalla nunca ve un
código HTTP.

## Roble

- **Esquema:** `roble.schema.desired.json` describe las tablas que la app espera
  y `roble_queries/` las consultas guardadas que se llaman con
  `executeQueryByName`. Los cambios a cualquiera de los dos van en el mismo
  commit que el código que los usa.
- **Administrar el proyecto:** con el MCP de Roble (`roble_schema_plan` /
  `roble_schema_apply`). El token va en `.roble.mcp.env`, que no se sube.
- Después de cambiar el esquema o la configuración, corre `npm run smoke`.

## Pruebas

Ninguna prueba habla con Roble: todas usan falsos o datasources en memoria, y
`__tests__/unit/core/sinRoble.test.ts` lo hace cumplir.

| Carpeta | Qué prueba | Comando |
|---|---|---|
| `__tests__/unit/<feature>/` | repositorios, view models y dominio | `npm run test:unit` |
| `__tests__/component/<feature>/` | una pantalla o un componente | `npm run test:component` |
| `__tests__/integration/` | la app entera, con `createLocalContainer` | `npm run test:integration` |
| `__tests__/support/` | utilidades (no son pruebas) | — |

- `fake<X>({ ... })` crea un falso con solo los métodos que la prueba necesita;
  si el código llama a otro, la prueba falla diciendo cuál.
- `renderScreen(Pantalla, container)` monta una pantalla con Paper, la
  navegación, los contextos y un `Container` de falsos.

Los elementos que tocan las pruebas llevan `testID` con forma
`<pantalla>.<elemento>` (`login.submit`), declarado como propiedad estática del
componente. Detalle en [CONVENTIONS.md](CONVENTIONS.md#8-pruebas).
