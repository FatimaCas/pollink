import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";

import { radius, size } from "@/src/theme/tokens";

type Option<T extends string> = { value: T; label: string };

// La barra segmentada del Figma (Miembros · Tareas · Asignaciones, Mis
// proyectos · Otros proyectos): una barra amarilla de una pieza donde el
// segmento elegido se pinta de negro. Paper trae `SegmentedButtons`, pero con
// bordes y sin esta forma; por eso se arma aquí sobre `TouchableRipple` y los
// colores del tema, así que sigue al modo claro/oscuro.
//
// Sin margen propio: la pantalla le da `spacing.gutter` a los lados.
export function SegmentedTabs<T extends string>({
  options,
  selected,
  onSelect,
  style,
  testID = "segmentedTabs",
}: {
  options: Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  // Cada segmento es `<testID>.<value>`.
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={[styles.bar, { backgroundColor: theme.colors.primary }, style]}
    >
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <TouchableRipple
            key={option.value}
            testID={`${testID}.${option.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, active && { backgroundColor: theme.colors.secondary }]}
          >
            <Text
              variant="bodyLarge"
              numberOfLines={1}
              style={{ color: active ? theme.colors.onSecondary : theme.colors.onPrimary }}
            >
              {option.label}
            </Text>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: size.segmentedBar,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
