import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, IconButton, ProgressBar, Text, TouchableRipple, useTheme } from "react-native-paper";

import { radius, spacing } from "@/src/theme/tokens";
import { DiscoverProject } from "../../domain/entities/DiscoverProject";

// La tarjeta de un proyecto en Descubrir (Figma): imagen con el marcador de
// guardar arriba a la derecha, título, barra de avance con su porcentaje y las
// carreras como chips. Tocarla abre el proyecto.
export function ProjectCard({
  project,
  saved,
  onPress,
  onToggleSaved,
  testID = `projectCard.${project.id}`,
}: {
  project: DiscoverProject;
  saved: boolean;
  onPress: () => void;
  onToggleSaved: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const closed = project.status === "closed";
  return (
    <TouchableRipple
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
      accessibilityRole="button"
      accessibilityLabel={project.title}
      testID={testID}
    >
      <View style={styles.content}>
        <View style={[styles.image, { backgroundColor: theme.colors.primary }]}>
          {project.imageUrl ? <Image source={{ uri: project.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <IconButton
            icon={saved ? "bookmark" : "bookmark-outline"}
            size={26}
            iconColor={theme.colors.onPrimary}
            onPress={onToggleSaved}
            style={styles.bookmark}
            accessibilityLabel={saved ? "Quitar de guardados" : "Guardar proyecto"}
            testID={`${testID}.save`}
          />
        </View>
        <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
          {project.title}
        </Text>
        <Text variant="bodyLarge" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant }}>
          {project.description}
        </Text>
        <View style={styles.progressRow}>
          <ProgressBar
            progress={project.progress / 100}
            color={theme.colors.primary}
            style={[styles.progress, { backgroundColor: theme.colors.surface }]}
            testID={`${testID}.progress`}
          />
          <Text variant="labelSmall" testID={`${testID}.percent`}>
            {Math.round(project.progress)}%
          </Text>
        </View>
        <View style={styles.chips}>
          {closed ? (
            <View style={styles.closed} testID={`${testID}.closed`}>
              <MaterialCommunityIcons name="lock-outline" size={14} color={theme.colors.onSurface} />
              <Text variant="labelSmall">Cerrado</Text>
            </View>
          ) : null}
          {project.jobs.slice(0, 3).map((job) => (
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
  card: { borderRadius: radius.md * 2, marginHorizontal: spacing.gutter, marginBottom: spacing.lg, overflow: "hidden" },
  content: { padding: spacing.md, gap: spacing.xs },
  image: { height: 110, borderRadius: radius.md, overflow: "hidden", alignItems: "flex-end" },
  bookmark: { margin: 0 },
  title: { marginTop: spacing.xs },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  progress: { flex: 1, height: 12, borderRadius: radius.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" },
  closed: { flexDirection: "row", alignItems: "center", gap: 2 },
});
