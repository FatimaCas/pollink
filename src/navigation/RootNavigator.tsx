import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import LoginScreen from "../features/auth/presentation/screens/LoginScreen";
import ProfileScreen from "../features/auth/presentation/screens/ProfileScreen";
import RegisterScreen from "../features/auth/presentation/screens/RegisterScreen";
import { RootStackParamList, TabParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
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
  profile: "home.tab.profile",
};

// La carcasa con la barra inferior. Por ahora solo tiene Perfil: las pestañas
// Descubrir y Proyectos llegan con la tarea A3 del plan de trabajo.
function Tabs() {
  return (
    <Tab.Navigator>
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
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Entrar", presentation: "modal" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Crear cuenta" }} />
    </Stack.Navigator>
  );
}
