import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Menu, Text, TouchableRipple, useTheme } from "react-native-paper";

import { radius, spacing } from "@/src/theme/tokens";
import { FEED_MODES, FeedMode } from "../../domain/entities/FeedMode";

// El «Para ti ▾» del Figma: una píldora amarilla que despliega las tres formas
// de ver el feed; la elegida se pinta de negro.
export function FeedModePicker({ mode, onSelect }: { mode: FeedMode; onSelect: (mode: FeedMode) => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = FEED_MODES.find((m) => m.value === mode)!;
  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      contentStyle={{ backgroundColor: theme.colors.primary, borderRadius: radius.sm, paddingVertical: 0 }}
      anchor={
        <TouchableRipple
          onPress={() => setOpen(true)}
          style={[styles.pill, { backgroundColor: theme.colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`Ver: ${current.label}`}
          testID={FeedModePicker.buttonKey}
        >
          <View style={styles.pillContent}>
            <Text variant="labelLarge" style={{ color: theme.colors.onPrimary }}>
              {current.label}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.onPrimary} />
          </View>
        </TouchableRipple>
      }
    >
      {FEED_MODES.map((m) => {
        const active = m.value === mode;
        return (
          <TouchableRipple
            key={m.value}
            onPress={() => {
              setOpen(false);
              onSelect(m.value);
            }}
            style={[styles.item, active && { backgroundColor: theme.colors.secondary }]}
            accessibilityRole="menuitem"
            accessibilityState={{ selected: active }}
            testID={`${FeedModePicker.buttonKey}.${m.value}`}
          >
            <Text variant="bodyLarge" style={{ color: active ? theme.colors.onSecondary : theme.colors.onPrimary }}>
              {m.label}
            </Text>
          </TouchableRipple>
        );
      })}
    </Menu>
  );
}

FeedModePicker.buttonKey = "discover.mode";

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  pillContent: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  item: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minWidth: 150, borderRadius: radius.sm },
});
