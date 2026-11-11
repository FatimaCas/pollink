import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { PROJECT_STATUS_LABELS, ProjectStatus } from "../../domain/entities/ProjectStatus";

// El estado del proyecto como un dato tranquilo: un punto de color y el texto.
// Abierto lleva el amarillo de la marca en el punto; el texto va en el color
// normal, porque el amarillo sobre blanco no se lee.
export function ProjectStatusLabel({ status, testID = "projectStatus" }: { status: ProjectStatus; testID?: string }) {
  const theme = useTheme();
  const open = status === "open";
  return (
    <View style={styles.row} testID={testID}>
      <View style={[styles.dot, { backgroundColor: open ? theme.colors.primary : theme.colors.outline }]} />
      <Text variant="labelMedium" style={[styles.text, { color: open ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
        {PROJECT_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontWeight: "600" },
});
