import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  Cabin_400Regular,
  Cabin_500Medium,
  Cabin_600SemiBold,
  Cabin_700Bold,
} from "@expo-google-fonts/cabin";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";

import { Container } from "./src/core/di/container";
import { DIProvider } from "./src/core/di/DIProvider";
import { SnackbarProvider } from "./src/core/feedback/SnackbarProvider";
import { MissingConfigScreen } from "./src/core/roble/MissingConfigScreen";
import { createLocalContainer } from "./src/core/di/localContainer";
import { missingRobleConfig, useLocalData } from "./src/core/roble/robleConfig";
import { SessionProvider, useSession } from "./src/features/auth/presentation/context/SessionContext";
import { useNavigationPersistence } from "./src/navigation/navigationPersistence";
import { navigationRef } from "./src/navigation/navigationRef";
import RootNavigator from "./src/navigation/RootNavigator";
import { navigationFonts, themeFor } from "./src/theme/theme";

// Expo Go doesn't support customizing the splash screen; only apply options in development/production builds.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Keep the native splash screen visible until the app has finished loading.
SplashScreen.preventAutoHideAsync();
if (!isExpoGo) {
  SplashScreen.setOptions({ duration: 400, fade: true });
}

// Con datos en memoria se crea una sola vez: es el «servidor» de esta corrida.
const localContainer = useLocalData ? createLocalContainer() : undefined;

export default function App() {
  return <AppRoot container={localContainer} />;
}

// `container` lets tests swap the Roble data sources for fakes.
// `persistNavigation`: las pruebas lo apagan para que una no herede la
// navegación de la anterior.
export function AppRoot({ container, persistNavigation = true }: { container?: Container; persistNavigation?: boolean }) {
  const [fontsReady, setFontsReady] = useState(false);
  const navigation = useNavigationPersistence(persistNavigation);
  const scheme = useColorScheme();
  const theme = themeFor(scheme);
  // Sin `.env` no hay a qué servidor conectarse: mejor decirlo en pantalla que
  // fallar después con un error de red que no explica nada.
  const missing = container ? [] : missingRobleConfig();

  useEffect(() => {
    // Paper draws its icons with MaterialCommunityIcons, so preload that font;
    // the text uses Cabin (see src/theme/theme.ts).
    Font.loadAsync({
      ...MaterialCommunityIcons.font,
      Cabin_400Regular,
      Cabin_500Medium,
      Cabin_600SemiBold,
      Cabin_700Bold,
    })
      .catch((e) => console.warn(e))
      .finally(() => setFontsReady(true));
  }, []);

  // El fondo de la ventana sigue al tema: sin esto, al pasar a oscuro se ve un
  // destello blanco detrás de la app.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [theme.colors.background]);

  useEffect(() => {
    if (fontsReady && missing.length > 0) SplashScreen.hide();
  }, [fontsReady, missing.length]);

  if (!fontsReady || !navigation.ready) return null;

  if (missing.length > 0) {
    return (
      <PaperProvider theme={theme}>
        <MissingConfigScreen missing={missing} />
      </PaperProvider>
    );
  }

  const navigationTheme = {
    ...(scheme === "dark" ? DarkTheme : DefaultTheme),
    fonts: navigationFonts,
    colors: {
      ...(scheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      primary: theme.colors.primary,
      notification: theme.colors.error,
    },
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="auto" />
      <DIProvider container={container}>
        <PaperProvider theme={theme}>
          <SnackbarProvider>
            <SessionProvider>
              <NavigationContainer
                ref={navigationRef}
                theme={navigationTheme}
                initialState={navigation.initialState}
                onStateChange={navigation.onStateChange}
              >
                <Shell />
              </NavigationContainer>
            </SessionProvider>
          </SnackbarProvider>
        </PaperProvider>
      </DIProvider>
    </GestureHandlerRootView>
  );
}

// The splash stays up until the saved session has been restored, so the first
// screen already knows who is inside.
function Shell() {
  const { ready } = useSession();
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);
  return ready ? <RootNavigator /> : null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
