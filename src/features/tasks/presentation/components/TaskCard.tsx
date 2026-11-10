import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";

import { systemClock } from "@/src/core/utils/clock";
import { radius, spacing } from "@/src/theme/tokens";
import { checklistProgress, isOverdueAt, ProjectTask } from "../../domain/entities/ProjectTask";
import { TaskDeadline } from "../../domain/entities/TaskDeadline";

// Una tarea en el tablero: título, fecha límite (en rojo si ya venció), quién la
// tiene y, si está libre, el botón para reservarla. Los nombres de las personas
// vienen del directorio de B; mientras no esté, solo se distingue «Tú».
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
  const mine = currentUserId !== null && task.assigneeId === currentUserId;
  const progress = Math.round(checklistProgress(task) * 100);

  return (
    <Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.surface }]} testID={testID}>
      <TouchableRipple onPress={onOpen} style={styles.body} accessibilityLabel={task.title}>
        <View>
          <Text variant="titleMedium" numberOfLines={2}>
            {task.title}
          </Text>
          <View style={styles.meta}>
            {task.deadline ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name={overdue ? "alert-circle-outline" : "calendar-outline"}
                  size={16}
                  color={overdue ? theme.colors.error : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: overdue ? theme.colors.error : theme.colors.onSurfaceVariant }}
                >
                  {overdue ? "Vencida · " : ""}
                  {TaskDeadline.formatDay(task.deadline)}
                </Text>
              </View>
            ) : null}
            {task.assigneeId ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="account-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {mine ? "Tú" : "Reservada"}
                </Text>
              </View>
            ) : null}
            {task.subtasks.length > 0 ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="checkbox-marked-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {progress}%
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableRipple>
      {task.status === "todo" ? (
        <Button
          mode="contained-tonal"
          compact
          onPress={onReserve}
          loading={busy}
          disabled={busy}
          testID={`${testID}.reserve`}
          style={styles.reserve}
        >
          Reservar
        </Button>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, overflow: "hidden" },
  body: { padding: spacing.md },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  reserve: { marginHorizontal: spacing.md, marginBottom: spacing.md, alignSelf: "flex-start" },
});
