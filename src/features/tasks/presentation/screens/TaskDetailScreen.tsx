import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Checkbox, IconButton, Text, TextInput, useTheme } from "react-native-paper";

import { BottomSheet } from "@/src/core/components/BottomSheet";
import { EmptyState } from "@/src/core/components/EmptyState";
import type { RootStackParamList } from "@/src/navigation/types";
import { spacing } from "@/src/theme/tokens";
import { TaskDeadline } from "../../domain/entities/TaskDeadline";
import { TASK_STATUS_LABELS } from "../../domain/entities/TaskStatus";
import { useTaskDetailViewModel } from "../viewmodels/useTaskDetailViewModel";

// El progreso de una tarea: descripción, checklist (completarlo la termina),
// fecha límite y señal de vencida. Los comentarios son de D7.
export default function TaskDetailScreen() {
  const theme = useTheme();
  const { params } = useRoute<RouteProp<RootStackParamList, "TaskDetail">>();
  const vm = useTaskDetailViewModel(params.projectId, params.taskId);
  const [newItem, setNewItem] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadlineText, setDeadlineText] = useState("");

  if (vm.loading) return <ActivityIndicator style={styles.center} testID="taskDetail.loading" />;
  if (vm.error || !vm.task) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos abrir la tarea"
        message={vm.error ?? undefined}
        action={<Button onPress={vm.reload}>Reintentar</Button>}
      />
    );
  }
  const { task } = vm;
  const muted = { color: theme.colors.onSurfaceVariant };

  const addItem = () => {
    vm.addSubtask(newItem);
    setNewItem("");
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineSmall">{task.title}</Text>
      <Text variant="bodyMedium" style={muted} testID="taskDetail.status">
        {TASK_STATUS_LABELS[task.status]}
        {task.finishedAt ? ` · ${TaskDeadline.formatDay(task.finishedAt)}` : ""}
      </Text>

      <View style={styles.deadlineRow}>
        <MaterialCommunityIcons
          name={vm.overdue ? "alert-circle-outline" : "calendar-outline"}
          size={20}
          color={vm.overdue ? theme.colors.error : theme.colors.onSurfaceVariant}
        />
        <Text
          variant="bodyLarge"
          style={[styles.deadlineText, { color: vm.overdue ? theme.colors.error : theme.colors.onSurface }]}
          testID="taskDetail.deadline"
        >
          {task.deadline
            ? `${vm.overdue ? "Vencida · " : ""}${TaskDeadline.formatDay(task.deadline)}`
            : "Sin fecha límite"}
        </Text>
        {vm.canEditDeadline ? (
          <Button
            compact
            testID="taskDetail.editDeadline"
            onPress={() => {
              setDeadlineText(task.deadline ? TaskDeadline.formatDay(task.deadline) : "");
              setDeadlineOpen(true);
            }}
          >
            Cambiar
          </Button>
        ) : null}
      </View>

      <TextInput
        mode="outlined"
        label="Descripción"
        value={vm.description}
        onChangeText={vm.setDescription}
        multiline
        editable={vm.canWork}
        testID="taskDetail.description"
      />

      <Text variant="titleMedium">Checklist</Text>
      {vm.subtasks.length === 0 ? (
        <Text variant="bodyMedium" style={muted}>
          Sin subtareas todavía.
        </Text>
      ) : null}
      {vm.subtasks.map((item, index) => (
        <View key={`${index}-${item.title}`} style={styles.itemRow}>
          <Checkbox
            status={item.done ? "checked" : "unchecked"}
            disabled={!vm.canWork}
            onPress={() => vm.toggleSubtask(index)}
            testID={`taskDetail.item.${index}`}
          />
          <Text variant="bodyLarge" style={styles.itemTitle}>
            {item.title}
          </Text>
          {vm.canWork ? (
            <IconButton icon="close" size={18} onPress={() => vm.removeSubtask(index)} accessibilityLabel="Quitar" />
          ) : null}
        </View>
      ))}

      {vm.canWork ? (
        <>
          <View style={styles.itemRow}>
            <TextInput
              mode="outlined"
              dense
              label="Nueva subtarea"
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={addItem}
              style={styles.itemTitle}
              testID="taskDetail.newItem"
            />
            <IconButton icon="plus" onPress={addItem} accessibilityLabel="Agregar subtarea" testID="taskDetail.addItem" />
          </View>
          <Text variant="bodySmall" style={muted}>
            Al completar todo el checklist la tarea se termina; si desmarcas alguna, vuelve a en progreso.
          </Text>
          <Button
            mode="contained"
            onPress={vm.save}
            loading={vm.saving}
            disabled={!vm.dirty || vm.saving}
            testID="taskDetail.save"
          >
            Guardar cambios
          </Button>
        </>
      ) : (
        <Text variant="bodySmall" style={muted}>
          Solo quien reservó la tarea puede editarla. Resérvala desde el tablero para trabajarla.
        </Text>
      )}

      <BottomSheet visible={deadlineOpen} onDismiss={() => setDeadlineOpen(false)}>
        <Text variant="titleLarge" style={styles.sheetTitle}>
          Fecha límite
        </Text>
        <View style={styles.sheetBody}>
          <TextInput
            mode="outlined"
            label="dd/mm/aaaa (vacío la quita)"
            value={deadlineText}
            onChangeText={setDeadlineText}
            keyboardType="numbers-and-punctuation"
            testID="taskDetail.deadlineInput"
          />
          <Button
            mode="contained"
            testID="taskDetail.deadlineSave"
            onPress={async () => {
              if (await vm.saveDeadline(deadlineText)) setDeadlineOpen(false);
            }}
          >
            Guardar fecha
          </Button>
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: spacing.xl },
  content: { padding: spacing.gutter, gap: spacing.md },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  deadlineText: { flex: 1 },
  itemRow: { flexDirection: "row", alignItems: "center" },
  itemTitle: { flex: 1 },
  sheetTitle: { marginBottom: spacing.md },
  sheetBody: { gap: spacing.md },
});
