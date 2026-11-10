import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, IconButton, Text, TextInput, useTheme } from "react-native-paper";

import { BottomSheet } from "@/src/core/components/BottomSheet";
import { DayPickerModal } from "@/src/core/components/DayPickerModal";
import { systemClock } from "@/src/core/utils/clock";
import { spacing } from "@/src/theme/tokens";
import { TaskDeadline } from "../../domain/entities/TaskDeadline";

// La hoja para crear una tarea (el diálogo «Crear tarea» de Imker): nombre,
// descripción opcional y fecha límite opcional elegida en el calendario. La hoja
// solo se cierra cuando la tarea se creó.
export function NewTaskSheet({
  visible,
  creating,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  creating: boolean;
  onDismiss: () => void;
  onSubmit: (values: { title: string; description: string; deadlineDay: Date | null }) => Promise<boolean>;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState<Date | null>(null);
  const [showError, setShowError] = useState(false);
  const [picking, setPicking] = useState(false);

  // Cancelar o tocar fuera descarta lo escrito, como el diálogo de Imker.
  const close = () => {
    setTitle("");
    setDescription("");
    setDay(null);
    setShowError(false);
    onDismiss();
  };

  const submit = async () => {
    if (title.trim() === "") {
      setShowError(true);
      return;
    }
    if (await onSubmit({ title, description, deadlineDay: day })) {
      close();
    }
  };

  return (
    <BottomSheet visible={visible} onDismiss={close}>
      <Text variant="titleLarge" style={styles.heading}>
        Crear tarea
      </Text>
      <View style={styles.fields}>
        <TextInput
          mode="outlined"
          label="Nombre de la tarea"
          value={title}
          onChangeText={setTitle}
          error={showError && title.trim() === ""}
          testID="newTask.title"
        />
        {showError && title.trim() === "" ? <Text variant="bodySmall" style={{ color: theme.colors.error }}>Escribe un nombre</Text> : null}
        <TextInput
          mode="outlined"
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          testID="newTask.description"
        />
        <View style={styles.deadlineRow}>
          <Button
            mode="outlined"
            textColor={theme.colors.onSurface}
            icon={() => (
              <MaterialCommunityIcons
                name="calendar-outline"
                size={20}
                color={theme.colors.onSurface}
                importantForAccessibility="no"
                accessibilityElementsHidden
              />
            )}
            style={styles.deadlineButton}
            onPress={() => setPicking(true)}
            testID="newTask.deadline"
          >
            {day ? `Límite: ${TaskDeadline.formatDay(day)}` : "Fecha límite (opcional)"}
          </Button>
          {day ? (
            <IconButton icon="close" onPress={() => setDay(null)} accessibilityLabel="Quitar fecha límite" testID="newTask.deadline.clear" />
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button textColor={theme.colors.onSurface} onPress={close}>
            Cancelar
          </Button>
          <Button mode="contained" onPress={submit} loading={creating} disabled={creating} testID="newTask.submit">
            Crear
          </Button>
        </View>
      </View>
      <DayPickerModal
        visible={picking}
        initial={day}
        minDay={systemClock()}
        onDismiss={() => setPicking(false)}
        onConfirm={(picked) => {
          setDay(picked);
          setPicking(false);
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.md },
  fields: { gap: spacing.md },
  deadlineRow: { flexDirection: "row", alignItems: "center" },
  deadlineButton: { flex: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
