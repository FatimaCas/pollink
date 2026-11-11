import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Avatar, Text, TouchableRipple, useTheme } from "react-native-paper";

import { spacing } from "@/src/theme/tokens";

const AVATAR_SIZE = 44;

// Las iniciales para el avatar: la primera letra de las dos primeras palabras.
// Las imágenes de perfil están fuera de alcance, así que el avatar es siempre
// de iniciales.
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toUpperCase());
  return letters.length > 0 ? letters.join("") : "?";
}

// Una persona en una lista (la fila de «Equipo» del Figma): avatar, nombre,
// una línea de detalle (rol, carrera) y, si hace falta, una acción a la derecha
// (p. ej. un `Button` «Seguir»). Si recibe `onPress`, toda la fila se toca.
export function PersonRow({
  name,
  subtitle,
  subtitleLines = 1,
  action,
  onPress,
  style,
  testID = "personRow",
}: {
  name: string;
  subtitle?: string;
  subtitleLines?: number;
  action?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, style]}>
      <Avatar.Text
        size={AVATAR_SIZE}
        label={initialsOf(name)}
        color={theme.colors.onPrimary}
        style={{ backgroundColor: theme.colors.primary }}
        testID={`${testID}.avatar`}
      />
      <View style={styles.texts}>
        <Text variant="titleLarge" numberOfLines={1} testID={`${testID}.name`}>
          {name}
        </Text>
        {subtitle ? (
          <Text variant="bodyMedium" numberOfLines={subtitleLines} testID={`${testID}.subtitle`}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <TouchableRipple testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
      {content}
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  texts: {
    flex: 1,
  },
  action: {
    marginLeft: spacing.sm,
  },
});
