import { RouteProp, useRoute } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { RootStackParamList } from "@/src/navigation/types";
import { radius, spacing } from "@/src/theme/tokens";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { TrustIndicators } from "../components/TrustIndicators";
import { useTrustMetrics } from "../hooks/useTrustMetrics";

// Detalle de los indicadores de confianza de una persona (B6). Se calculan del
// historial de colaboración: sin historial no hay números, y si no se pudieron
// calcular se dice por qué y se ofrece reintentar, nunca ceros.
export default function TrustIndicatorsScreen() {
  const theme = useTheme();
  const { params } = useRoute<RouteProp<RootStackParamList, "TrustIndicators">>();
  const { user } = useSession();
  const { metrics, loading, error, reload } = useTrustMetrics(params.userId);
  const isOwn = user?.userId === params.userId;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
        {loading && !metrics ? (
          <ActivityIndicator testID={TrustIndicatorsScreen.loadingKey} />
        ) : error ? (
          <View style={styles.message} testID={TrustIndicatorsScreen.errorKey}>
            <MaterialCommunityIcons name="cloud-off-outline" size={32} color={theme.colors.error} />
            <Text variant="bodyMedium" style={styles.messageText}>
              {error}
            </Text>
            <Button onPress={reload} testID={TrustIndicatorsScreen.retryKey}>
              Reintentar
            </Button>
          </View>
        ) : metrics && metrics.hasHistory ? (
          <TrustIndicators metrics={metrics} showExplanations />
        ) : (
          <View style={styles.message} testID={TrustIndicatorsScreen.emptyKey}>
            <MaterialCommunityIcons name="chart-line" size={40} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.bold}>
              Todavía no hay indicadores
            </Text>
            <Text variant="bodyMedium" style={styles.messageText}>
              Aparecen cuando {isOwn ? "colabores" : "colabora"} en un proyecto.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

TrustIndicatorsScreen.loadingKey = "trustScreen.loading";
TrustIndicatorsScreen.errorKey = "trustScreen.error";
TrustIndicatorsScreen.retryKey = "trustScreen.retry";
TrustIndicatorsScreen.emptyKey = "trustScreen.empty";

const styles = StyleSheet.create({
  content: { padding: spacing.gutter },
  card: { borderRadius: radius.md * 2, padding: spacing.lg },
  message: { alignItems: "center", gap: spacing.sm },
  messageText: { textAlign: "center" },
  bold: { fontWeight: "700" },
});
