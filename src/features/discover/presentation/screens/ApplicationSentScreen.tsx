import { Image } from "expo-image";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/src/navigation/types";
import { radius, spacing } from "@/src/theme/tokens";
import { useApplicationSentViewModel } from "../viewmodels/useApplicationSentViewModel";

const NEXT_STEPS = [
  "El equipo revisará tu perfil",
  "Recibirás una notificación",
  "Podrás ver el estado en «Mis solicitudes»",
];

// «¡Solicitud enviada!» (Figma): la mascota, el nombre del proyecto y lo que
// sigue, con salida a «Ver proyecto» o «Ir al inicio».
export default function ApplicationSentScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ApplicationSent">>();
  const vm = useApplicationSentViewModel(params.projectId);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: spacing.xl + insets.bottom }]}
    >
      <Image source={require("../../../../../assets/images/pollink-logo.svg")} style={styles.mascot} contentFit="contain" accessibilityLabel="Pollink" />
      <Text variant="headlineMedium" style={styles.center} testID="applicationSent.title">
        ¡Solicitud enviada!
      </Text>
      <Text variant="bodyLarge" style={styles.center} testID="applicationSent.message">
        {`Tu solicitud para unirte al proyecto ${vm.title ?? "el proyecto"} ha sido enviada.`}
      </Text>
      <Surface elevation={0} style={[styles.next, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text variant="titleMedium">¿Qué sigue?</Text>
        {NEXT_STEPS.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]}>
              <Text variant="labelSmall">{i + 1}</Text>
            </View>
            <Text variant="bodyMedium" style={[styles.stepText, { color: theme.colors.onSurfaceVariant }]}>
              {step}
            </Text>
          </View>
        ))}
        <Button
          mode="contained"
          buttonColor={theme.colors.secondaryContainer}
          textColor={theme.colors.onSecondaryContainer}
          contentStyle={styles.cta}
          onPress={() => navigation.dispatch(StackActions.replace("ProjectDetail", { projectId: params.projectId }))}
          testID={ApplicationSentScreen.viewProjectKey}
        >
          Ver proyecto
        </Button>
        <Button
          mode="outlined"
          contentStyle={styles.cta}
          onPress={() => navigation.navigate("Tabs", { screen: "Discover" })}
          testID={ApplicationSentScreen.homeKey}
        >
          Ir al inicio
        </Button>
      </Surface>
    </ScrollView>
  );
}

ApplicationSentScreen.viewProjectKey = "applicationSent.viewProject";
ApplicationSentScreen.homeKey = "applicationSent.home";

const styles = StyleSheet.create({
  container: { padding: spacing.gutter, gap: spacing.md, alignItems: "stretch" },
  mascot: { height: 160, marginTop: spacing.xl, marginBottom: spacing.lg },
  center: { textAlign: "center" },
  next: { borderRadius: radius.md * 2, padding: spacing.lg, gap: spacing.sm, marginTop: spacing.lg },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bullet: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepText: { flex: 1 },
  cta: { height: 48 },
});
