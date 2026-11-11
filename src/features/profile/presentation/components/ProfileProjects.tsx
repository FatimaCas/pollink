import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import { ChoiceChips } from "@/src/core/components/ChoiceChips";
import { MyProjectCard } from "@/src/features/projects/presentation/components/MyProjectCard";
import { spacing } from "@/src/theme/tokens";
import { ProjectFilter, useProfileProjectsViewModel } from "../viewmodels/useProfileProjectsViewModel";

// «Proyectos» del perfil (Figma): el filtro y las tarjetas de en qué anda la
// persona. Tocar una tarjeta abre el proyecto.
export function ProfileProjects({ userId, onOpenProject }: { userId: string; onOpenProject: (projectId: string) => void }) {
  const theme = useTheme();
  const vm = useProfileProjectsViewModel(userId);

  const options: { value: ProjectFilter; label: string }[] = [
    { value: "all", label: `Todo (${vm.total})` },
    { value: "inProgress", label: "En desarrollo" },
    { value: "finished", label: "Finalizados" },
  ];

  return (
    <View style={styles.root} testID={ProfileProjects.rootKey}>
      <Text variant="titleLarge" style={styles.title}>
        Proyectos
      </Text>
      <View style={styles.filter}>
        <ChoiceChips options={options} selected={vm.filter} onSelect={vm.setFilter} />
      </View>
      {vm.loading ? (
        <ActivityIndicator testID={ProfileProjects.loadingKey} />
      ) : vm.error ? (
        <View style={styles.message}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {vm.error}
          </Text>
          <Button onPress={vm.reload} testID={ProfileProjects.retryKey}>
            Reintentar
          </Button>
        </View>
      ) : vm.projects.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} testID={ProfileProjects.emptyKey}>
          {vm.total === 0 ? "Todavía no participa en ningún proyecto." : "Ningún proyecto en esta categoría."}
        </Text>
      ) : (
        vm.projects.map((project) => (
          <View key={project.id} style={styles.card}>
            <MyProjectCard project={project} onPress={() => onOpenProject(project.id)} testID={`profileProject.${project.id}`} />
          </View>
        ))
      )}
    </View>
  );
}

ProfileProjects.rootKey = "profileProjects";
ProfileProjects.loadingKey = "profileProjects.loading";
ProfileProjects.retryKey = "profileProjects.retry";
ProfileProjects.emptyKey = "profileProjects.empty";

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  title: {},
  filter: { marginBottom: spacing.xs },
  message: { gap: spacing.xs },
  // `MyProjectCard` ya trae su margen lateral: aquí se lo quitamos para que
  // quede alineada con el resto del perfil.
  card: { marginHorizontal: -spacing.gutter },
});
