import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Button, FAB, Text, useTheme } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { SegmentedTabs } from "@/src/core/components/SegmentedTabs";
import type { RootStackParamList } from "@/src/navigation/types";
import { spacing } from "@/src/theme/tokens";
import { TASK_STATUS_LABELS, TaskStatus } from "../../domain/entities/TaskStatus";
import { NewTaskSheet } from "../components/NewTaskSheet";
import { TaskCard } from "../components/TaskCard";
import { useTaskBoardViewModel } from "../viewmodels/useTaskBoardViewModel";

const COLUMNS: TaskStatus[] = ["todo", "doing", "done"];
const EMPTY_TEXT: Record<TaskStatus, string> = {
  todo: "No hay tareas pendientes.",
  doing: "Nadie está trabajando en una tarea ahora.",
  done: "Todavía no hay tareas terminadas.",
};

// El tablero de tareas de un proyecto: una columna por estado (todo / doing /
// done) en pestañas, porque en el teléfono caben de una en una. La pestaña
// «Asignaciones» del Figma no está aquí: espera la decisión de diseño.
export default function TaskBoardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "TaskBoard">>();
  const board = useTaskBoardViewModel(params.projectId);
  const [column, setColumn] = useState<TaskStatus>("todo");
  const [sheetOpen, setSheetOpen] = useState(false);

  const tasks = board.byStatus[column];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SegmentedTabs
        style={styles.tabs}
        options={COLUMNS.map((value) => ({
          value,
          label: `${TASK_STATUS_LABELS[value]} (${board.byStatus[value].length})`,
        }))}
        selected={column}
        onSelect={setColumn}
        testID="taskBoard.tabs"
      />

      {board.loading ? (
        <ActivityIndicator style={styles.center} testID="taskBoard.loading" />
      ) : board.error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="No pudimos cargar las tareas"
          message={board.error}
          action={<Button onPress={board.reload}>Reintentar</Button>}
        />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(task) => task.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              {EMPTY_TEXT[column]}
            </Text>
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              currentUserId={board.userId}
              busy={board.busyTaskId === item.id}
              onOpen={() => navigation.navigate("TaskDetail", { projectId: params.projectId, taskId: item.id })}
              onReserve={() => board.reserve(item)}
            />
          )}
        />
      )}

      <FAB icon="plus" label="Nueva tarea" style={styles.fab} onPress={() => setSheetOpen(true)} testID="taskBoard.new" />
      <NewTaskSheet
        visible={sheetOpen}
        creating={board.creating}
        onDismiss={() => setSheetOpen(false)}
        onSubmit={board.createTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { marginHorizontal: spacing.gutter, marginTop: spacing.md },
  center: { marginTop: spacing.xl },
  list: { padding: spacing.gutter, paddingBottom: 96 },
  empty: { textAlign: "center", marginTop: spacing.xl },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.lg },
});
