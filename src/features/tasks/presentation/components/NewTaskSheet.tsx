import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

import { BottomSheet } from "@/src/core/components/BottomSheet";
import { spacing } from "@/src/theme/tokens";

// La hoja para crear una tarea: título, descripción opcional y fecha límite
// opcional («dd/mm/aaaa»). Valida el view model; la hoja solo se cierra cuando
// la tarea se creó.
export function NewTaskSheet({
  visible,
  creating,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  creating: boolean;
  onDismiss: () => void;
  onSubmit: (values: { title: string; description: string; deadlineText: string }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineText, setDeadlineText] = useState("");

  const submit = async () => {
    if (await onSubmit({ title, description, deadlineText })) {
      setTitle("");
      setDescription("");
      setDeadlineText("");
      onDismiss();
    }
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <Text variant="titleLarge" style={styles.heading}>
        Nueva tarea
      </Text>
      <View style={styles.fields}>
        <TextInput mode="outlined" label="Título" value={title} onChangeText={setTitle} testID="newTask.title" />
        <TextInput
          mode="outlined"
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          multiline
          testID="newTask.description"
        />
        <TextInput
          mode="outlined"
          label="Fecha límite (opcional)"
          placeholder="dd/mm/aaaa"
          value={deadlineText}
          onChangeText={setDeadlineText}
          keyboardType="numbers-and-punctuation"
          testID="newTask.deadline"
        />
        <Button mode="contained" onPress={submit} loading={creating} disabled={creating} testID="newTask.submit">
          Crear tarea
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.md },
  fields: { gap: spacing.md },
});
