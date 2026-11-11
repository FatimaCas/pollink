import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, ProgressBar, Text, TouchableRipple, useTheme } from "react-native-paper";

import { radius, spacing } from "@/src/theme/tokens";
import { isOpen, Project } from "../../domain/entities/Project";

// Un proyecto en la pestaña Proyectos: título, descripción, avance con su
// porcentaje, cuántos integrantes tiene y sus carreras. Sigue la tarjeta del
// feed (mismo fondo y chips), sin el marcador de guardar: aquí ya es tuyo.
export function MyProjectCard({
  project,
  onPress,
  testID = `myProjectCard.${project.id}`,
}: {
  project: Project;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const members = `${project.memberCount} ${project.memberCount === 1 ? "integrante" : "integrantes"}`;
  return (
    <TouchableRipple
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
      accessibilityRole="button"
      accessibilityLabel={project.title}
      testID={testID}
    >
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
            {project.title}
          </Text>
          {!isOpen(project) ? (
            <View style={styles.closed} testID={`${testID}.closed`}>
              <MaterialCommunityIcons name="lock-outline" size={14} color={theme.colors.onSurface} />
              <Text variant="labelSmall">Cerrado</Text>
            </View>
          ) : null}
        </View>
        <Text variant="bodyMedium" numberOfLines={2} style={muted}>
          {project.description}
        </Text>
        <View style={styles.progressRow}>
          <ProgressBar
            progress={project.progress / 100}
            color={theme.colors.primary}
            style={[styles.progress, { backgroundColor: theme.colors.surface }]}
          />
          <Text variant="labelSmall" testID={`${testID}.percent`}>
            {Math.round(project.progress)}%
          </Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.members}>
            <MaterialCommunityIcons name="account-group-outline" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelMedium" style={muted} testID={`${testID}.members`}>
              {members}
            </Text>
          </View>
          {project.jobs.slice(0, 2).map((job) => (
            <Chip key={job} compact style={{ backgroundColor: theme.colors.primary }} textStyle={{ color: theme.colors.onPrimary }}>
              {job}
            </Chip>
          ))}
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md * 2, marginHorizontal: spacing.gutter, marginBottom: spacing.md, overflow: "hidden" },
  content: { padding: spacing.md, gap: spacing.xs },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontWeight: "700" },
  closed: { flexDirection: "row", alignItems: "center", gap: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  progress: { flex: 1, height: 12, borderRadius: radius.sm },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs },
  members: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: spacing.xs },
});
