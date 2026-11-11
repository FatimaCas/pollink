import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import type { RootStackParamList } from "@/src/navigation/types";
import { spacing } from "@/src/theme/tokens";
import { useApplicantViewModel } from "../viewmodels/useApplicantViewModel";

// El resultado de resolver una solicitud: «aceptada» (la persona ya es miembro)
// o «rechazada». Vuelve a la lista de solicitudes del proyecto.
export default function RequestDecisionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "RequestDecision">>();
  const vm = useApplicantViewModel(params.requestId);
  const { accepted } = params;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.badge, { backgroundColor: accepted ? theme.colors.primary : theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name={accepted ? "check" : "close"} size={56} color={theme.colors.onPrimary} />
      </View>
      <Text variant="headlineMedium" style={styles.center} testID="decision.title">
        {accepted ? "¡Solicitud aceptada!" : "Solicitud rechazada"}
      </Text>
      <Text variant="bodyLarge" style={styles.center} testID="decision.message">
        {accepted
          ? "La persona ya es parte del equipo y puede trabajar en las tareas."
          : "La persona no se unirá al proyecto."}
      </Text>
      <Button
        mode="contained"
        disabled={!vm.request}
        contentStyle={styles.cta}
        style={styles.button}
        onPress={() => vm.request && navigation.navigate("CollaborationRequests", { projectId: vm.request.projectId })}
        testID={RequestDecisionScreen.backKey}
      >
        Volver a solicitudes
      </Button>
    </View>
  );
}

RequestDecisionScreen.backKey = "decision.back";

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.gutter, gap: spacing.md },
  badge: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  center: { textAlign: "center" },
  button: { alignSelf: "stretch", marginTop: spacing.lg },
  cta: { height: 48 },
});
