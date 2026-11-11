import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";

import { radius, spacing } from "@/src/theme/tokens";

// La «pastilla» amarilla del perfil en el Figma («Editar perfil», «0 %
// Confianza»): fondo amarillo claro y borde de la marca. Con `onPress` es un
// botón; sin él, solo un dato.
export function ProfilePill({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const style = [styles.pill, { backgroundColor: theme.colors.secondaryContainer, borderColor: theme.colors.primary }];
  const text = (
    <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
      {label}
    </Text>
  );
  if (!onPress) {
    return (
      <View style={style} testID={testID}>
        {text}
      </View>
    );
  }
  return (
    <TouchableRipple onPress={onPress} style={style} accessibilityRole="button" accessibilityLabel={label} testID={testID}>
      {text}
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    overflow: "hidden",
  },
});
