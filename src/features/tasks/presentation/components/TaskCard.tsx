import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, ProgressBar, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";

import { systemClock } from "@/src/core/utils/clock";
import { usePersonName } from "@/src/features/profile/presentation/hooks/usePersonName";
import { radius, spacing } from "@/src/theme/tokens";
import { checklistProgress, isDone, isOverdueAt, ProjectTask } from "../../domain/entities/ProjectTask";
import { TaskDeadline } from "../../domain/entities/TaskDeadline";

// Una tarea en el tablero (como la tarjeta de Imker): título centrado, barra del
// checklist, fecha límite («Vence el…», «Vencida el…» en rojo), «Reservada por»
// y, si está libre, «Reservar tarea». El nombre viene del directorio de B
// («ti» si es uno mismo; «Otra persona» mientras llega).
export function TaskCard({
  task,
  currentUserId,
  busy,
  onOpen,
  onReserve,
  now = systemClock,
  testID = `taskCard.${task.id}`,
}: {
  task: ProjectTask;
  currentUserId: string | null;
  busy?: boolean;
  onOpen: () => void;
  onReserve: () => void;
  now?: () => Date;
  testID?: string;
}) {
  const theme = useTheme();
  const overdue = isOverdueAt(task, now());
  const color = overdue ? theme.colors.error : theme.colors.onSurfaceVariant;
  const day = task.deadline ? TaskDeadline.formatDay(task.deadline) : "";
  const assigneeName = usePersonName(task.assigneeId ?? "");

  return (
    <Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.surface }]} testID={testID}>
      <TouchableRipple onPress={onOpen} style={styles.body} accessibilityLabel={task.title}>
        <View style={styles.content}>
          <Text variant="bodyLarge" numberOfLines={2} style={styles.title}>
            {task.title}
          </Text>
          {task.subtasks.length > 0 ? (
            <ProgressBar progress={checklistProgress(task)} style={styles.progress} testID={`${testID}.progress`} />
          ) : null}
          {task.deadline ? (
            <View style={styles.row} testID={`${testID}.deadline`}>
              <MaterialCommunityIcons name={overdue ? "alert-outline" : "calendar-outline"} size={16} color={color} />
              <Text variant="bodySmall" style={{ color, fontWeight: overdue ? "700" : undefined }}>
                {overdue ? `Vencida el ${day}` : isDone(task) ? `Límite: ${day}` : `Vence el ${day}`}
              </Text>
            </View>
          ) : null}
          {task.assigneeId ? (
            <Text variant="bodySmall" style={[styles.centered, { color: theme.colors.onSurfaceVariant }]}>
              Reservada por {task.assigneeId === currentUserId ? "ti" : assigneeName}
            </Text>
          ) : null}
        </View>
      </TouchableRipple>
      {task.status === "todo" ? (
        <Button
          mode="contained"
          compact
          onPress={onReserve}
          disabled={busy}
          loading={busy}
          style={styles.reserve}
          testID={`${testID}.reserve`}
        >
          Reservar tarea
        </Button>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, overflow: "hidden" },
  body: { padding: spacing.md },
  reserve: { alignSelf: "center", marginBottom: spacing.md },
  content: { gap: spacing.sm, alignItems: "stretch" },
  title: { textAlign: "center", fontWeight: "600" },
  centered: { textAlign: "center" },
  progress: { height: 5, borderRadius: 3 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
});
