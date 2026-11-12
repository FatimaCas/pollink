import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator, StackNavigationProp } from "@react-navigation/stack";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LoginScreen from "../features/auth/presentation/screens/LoginScreen";
import RegisterScreen from "../features/auth/presentation/screens/RegisterScreen";
import ApplicationSentScreen from "../features/discover/presentation/screens/ApplicationSentScreen";
import DiscoverScreen from "../features/discover/presentation/screens/DiscoverScreen";
import InvitationsScreen from "../features/invitations/presentation/screens/InvitationsScreen";
import ProjectWorkspaceScreen from "../features/projects/presentation/screens/ProjectWorkspaceScreen";
import CollaborationHistoryScreen from "../features/profile/presentation/screens/CollaborationHistoryScreen";
import EditProfileScreen from "../features/profile/presentation/screens/EditProfileScreen";
import OnboardingScreen from "../features/profile/presentation/screens/OnboardingScreen";
import PersonProfileScreen from "../features/profile/presentation/screens/PersonProfileScreen";
import ProfileScreen from "../features/profile/presentation/screens/ProfileScreen";
import SettingsScreen from "../features/profile/presentation/screens/SettingsScreen";
import CreateProjectScreen from "../features/projects/presentation/screens/CreateProjectScreen";
import ProjectDetailScreen from "../features/projects/presentation/screens/ProjectDetailScreen";
import ProjectInfoScreen from "../features/projects/presentation/screens/ProjectInfoScreen";
import ProjectsScreen from "../features/projects/presentation/screens/ProjectsScreen";
import ApplicantDetailScreen from "../features/requests/presentation/screens/ApplicantDetailScreen";
import CollaborationRequestsScreen from "../features/requests/presentation/screens/CollaborationRequestsScreen";
import RequestDecisionScreen from "../features/requests/presentation/screens/RequestDecisionScreen";
import TaskDetailScreen from "../features/tasks/presentation/screens/TaskDetailScreen";
import TrustIndicatorsScreen from "../features/trust/presentation/screens/TrustIndicatorsScreen";
import { RootStackParamList, TabParamList } from "./types";

// El navegador está completo: cada ruta de `types.ts` ya tiene su pantalla. Para
// implementar una pantalla se edita su archivo en la feature, no este. Aquí solo
// cambian los títulos y opciones de cada ruta.
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type TabIconProps = { color: string; size: number; focused: boolean };
function icon(name: IconName) {
  function TabIcon({ color }: TabIconProps) {
    return <MaterialCommunityIcons name={name} color={color} size={ICON_SIZE} />;
  }
  return TabIcon;
}

// La abeja del Figma es la mascota: el mismo SVG de un solo color, teñido.
function BeeIcon({ color }: TabIconProps) {
  return <Image source={require("../../assets/images/pollink-logo.svg")} style={styles.bee} contentFit="contain" tintColor={color} />;
}

// El «+» no es una pestaña: abre Crear proyecto encima de la barra.
function NoScreen() {
  return null;
}

// Las pestañas, para que las pruebas las toquen por clave.
export const HomeTabKeys = {
  discover: "home.tab.discover",
  create: "home.tab.create",
  projects: "home.tab.projects",
  profile: "home.tab.profile",
};

// La carcasa con la barra inferior del Figma (`1:178`): Descubrir · Crear ·
// Proyectos · Perfil (abeja · + · lista · persona), solo íconos; el activo en amarillo. La lupa (Explorar)
// llega con su pantalla.
function Tabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurface,
        // Los íconos del Figma miden ~40 dp: la caja y la barra de la librería
        // (31×28 y 49 dp) se quedan cortas.
        tabBarIconStyle: styles.iconBox,
        tabBarStyle: { backgroundColor: theme.colors.surface, height: BAR_HEIGHT + insets.bottom },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ title: "Descubrir", tabBarAccessibilityLabel: "Descubrir", tabBarButtonTestID: HomeTabKeys.discover, tabBarIcon: BeeIcon }}
      />
      <Tab.Screen
        name="Create"
        component={NoScreen}
        options={{ tabBarAccessibilityLabel: "Crear proyecto", tabBarButtonTestID: HomeTabKeys.create, tabBarIcon: icon("plus-circle") }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent<StackNavigationProp<RootStackParamList>>()?.navigate("CreateProject");
          },
        })}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          title: "Proyectos",
          tabBarAccessibilityLabel: "Proyectos",
          tabBarButtonTestID: HomeTabKeys.projects,
          tabBarIcon: icon("format-list-bulleted-square"),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Perfil", tabBarAccessibilityLabel: "Perfil", tabBarButtonTestID: HomeTabKeys.profile, tabBarIcon: icon("account") }}
      />
    </Tab.Navigator>
  );
}

const ICON_SIZE = 40;
const BAR_HEIGHT = 64;
const styles = StyleSheet.create({
  iconBox: { width: 48, height: 40 },
  bee: { width: 46, height: 37 },
});

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />

      {/* A · auth */}
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Entrar", presentation: "modal" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Crear cuenta" }} />

      {/* A · discover y requests */}
      <Stack.Screen name="ApplicationSent" component={ApplicationSentScreen} options={{ title: "Solicitud enviada" }} />
      <Stack.Screen name="CollaborationRequests" component={CollaborationRequestsScreen} options={{ title: "Solicitudes" }} />
      <Stack.Screen name="ApplicantDetail" component={ApplicantDetailScreen} options={{ title: "Solicitud" }} />
      <Stack.Screen name="RequestDecision" component={RequestDecisionScreen} options={{ title: "" }} />

      {/* B · profile y trust */}
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: "Completa tu perfil" }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Editar perfil" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Ajustes" }} />
      <Stack.Screen name="PersonProfile" component={PersonProfileScreen} options={{ title: "" }} />
      <Stack.Screen name="CollaborationHistory" component={CollaborationHistoryScreen} options={{ title: "Historial de colaboración" }} />
      <Stack.Screen name="TrustIndicators" component={TrustIndicatorsScreen} options={{ title: "Indicadores de confianza" }} />

      {/* C · projects e invitations */}
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: "" }} />
      <Stack.Screen name="ProjectInfo" component={ProjectInfoScreen} options={{ title: "" }} />
      <Stack.Screen name="CreateProject" component={CreateProjectScreen} options={{ title: "Crear proyecto" }} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} options={{ title: "Invitaciones" }} />

      {/* D · tasks */}
      <Stack.Screen name="ProjectWorkspace" component={ProjectWorkspaceScreen} options={{ title: "" }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: "Tarea" }} />
    </Stack.Navigator>
  );
}
