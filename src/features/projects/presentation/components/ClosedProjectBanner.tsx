import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { radius, spacing } from "@/src/theme/tokens";

// El aviso de un proyecto cerrado: ya no recibe solicitudes ni invitaciones.
export function ClosedProjectBanner({ testID = "closedProjectBanner" }: { testID?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.surfaceVariant }]} testID={testID}>
      <MaterialCommunityIcons name="lock-outline" size={18} color={theme.colors.onSurface} />
      <Text variant="bodyMedium" style={styles.text}>
        Proyecto cerrado: ya no recibe solicitudes ni invitaciones.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  text: { flex: 1 },
});
