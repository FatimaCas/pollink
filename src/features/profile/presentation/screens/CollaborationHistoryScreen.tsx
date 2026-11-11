import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { Button } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { RootStackParamList } from "@/src/navigation/types";
import { MyProjectCard } from "@/src/features/projects/presentation/components/MyProjectCard";
import { spacing } from "@/src/theme/tokens";
import { useCollaborationHistoryViewModel } from "../viewmodels/useCollaborationHistoryViewModel";

// Historial de colaboración (B7): todos los proyectos en los que la persona
// tuvo alguna estancia, creados primero. Con `onlyPrevious`, solo los cerrados.
export default function CollaborationHistoryScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "CollaborationHistory">>();
  const onlyPrevious = params.onlyPrevious === true;
  const vm = useCollaborationHistoryViewModel(params.userId, onlyPrevious);

  if (vm.loading) return <ActivityIndicator style={styles.loading} testID={CollaborationHistoryScreen.loadingKey} />;

  if (vm.error && vm.projects.length === 0) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar el historial"
        message={vm.error}
        action={
          <Button mode="contained" onPress={vm.reload} testID={CollaborationHistoryScreen.retryKey}>
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
      renderItem={({ item }) => (
        <MyProjectCard project={item} onPress={() => navigation.navigate("ProjectInfo", { projectId: item.id })} testID={`history.${item.id}`} />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="history"
          title={onlyPrevious ? "Sin proyectos anteriores" : "Sin historial todavía"}
          message={onlyPrevious ? "Aún no ha cerrado ningún proyecto." : "Aparecen los proyectos en los que colabore."}
        />
      }
      testID={CollaborationHistoryScreen.listKey}
    />
  );
}

CollaborationHistoryScreen.loadingKey = "history.loading";
CollaborationHistoryScreen.retryKey = "history.retry";
CollaborationHistoryScreen.listKey = "history.list";

const styles = StyleSheet.create({
  loading: { flex: 1 },
  list: { paddingVertical: spacing.lg, flexGrow: 1 },
});
