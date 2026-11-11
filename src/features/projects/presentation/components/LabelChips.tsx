import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, Text, useTheme } from "react-native-paper";

import { spacing } from "@/src/theme/tokens";

// Carreras o conocimientos de un proyecto, de solo lectura: chips amarillos
// como en las tarjetas, o una frase si no hay ninguno.
export function LabelChips({ labels, emptyText, testID }: { labels: readonly string[]; emptyText: string; testID?: string }) {
  const theme = useTheme();
  if (labels.length === 0) {
    return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} testID={testID}>
        {emptyText}
      </Text>
    );
  }
  return (
    <View style={styles.wrap} testID={testID}>
      {labels.map((label) => (
        <Chip key={label} compact style={{ backgroundColor: theme.colors.primary }} textStyle={{ color: theme.colors.onPrimary }}>
          {label}
        </Chip>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
