import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { PersonRow } from "@/src/core/components/PersonRow";
import { radius, spacing } from "@/src/theme/tokens";
import { ProjectTask } from "../../domain/entities/ProjectTask";
import { useAssignmentsViewModel } from "../viewmodels/useAssignmentsViewModel";

// «Asignaciones» de un proyecto: «Mis tareas» arriba y una sección por miembro
// con lo que tiene en curso y terminado. El creador puede asignar una tarea
// pendiente: elige la tarea, elige a la persona y confirma. Sin diseño en Figma:
// usa el estilo de `PersonRow` y de las tarjetas de tarea.
export function AssignmentsTab({ projectId }: { projectId: string }) {
  const theme = useTheme();
  const vm = useAssignmentsViewModel(projectId);
  // El paso del flujo de asignar: nada, elegir tarea o elegir persona.
  const [picking, setPicking] = useState<"task" | ProjectTask | null>(null);

  if (vm.loading) return <ActivityIndicator style={styles.center} testID="assignments.loading" />;

  if (vm.error && vm.members.length === 0) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar las asignaciones"
        message={vm.error}
        action={<Button textColor={theme.colors.onSurface} onPress={vm.reload}>Reintentar</Button>}
      />
    );
  }

  const confirmAssign = (task: ProjectTask, assigneeId: string) =>
    Alert.alert("Asignar tarea", `¿Asignar «${task.title}» a ${vm.nameOf(assigneeId)}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Asignar",
        onPress: async () => {
          const failure = await vm.assign(task, assigneeId);
          if (failure) Alert.alert("No se pudo", failure);
          else setPicking(null);
        },
      },
    ]);

  const taskLine = (task: ProjectTask, testID: string, onPress?: () => void) => (
    <Surface key={task.id} elevation={1} style={[styles.task, { backgroundColor: theme.colors.surface }]} testID={testID}>
      {onPress ? (
        <Button onPress={onPress} testID={`${testID}.press`} textColor={theme.colors.onSurface} contentStyle={styles.taskContent}>
          {task.title}
        </Button>
      ) : (
        <Text variant="bodyLarge" style={styles.taskText}>
          {task.title}
        </Text>
      )}
    </Surface>
  );

  const taskList = (tasks: ProjectTask[], empty: string, id: string) =>
    tasks.length === 0 ? (
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {empty}
      </Text>
    ) : (
      tasks.map((t) => taskLine(t, `assignments.${id}.${t.id}`))
    );

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.list} testID="assignments.screen">
      {vm.canAssign ? (
        picking === null ? (
          <Button mode="contained" onPress={() => setPicking("task")} testID="assignments.assign">
            Asignar tarea
          </Button>
        ) : (
          <View style={styles.block} testID="assignments.picker">
            <Text variant="titleMedium">{picking === "task" ? "¿Qué tarea?" : `¿Quién hace «${picking.title}»?`}</Text>
            {picking === "task" ? (
              vm.pending.length === 0 ? (
                <Text variant="bodyMedium">No hay tareas pendientes sin responsable.</Text>
              ) : (
                vm.pending.map((t) => taskLine(t, `assignments.pick.${t.id}`, () => setPicking(t)))
              )
            ) : (
              vm.members.map((m) => (
                <PersonRow
                  key={m.userId}
                  name={vm.nameOf(m.userId)}
                  testID={`assignments.to.${m.userId}`}
                  onPress={() => confirmAssign(picking, m.userId)}
                />
              ))
            )}
            <Button onPress={() => setPicking(null)} textColor={theme.colors.onSurface} testID="assignments.cancel">
              Cancelar
            </Button>
          </View>
        )
      ) : null}

      <View style={styles.block} testID="assignments.mine">
        <Text variant="titleMedium">Mis tareas</Text>
        {taskList(vm.mine?.doing ?? [], "No tienes tareas en curso.", "mine")}
      </View>

      {vm.sections.map(({ member, doing, done }) => (
        <View key={member.userId} style={styles.block} testID={`assignments.section.${member.userId}`}>
          <PersonRow name={vm.nameOf(member.userId)} testID={`assignments.person.${member.userId}`} />
          <Text variant="labelLarge">En curso</Text>
          {taskList(doing, "Nada en curso.", `doing.${member.userId}`)}
          <Text variant="labelLarge">Terminadas</Text>
          {taskList(done, "Nada terminado.", `done.${member.userId}`)}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: spacing.xl },
  list: { padding: spacing.gutter, gap: spacing.lg },
  block: { gap: spacing.sm },
  task: { borderRadius: radius.md },
  taskContent: { justifyContent: "flex-start" },
  taskText: { padding: spacing.md },
});
