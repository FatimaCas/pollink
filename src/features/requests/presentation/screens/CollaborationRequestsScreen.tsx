import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { PersonRow } from "@/src/core/components/PersonRow";
import { Formatters } from "@/src/core/utils/formatters";
import type { RootStackParamList } from "@/src/navigation/types";
import { spacing } from "@/src/theme/tokens";
import { isPending, JOIN_REQUEST_STATE_LABELS } from "../../domain/entities/JoinRequest";
import { useJoinRequestsViewModel } from "../viewmodels/useJoinRequestsViewModel";

// Las solicitudes de un proyecto (la vista del creador): las pendientes primero
// y las resueltas después, con su estado. Tocar una abre la ficha del aplicante.
// «Compromiso N %» (B5) se suma a cada fila cuando exista el repositorio de confianza.
export default function CollaborationRequestsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "CollaborationRequests">>();
  const vm = useJoinRequestsViewModel(params.projectId);

  if (vm.loading) return <ActivityIndicator style={styles.center} testID={CollaborationRequestsScreen.loadingKey} />;

  if (vm.error && vm.requests.length === 0) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar las solicitudes"
        message={vm.error}
        action={
          <Button mode="contained" onPress={vm.reload} testID={CollaborationRequestsScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={vm.requests}
        keyExtractor={(request) => request.id}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={vm.reload}
        ListHeaderComponent={
          vm.requests.length > 0 ? (
            <Text variant="titleMedium" style={styles.header} testID="requests.count">
              {vm.pendingCount === 1 ? "1 solicitud pendiente" : `${vm.pendingCount} solicitudes pendientes`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState icon="email-outline" title="Aún no hay solicitudes" message="Cuando alguien quiera unirse a tu proyecto, lo verás aquí." />
        }
        renderItem={({ item }) => {
          const when = item.createdAt ? Formatters.relative(item.createdAt) : null;
          const subtitle = isPending(item)
            ? when
              ? `Solicitó ${when}`
              : "Pendiente"
            : [JOIN_REQUEST_STATE_LABELS[item.state], when].filter(Boolean).join(" · ");
          return (
            <PersonRow
              testID={`requests.row.${item.id}`}
              name={vm.nameOf(item)}
              subtitle={subtitle}
              onPress={() => navigation.navigate("ApplicantDetail", { requestId: item.id })}
            />
          );
        }}
      />
    </View>
  );
}

CollaborationRequestsScreen.loadingKey = "requests.loading";
CollaborationRequestsScreen.retryKey = "requests.retry";

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { marginTop: spacing.xl },
  list: { padding: spacing.gutter, flexGrow: 1 },
  header: { marginBottom: spacing.sm },
});
