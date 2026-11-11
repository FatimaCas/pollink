import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Chip, HelperText, IconButton, Text, TextInput, useTheme } from "react-native-paper";

import { spacing } from "@/src/theme/tokens";

// Un campo de lista: título, los valores ya agregados como chips (con su «x»
// para quitarlos) y una caja con «+» para agregar uno más. Lo usa el formulario
// de proyecto para carreras, conocimientos y correos.
export function ChipListField({
  label,
  placeholder,
  emptyText,
  values,
  onAdd,
  onRemove,
  keyboardType,
  disabled = false,
  testID,
}: {
  label: string;
  placeholder: string;
  emptyText: string;
  values: readonly string[];
  // Devuelve el porqué si no se pudo agregar (se muestra y la caja conserva lo
  // escrito) o null si entró.
  onAdd: (value: string) => string | null;
  onRemove: (index: number) => void;
  keyboardType?: "default" | "email-address";
  disabled?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const add = () => {
    const why = onAdd(text);
    setProblem(why);
    if (why === null) setText("");
  };

  return (
    <View style={styles.root}>
      <Text variant="titleSmall" style={styles.label}>
        {label}
      </Text>
      {values.length === 0 ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {emptyText}
        </Text>
      ) : (
        <View style={styles.chips}>
          {values.map((value, index) => (
            <Chip
              key={value}
              compact
              disabled={disabled}
              onClose={() => onRemove(index)}
              closeIconAccessibilityLabel={`Quitar ${value}`}
              style={{ backgroundColor: theme.colors.primary }}
              textStyle={{ color: theme.colors.onPrimary }}
              testID={`${testID}.chip.${index}`}
            >
              {value}
            </Chip>
          ))}
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          mode="outlined"
          dense
          placeholder={placeholder}
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (problem) setProblem(null);
          }}
          onSubmitEditing={add}
          submitBehavior="submit"
          autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
          keyboardType={keyboardType}
          editable={!disabled}
          error={problem !== null}
          style={styles.input}
          testID={`${testID}.input`}
        />
        <IconButton
          icon="plus"
          mode="contained"
          containerColor={theme.colors.primary}
          iconColor={theme.colors.onPrimary}
          disabled={disabled || text.trim() === ""}
          onPress={add}
          accessibilityLabel={`Agregar ${label.toLowerCase()}`}
          testID={`${testID}.add`}
        />
      </View>
      {problem ? (
        <HelperText type="error" padding="none" testID={`${testID}.error`}>
          {problem}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  label: { fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  input: { flex: 1 },
});
