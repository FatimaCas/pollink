import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import LoginScreen from "../features/auth/presentation/screens/LoginScreen";
import RegisterScreen from "../features/auth/presentation/screens/RegisterScreen";
import ApplicationSentScreen from "../features/discover/presentation/screens/ApplicationSentScreen";
import DiscoverScreen from "../features/discover/presentation/screens/DiscoverScreen";
import InvitationsScreen from "../features/invitations/presentation/screens/InvitationsScreen";
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
import TaskBoardScreen from "../features/tasks/presentation/screens/TaskBoardScreen";
import TaskDetailScreen from "../features/tasks/presentation/screens/TaskDetailScreen";
import TrustIndicatorsScreen from "../features/trust/presentation/screens/TrustIndicatorsScreen";
import { RootStackParamList, TabParamList } from "./types";

// El navegador está completo: cada ruta de `types.ts` ya tiene su pantalla. Para
// implementar una pantalla se edita su archivo en la feature, no este. Aquí solo
// cambian los títulos y opciones de cada ruta.
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
function icon(name: IconName, focusedName: IconName) {
  function TabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    return <MaterialCommunityIcons name={focused ? focusedName : name} color={color} size={size} />;
  }
  return TabIcon;
}

// Las pestañas, para que las pruebas las toquen por clave.
export const HomeTabKeys = {
  discover: "home.tab.discover",
  projects: "home.tab.projects",
  profile: "home.tab.profile",
};

// La carcasa con la barra inferior: Descubrir · Proyectos · Perfil.
function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ title: "Descubrir", tabBarButtonTestID: HomeTabKeys.discover, tabBarIcon: icon("compass-outline", "compass") }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{ title: "Proyectos", tabBarButtonTestID: HomeTabKeys.projects, tabBarIcon: icon("folder-outline", "folder") }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Perfil", tabBarButtonTestID: HomeTabKeys.profile, tabBarIcon: icon("account-outline", "account") }}
      />
    </Tab.Navigator>
  );
}

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
      <Stack.Screen name="TaskBoard" component={TaskBoardScreen} options={{ title: "Tareas" }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: "Tarea" }} />
    </Stack.Navigator>
  );
}
