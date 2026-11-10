import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Checkbox, Divider, IconButton, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayPickerModal } from "@/src/core/components/DayPickerModal";
import { EmptyState } from "@/src/core/components/EmptyState";
import { systemClock } from "@/src/core/utils/clock";
import type { RootStackParamList } from "@/src/navigation/types";
import { spacing } from "@/src/theme/tokens";
import { TaskDeadline } from "../../domain/entities/TaskDeadline";
import { useTaskDetailViewModel } from "../viewmodels/useTaskDetailViewModel";

// El progreso de una tarea (como en Imker): título, fecha límite con señal de
// vencida, descripción y checklist (editables por quien la reservó) y «Guardar».
// Completar el checklist la termina. Los comentarios son de D7.
export default function TaskDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "TaskDetail">>();
  const vm = useTaskDetailViewModel(params.projectId, params.taskId);
  const [newItem, setNewItem] = useState("");
  const [picking, setPicking] = useState(false);

  if (vm.loading) return <ActivityIndicator style={styles.center} testID="taskDetail.loading" />;
  if (vm.error || !vm.task) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos abrir la tarea"
        message={vm.error ?? undefined}
        action={<Button textColor={theme.colors.onSurface} onPress={vm.reload}>Reintentar</Button>}
      />
    );
  }
  const { task } = vm;
  const muted = { color: theme.colors.onSurfaceVariant };
  const deadlineColor = vm.overdue ? theme.colors.error : theme.colors.onSurface;
  const day = task.deadline ? TaskDeadline.formatDay(task.deadline) : "";

  const addItem = () => {
    vm.addSubtask(newItem);
    setNewItem("");
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.gutter + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="titleLarge" style={styles.bold}>
        {task.title}
      </Text>
      <Divider />

      {task.deadline || vm.canEditDeadline ? (
        <View style={styles.deadlineRow}>
          <MaterialCommunityIcons
            name={vm.overdue ? "alert-outline" : "calendar-outline"}
            size={20}
            color={vm.overdue ? theme.colors.error : theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodyMedium"
            style={[styles.deadlineText, { color: deadlineColor, fontWeight: vm.overdue ? "700" : undefined }]}
            testID="taskDetail.deadline"
          >
            {task.deadline ? (vm.overdue ? `Vencida el ${day}` : `Vence el ${day}`) : "Sin fecha límite"}
          </Text>
          {vm.canEditDeadline ? (
            <>
              <IconButton
                icon="calendar-edit"
                disabled={vm.savingDeadline}
                onPress={() => setPicking(true)}
                accessibilityLabel={task.deadline ? "Cambiar fecha límite" : "Poner fecha límite"}
                testID="taskDetail.editDeadline"
              />
              {task.deadline ? (
                <IconButton
                  icon="calendar-remove"
                  disabled={vm.savingDeadline}
                  onPress={() => vm.saveDeadline(null)}
                  accessibilityLabel="Quitar fecha límite"
                  testID="taskDetail.clearDeadline"
                />
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {vm.readOnlyReason ? (
        <Text variant="bodySmall" style={muted}>
          {vm.readOnlyReason}
        </Text>
      ) : null}

      <Text variant="titleSmall" style={styles.bold}>
        Descripción
      </Text>
      <TextInput
        mode="outlined"
        value={vm.description}
        onChangeText={vm.setDescription}
        multiline
        numberOfLines={3}
        editable={vm.canWork}
        testID="taskDetail.description"
      />

      <Text variant="titleSmall" style={styles.bold}>
        Checklist de progreso
      </Text>
      {vm.subtasks.map((item, index) => (
        <View key={`${index}-${item.title}`} style={styles.itemRow}>
          <Checkbox
            status={item.done ? "checked" : "unchecked"}
            color={theme.colors.secondary}
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
        <View style={styles.itemRow}>
          <TextInput
            mode="outlined"
            dense
            placeholder="Escribe una subtarea"
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addItem}
            style={styles.itemTitle}
            testID="taskDetail.newItem"
          />
          <IconButton icon="plus" onPress={addItem} accessibilityLabel="Agregar subtarea" testID="taskDetail.addItem" />
        </View>
      ) : null}

      {vm.canWork ? (
        <Button
          mode="contained"
          onPress={vm.save}
          loading={vm.saving}
          disabled={!vm.dirty || vm.saving}
          testID="taskDetail.save"
        >
          Guardar
        </Button>
      ) : null}

      <DayPickerModal
        visible={picking}
        initial={task.deadline}
        minDay={systemClock()}
        onDismiss={() => setPicking(false)}
        onConfirm={async (picked) => {
          setPicking(false);
          await vm.saveDeadline(picked);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: spacing.xl },
  content: { padding: spacing.gutter, gap: spacing.md },
  bold: { fontWeight: "700" },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  deadlineText: { flex: 1 },
  itemRow: { flexDirection: "row", alignItems: "center" },
  itemTitle: { flex: 1 },
});
