import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import { radius, spacing } from "@/src/theme/tokens";

// «Completa tu perfil»: aparece mientras falte la carrera o alguna habilidad.
// El Figma no la dibuja; sigue la tarjeta amarilla de «¿Te interesa?».
export function CompleteProfileCard({ onPress, testID = "completeProfileCard" }: { onPress: () => void; testID?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]} testID={testID}>
      <Text variant="titleMedium" style={styles.title}>
        Completa tu perfil
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Agrega tu carrera y tus habilidades para que los equipos sepan qué puedes aportar.
      </Text>
      <Button mode="contained" onPress={onPress} style={styles.button} testID={`${testID}.action`}>
        Completar ahora
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md * 2, padding: spacing.lg, gap: spacing.sm, marginHorizontal: spacing.gutter },
  title: { fontWeight: "700" },
  button: { alignSelf: "flex-start", marginTop: spacing.xs },
});
