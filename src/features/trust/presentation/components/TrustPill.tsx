import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";

import { radius, spacing } from "@/src/theme/tokens";
import { useTrustMetrics } from "../hooks/useTrustMetrics";

// La pastilla «NN % Confianza» del perfil (Figma): el índice general de
// compromiso de `userId`. «—» mientras carga, si falló o si no hay datos.
// Con `onPress` abre el detalle.
export function TrustPill({ userId, onPress, testID = "trustPill" }: { userId: string; onPress?: () => void; testID?: string }) {
  const theme = useTheme();
  const { metrics } = useTrustMetrics(userId);
  const score = metrics?.commitment ?? null;
  const label = `${score === null ? "—" : `${score}%`} Confianza`;
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
  pill: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: 3, overflow: "hidden" },
});
