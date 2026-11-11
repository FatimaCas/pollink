import { useNavigation } from "@react-navigation/native";
import React, { useEffect } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { Button } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { spacing } from "@/src/theme/tokens";
import { useSavedProjectsViewModel } from "../viewmodels/useSavedProjectsViewModel";
import { ProjectCard } from "./ProjectCard";

// El contenido de la pestaña «Guardados» de Proyectos. La pantalla Proyectos
// (C3) lo monta como tercer segmento, junto a «Mis proyectos» y «Otros proyectos».
export function SavedProjectsView() {
  const navigation = useNavigation();
  const vm = useSavedProjectsViewModel();
  const { reload } = vm;

  // Se guarda desde Descubrir: al volver a esta pestaña se vuelve a leer.
  useEffect(() => navigation.addListener("focus", reload), [navigation, reload]);

  if (vm.loading) return <ActivityIndicator style={styles.center} testID={SavedProjectsView.loadingKey} />;

  if (vm.error && vm.projects.length === 0) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar tus guardados"
        message={vm.error}
        action={
          <Button mode="contained" onPress={vm.reload} testID={SavedProjectsView.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <FlatList
      data={vm.projects}
      keyExtractor={(project) => project.id}
      contentContainerStyle={styles.list}
      refreshing={false}
      onRefresh={vm.reload}
      ListEmptyComponent={
        <EmptyState icon="bookmark-outline" title="Aún no guardas proyectos" message="Toca el marcador de un proyecto en Descubrir para guardarlo y verlo aquí." />
      }
      renderItem={({ item }) => (
        <ProjectCard
          project={item}
          saved
          onPress={() => navigation.navigate("ProjectDetail", { projectId: item.id })}
          onToggleSaved={() => vm.unsave(item)}
          testID={`saved.card.${item.id}`}
        />
      )}
    />
  );
}

SavedProjectsView.loadingKey = "saved.loading";
SavedProjectsView.retryKey = "saved.retry";

const styles = StyleSheet.create({
  center: { marginTop: spacing.xl },
  list: { flexGrow: 1, paddingTop: spacing.sm, paddingBottom: spacing.xl },
});
