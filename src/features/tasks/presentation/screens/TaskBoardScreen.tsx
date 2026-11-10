import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/core/components/EmptyState";
import { SegmentedTabs } from "@/src/core/components/SegmentedTabs";
import type { RootStackParamList } from "@/src/navigation/types";
import { spacing } from "@/src/theme/tokens";
import { TaskStatus } from "../../domain/entities/TaskStatus";
import { NewTaskSheet } from "../components/NewTaskSheet";
import { TaskCard } from "../components/TaskCard";
import { useTaskBoardViewModel } from "../viewmodels/useTaskBoardViewModel";

const COLUMNS: { value: TaskStatus; label: string; empty: string }[] = [
  { value: "todo", label: "Pendientes", empty: "No hay tareas pendientes." },
  { value: "doing", label: "En Progreso", empty: "No hay tareas en progreso." },
  { value: "done", label: "Terminadas", empty: "Todavía no hay tareas terminadas." },
];

// El tablero de tareas de un proyecto (el «Gabinete de tareas» de Imker): una
// columna por estado en pestañas, porque en el teléfono caben de una en una, y
// «Crear tarea» abajo. La barra Miembros · Tareas · Asignaciones del Figma es de
// la pantalla del proyecto, no de este tablero; «Asignaciones» sigue pendiente.
export default function TaskBoardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "TaskBoard">>();
  const board = useTaskBoardViewModel(params.projectId);
  // Al volver del detalle el estado de una tarea pudo cambiar: se relee el
  // tablero (la primera vez ya lo cargó el view model).
  const firstFocus = useRef(true);
  const { reload } = board;
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else reload();
    }, [reload]),
  );
  const [column, setColumn] = useState<TaskStatus>("todo");
  const [sheetOpen, setSheetOpen] = useState(false);

  const current = COLUMNS.find((c) => c.value === column)!;

  // Una tarea nueva nace pendiente: se vuelve a esa pestaña para verla.
  const createTask: typeof board.createTask = async (values) => {
    const created = await board.createTask(values);
    if (created) setColumn("todo");
    return created;
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SegmentedTabs
        style={styles.tabs}
        options={COLUMNS.map(({ value, label }) => ({ value, label }))}
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
          data={board.byStatus[column]}
          keyExtractor={(task) => task.id}
          contentContainerStyle={styles.list}
          refreshing={false}
          onRefresh={board.reload}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={styles.empty}>
              {current.empty}
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

      <View style={[styles.footer, { paddingBottom: spacing.gutter + insets.bottom }]}>
        <Button mode="contained" onPress={() => setSheetOpen(true)} testID="taskBoard.new">
          Crear tarea
        </Button>
      </View>
      <NewTaskSheet
        visible={sheetOpen}
        creating={board.creating}
        onDismiss={() => setSheetOpen(false)}
        onSubmit={createTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { marginHorizontal: spacing.gutter, marginTop: spacing.md },
  center: { marginTop: spacing.xl },
  list: { padding: spacing.gutter },
  empty: { textAlign: "center", marginTop: spacing.xl },
  footer: { padding: spacing.gutter },
});
