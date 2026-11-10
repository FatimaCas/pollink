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
import { MEMBER_ROLE_LABELS } from "../../domain/entities/MemberStay";
import { useProjectMembersViewModel } from "../viewmodels/useProjectMembersViewModel";

// La pestaña «Miembros» de un proyecto: quién está hoy, con su papel y desde
// cuándo; tocar a alguien abre su perfil (B7). «Seguir» del Figma se muestra
// desactivado con un aviso (no hay relación seguir en el esquema) y la carrera
// queda fuera: depende del directorio de B. La barra Miembros · Tareas · Asignaciones es de la pantalla del
// proyecto (C4).
export default function ProjectMembersScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ProjectMembers">>();
  const vm = useProjectMembersViewModel(params.projectId);

  if (vm.loading) return <ActivityIndicator style={styles.center} testID="members.loading" />;

  if (vm.error && vm.members.length === 0) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar los miembros"
        message={vm.error}
        action={<Button textColor={theme.colors.onSurface} onPress={vm.reload}>Reintentar</Button>}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={vm.members}
        keyExtractor={(member) => member.userId}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={vm.reload}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="titleMedium" testID="members.count">
              {vm.members.length === 1 ? "1 miembro" : `${vm.members.length} miembros`}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} testID="members.followSoon">
              Seguir a otros miembros llegará pronto.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.empty}>
            Aún no hay miembros en este proyecto.
          </Text>
        }
        renderItem={({ item }) => {
          const since = item.joinedAt ? `desde ${Formatters.date(item.joinedAt)}` : null;
          return (
            <PersonRow
              testID={`members.row.${item.userId}`}
              name={vm.nameOf(item)}
              subtitle={[MEMBER_ROLE_LABELS[item.role], since].filter(Boolean).join(" · ")}
              action={
                item.userId === vm.userId ? undefined : (
                  <Button mode="contained-tonal" compact disabled testID={`members.follow.${item.userId}`}>
                    Seguir
                  </Button>
                )
              }
              onPress={() =>
                navigation.navigate("PersonProfile", { userId: item.userId, projectId: params.projectId })
              }
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { marginTop: spacing.xl },
  list: { padding: spacing.gutter },
  header: { marginBottom: spacing.sm, gap: 2 },
  empty: { textAlign: "center", marginTop: spacing.xl },
});
