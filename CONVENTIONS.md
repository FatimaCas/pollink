# Convenciones de desarrollo de Pollink

Pollink parte del código de r_market. Este archivo **manda**: el README describe
la app y cómo correrla, pero las reglas viven aquí. Si los dos se contradicen,
gana este archivo y se corrige el README.

Lo que el código todavía no cumple está en [Pendientes](#pendientes).

## 1. Lenguaje e idioma

- Todo el proyecto va en TypeScript con `strict` (`.ts` / `.tsx`). No se agregan
  archivos `.js` / `.jsx` a `src/`.
- Identificadores (variables, funciones, tipos, archivos, carpetas): en inglés.
- Comentarios, mensajes de commit, documentación y textos de la UI: en español.

## 2. Arquitectura

MVVM organizado por features, con capas dentro de cada feature e inyección de
dependencias. No hay casos de uso: el view model habla directamente con la
interfaz del repositorio.

```
App.tsx                providers globales (DI, Paper, Snackbar, contextos)
src/
  core/                lo compartido entre features
    di/                Container, TOKENS, appContainer (raíz de composición), localContainer
    roble/             cliente único de Roble, config del .env, guardRoble
    feedback/          Snackbar (avisos de éxito y error)
    data/              DummyData y recursos para correr sin servidor
    hooks/             hooks custom usados por más de una feature
    components/        componentes genéricos reutilizables
    utils/             funciones puras (formatos, messageOf, etc.)
  navigation/          navegadores, rutas tipadas, navigationRef
  theme/               theme de React Native Paper
  features/<feature>/
    domain/
      entities/        tipos y reglas puras del dominio
      repositories/    interfaces de los repositorios
      <Feature>Failure.ts
    data/
      datasources/     interfaz + implementación con Roble (+ en memoria, opcional)
      repositories/    <Xxx>RepositoryImpl
    presentation/
      screens/         pantallas
      components/      componentes propios de la feature
      viewmodels/      useXxxViewModel: estado y lógica de una pantalla
      hooks/           otros hooks custom de la feature
      context/         estado global que expone la feature (si aplica)
```

Reglas:

- Una pantalla no llama a repositorios ni a Roble: usa su view model
  (`useXxxViewModel`) o un contexto.
- Las dependencias se obtienen con `useInject<Interfaz>(TOKENS.Xxx)`. Solo
  `core/di/appContainer.ts` (y `localContainer.ts`) sabe qué implementación hay
  detrás de cada interfaz. Cada dependencia nueva lleva su token en `TOKENS`.
- Un repositorio por feature.
- Una feature puede importar el `domain/` de otra, nunca su `data/`.
- Los errores llegan a la pantalla como texto: el view model guarda
  `messageOf(e)` en su estado `error` o lo muestra con `useSnackbar()`. La
  pantalla nunca ve un código HTTP.

## 3. Componentes y hooks

- Siempre componentes funcionales. No se usan componentes de clase.
- Los hooks custom van en archivos aparte, nunca dentro del archivo de un
  componente:
  - View models de pantalla → `<feature>/presentation/viewmodels/useXxxViewModel.ts`
  - Otros hooks de la feature → `<feature>/presentation/hooks/useXxx.ts(x)`
  - Hooks usados por varias features → `src/core/hooks/useXxx.ts(x)`

## 4. UI y theme

- Se usa React Native Paper siempre que exista el componente (`Text`, `Button`,
  `TextInput`, `Card`, `Chip`, `Snackbar`…). Si hace falta algo a la medida, se
  crea un componente genérico en `core/components/` que envuelva a Paper.
- El theme es el de React Native Paper (MD3), en `src/theme/theme.ts`, con los
  colores en `light-colors.json` / `dark-colors.json`. Los colores se leen del
  theme (`useTheme()`), no se escriben a mano en los componentes.
- El theme de React Navigation se deriva del de Paper (ver `App.tsx`).
- Iconos: `MaterialCommunityIcons` de `@expo/vector-icons`, el mismo set que usa Paper.
- Estilos con `StyleSheet.create` al final del archivo.

## 5. Estado

- **Estado global**, compartido entre pantallas (sesión, seguidos, avisos): API
  Context, con `XxxContext`, `XxxProvider` y un hook `useXxx()` que lanza un error
  si se usa fuera del Provider. Vive en `<feature>/presentation/context/` y el
  Provider se monta en `App.tsx`.
- **Estado de una sola pantalla**: `useState` / `useRef` dentro de su view model.
  No se crea un Context para estado que solo usa una pantalla.

## 6. Navegación

Se usa React Navigation:

- Stack con `@react-navigation/stack` (`createStackNavigator`), pestañas
  inferiores con `@react-navigation/bottom-tabs` y Drawer si se necesita.
- Las rutas y sus parámetros se tipan en `src/navigation/types.ts`
  (`RootStackParamList`, `TabParamList`) y se registran en
  `ReactNavigation.RootParamList` para que `useNavigation()` quede tipado.
- Se conserva el estado de la navegación al recargar la app o al pasarla a
  segundo plano (`initialState` / `onStateChange` del `NavigationContainer`,
  guardando en AsyncStorage).
- Para navegar desde fuera de un componente (por ejemplo, al caducar la sesión)
  se usa `navigationRef`.
- La espera de la sesión (splash o indicador de carga) se resuelve en `App.tsx`
  antes de montar el navegador, no dentro de él.

Ejemplo (`src/navigation/RootNavigator.tsx`):

```tsx
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import LoginScreen from "../features/auth/presentation/screens/LoginScreen";
import ProfileScreen from "../features/auth/presentation/screens/ProfileScreen";
import CatalogScreen from "../features/listings/presentation/screens/CatalogScreen";
import ListingDetailScreen from "../features/listings/presentation/screens/ListingDetailScreen";
import { RootStackParamList, TabParamList } from "./types";

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: "" }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Entrar", presentation: "modal" }} />
    </Stack.Navigator>
  );
}
```

```ts
// src/navigation/types.ts
import { NavigatorScreenParams } from "@react-navigation/native";

export type TabParamList = { Catalog: undefined; Profile: undefined };
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ListingDetail: { listingId: string };
  Login: undefined;
};
```

## 7. Persistencia (Roble)

- Se usa Roble mediante `roble-client`, con **un solo cliente** para toda la app
  (`core/roble/RobleClient.ts`, registrado en el contenedor DI).
- Cada feature que necesita datos persistentes tiene, como mínimo:
  - `data/datasources/XxxDataSource.ts`: la interfaz.
  - `data/datasources/XxxRemoteDataSource.ts`: la implementación con `roble-client`.

  La implementación en memoria (`XxxInMemoryDataSource.ts`) es opcional. Si
  existe, se registra en `core/di/localContainer.ts`. Solo las features que la
  tienen funcionan con `npm run start:local` y en la prueba de integración.
- Las llamadas a Roble viven **solo** en `data/datasources/` (además de
  `core/roble/` y `core/di/appContainer.ts`, que crean el cliente). Fuera de ahí,
  lo único del paquete que se puede nombrar son sus excepciones, y solo para
  traducirlas.
- Los datasources hablan en filas (`Row`), no en entidades, y no deciden nada.
- El repositorio (`data/repositories/XxxRepositoryImpl.ts`) convierte filas en
  entidades y traduce los errores de Roble al `XxxFailure` de la feature con
  `guardRoble`.
- **Esquema versionado:** los cambios de tablas van en
  `roble.schema.desired.json` y las consultas guardadas en `roble_queries/*.sql`
  (se llaman con `executeQueryByName`), en el mismo commit que el código que
  las usa. Se aplican con el MCP de Roble (`roble_schema_plan` /
  `roble_schema_apply`), con el token en `.roble.mcp.env`, que no se sube al
  repositorio.
- Configuración en `.env` (variables `EXPO_PUBLIC_ROBLE_*`), que no se sube al
  repositorio; `.env.example` sí se sube.
- Después de cambiar el esquema o la configuración de Roble se corre
  `npm run smoke`.

## 8. Pruebas

- Jest y `@testing-library/react-native`, en `__tests__/`:

  | Carpeta | Qué prueba |
  |---|---|
  | `unit/<feature>/` | repositorios, view models y dominio puro |
  | `component/<feature>/` | una pantalla o un componente |
  | `integration/` | la app entera, con `createLocalContainer` |
  | `support/` | falsos y utilidades compartidas (no son pruebas) |

- **Obligatorio:** cada repositorio y cada view model nuevo lleva su prueba
  unitaria. Las de componente e integración son opcionales.
- Ninguna prueba habla con Roble. `unit/sinRoble.test.ts` falla si una prueba
  usa el cliente, un `RemoteDataSource` o `appContainer`.
- Los repositorios y datasources falsos se hacen con `fake<X>({ ... })`
  (`__tests__/support/fake.ts`): solo se escriben los métodos que la prueba usa,
  y si el código llama a otro, falla diciendo cuál.
- Las pantallas se montan con `renderScreen(Pantalla, container)`
  (`__tests__/support/renderScreen.tsx`).
- **testID:** todo elemento que toque una prueba lleva un `testID` con forma
  `<pantalla>.<elemento>`, en camelCase y separado por puntos (`login.submit`,
  `home.tab.catalog`, `catalog.card.<id>`). La clave se declara como propiedad
  estática del componente (`LoginScreen.submitButtonKey = "login.submit"`) y la
  prueba la lee de ahí. Lo que tiene etiqueta accesible se busca con
  `getByLabelText`.
- Antes de subir cambios: `npm run typecheck`, `npm run lint` y `npm run test:ci`.

## 9. Estilo de código

- Imports entre features o hacia `core/`: absolutos con el alias `@/src/...`.
  Dentro de la misma feature: relativos (`../../domain/...`).
- Pantallas y navegadores: `export default`. Todo lo demás: exports nombrados.
- Comillas dobles y punto y coma.
- Nombres:
  - Componentes, pantallas, clases y tipos: PascalCase (`CatalogScreen.tsx`).
  - Hooks: camelCase que empieza por `use` (`useCatalogViewModel.ts`).
  - Sufijos según el papel: `XxxDataSource`, `XxxRemoteDataSource`,
    `XxxInMemoryDataSource`, `XxxRepository`, `XxxRepositoryImpl`, `XxxFailure`,
    `XxxContext`, `XxxProvider`, `XxxScreen`.
- `npm run lint` (ESLint de Expo) sin errores.

## Pendientes

La mayoría están asignados en [docs/plan-de-trabajo.md](docs/plan-de-trabajo.md)
(tareas A1–A3).

- Migrar `RootNavigator` (y `__tests__/support/renderScreen.tsx`) de
  `@react-navigation/native-stack` a `@react-navigation/stack`, y desinstalar
  `native-stack`.
- Implementar la persistencia del estado de navegación en `App.tsx`.
- Pasar al español los comentarios que están en inglés.
- Reemplazar `roble.schema.desired.json` y `roble_queries/` por el esquema de
  Pollink (`docs/class_diagram.puml`): hoy siguen siendo los de r_market (tarea A2).
- Adaptar los textos y comentarios de `auth` que aún hablan de publicar,
  preguntar o chatear (tarea A4).
- Quitar de los comentarios las comparaciones con f_market/Flutter. Se
  encuentran con
  `grep -rli "f_market\|flutter" src __tests__`.
