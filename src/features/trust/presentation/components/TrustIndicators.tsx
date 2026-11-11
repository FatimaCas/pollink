import React from "react";
import { StyleSheet, View } from "react-native";
import { ProgressBar, Text, useTheme } from "react-native-paper";

import { radius, spacing } from "@/src/theme/tokens";
import { TrustMetrics } from "../../domain/entities/TrustMetrics";

const EXPLANATIONS = {
  commitment: "Promedio de los indicadores que tienen datos.",
  fulfillment: "De las tareas que tomó, cuántas terminó.",
  onTime: "De las tareas con fecha límite, cuántas entregó a tiempo.",
  completedProjects: "De los proyectos en que participó, cuántos llegaron al 100 %.",
} as const;

// Los indicadores de confianza: el índice general de compromiso y los tres
// que lo componen. Un valor `null` es «sin datos» y se muestra «—», nunca 0 %.
// Con `showExplanations` agrega bajo cada uno qué mide. Es el widget que
// publica B para el perfil, la ficha de un aplicante y los miembros.
export function TrustIndicators({
  metrics,
  showExplanations = false,
  testID = "trustIndicators",
}: {
  metrics: TrustMetrics;
  showExplanations?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.root} testID={testID}>
      <Indicator label="Índice general de compromiso" value={metrics.commitment} explanation={showExplanations ? EXPLANATIONS.commitment : undefined} testID={`${testID}.commitment`} strong />
      <Indicator label="Cumplimiento" value={metrics.fulfillment} explanation={showExplanations ? EXPLANATIONS.fulfillment : undefined} testID={`${testID}.fulfillment`} />
      <Indicator label="Entrega a tiempo" value={metrics.onTime} explanation={showExplanations ? EXPLANATIONS.onTime : undefined} testID={`${testID}.onTime`} />
      <Indicator
        label="Proyectos completados"
        value={metrics.completedProjects}
        explanation={showExplanations ? EXPLANATIONS.completedProjects : undefined}
        testID={`${testID}.completedProjects`}
      />
    </View>
  );
}

function Indicator({
  label,
  value,
  explanation,
  testID,
  strong = false,
}: {
  label: string;
  value: number | null;
  explanation?: string;
  testID: string;
  strong?: boolean;
}) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  return (
    <View style={styles.indicator} testID={testID}>
      <View style={styles.row}>
        <Text variant={strong ? "titleMedium" : "bodyLarge"} style={[styles.label, strong && styles.bold]}>
          {label}
        </Text>
        <Text variant={strong ? "titleMedium" : "bodyLarge"} style={styles.bold} testID={`${testID}.value`}>
          {value === null ? "—" : `${value}%`}
        </Text>
      </View>
      <ProgressBar progress={(value ?? 0) / 100} color={theme.colors.primary} style={[styles.bar, { backgroundColor: theme.colors.surfaceVariant }]} />
      {value === null ? (
        <Text variant="labelSmall" style={muted}>
          Sin datos aún
        </Text>
      ) : null}
      {explanation ? (
        <Text variant="bodySmall" style={muted}>
          {explanation}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  indicator: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  label: { flex: 1 },
  bold: { fontWeight: "700" },
  bar: { height: 10, borderRadius: radius.sm },
});
