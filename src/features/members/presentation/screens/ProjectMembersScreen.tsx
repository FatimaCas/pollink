import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from "react-native";
import { Button, IconButton, Text, useTheme } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { PersonRow } from "@/src/core/components/PersonRow";
import { useFollowToggle } from "@/src/features/follows/presentation/hooks/useFollowToggle";
import { Formatters } from "@/src/core/utils/formatters";
import { spacing } from "@/src/theme/tokens";
import { MEMBER_ROLE_LABELS } from "../../domain/entities/MemberStay";
import { useProjectMembersViewModel } from "../viewmodels/useProjectMembersViewModel";

// La pestaña «Miembros» de un proyecto: quién está hoy, con su papel y desde
// cuándo; tocar a alguien abre su perfil (B7). «Seguir» / «Siguiendo» usa la
// feature `follows`; un invitado lo ve y, al tocarlo, se le pide iniciar sesión. La barra Miembros · Tareas · Asignaciones es de
// `ProjectWorkspace`, que monta este cuerpo.
export function ProjectMembersTab({ projectId }: { projectId: string }) {
  const theme = useTheme();
  const navigation = useNavigation();
  const vm = useProjectMembersViewModel(projectId);
  const follow = useFollowToggle(vm.members.map((m) => m.userId));

  const confirm = (title: string, message: string, confirmLabel: string, run: () => Promise<string | null>, after?: () => void) =>
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: confirmLabel,
        style: "destructive",
        onPress: async () => {
          const failure = await run();
          if (failure) Alert.alert("No se pudo", failure);
          else after?.();
        },
      },
    ]);

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
            {follow.error ? (
              <Text variant="bodySmall" style={{ color: theme.colors.error }} testID="members.followError">
                {follow.error}
              </Text>
            ) : null}
          </View>
        }
        ListFooterComponent={
          vm.canLeave ? (
            <Button
              mode="outlined"
              textColor={theme.colors.error}
              style={styles.leave}
              testID="members.leave"
              onPress={() =>
                confirm(
                  "Salir del proyecto",
                  "Tus tareas sin terminar quedarán libres. Las terminadas se conservan a tu nombre.",
                  "Salir",
                  vm.leave,
                  () => navigation.goBack(),
                )
              }
            >
              Salir del proyecto
            </Button>
          ) : null
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
              subtitleLines={2}
              subtitle={[vm.careerOf(item), MEMBER_ROLE_LABELS[item.role], since].filter(Boolean).join(" · ")}
              action={
                item.userId === vm.userId ? undefined : (
                  <View style={styles.actions}>
                    <Button
                      mode={follow.isFollowing(item.userId) ? "outlined" : "contained-tonal"}
                      compact
                      labelStyle={styles.followLabel}
                      testID={`members.follow.${item.userId}`}
                      onPress={() => follow.toggle(item.userId)}
                    >
                      {follow.isFollowing(item.userId) ? "Siguiendo" : "Seguir"}
                    </Button>
                    {vm.canRemove(item) ? (
                      <IconButton
                        icon="account-remove-outline"
                        size={20}
                        style={styles.removeIcon}
                        accessibilityLabel="Quitar del proyecto"
                        testID={`members.remove.${item.userId}`}
                        onPress={() =>
                          confirm(
                            "Quitar del proyecto",
                            `${vm.nameOf(item)} saldrá del proyecto y sus tareas sin terminar quedarán libres.`,
                            "Quitar",
                            () => vm.remove(item),
                          )
                        }
                      />
                    ) : null}
                  </View>
                )
              }
              onPress={() =>
                navigation.navigate("PersonProfile", { userId: item.userId, projectId })
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
  actions: { flexDirection: "row", alignItems: "center" },
  removeIcon: { margin: 0 },
  followLabel: { marginHorizontal: 10 },
  leave: { marginTop: spacing.lg },
  empty: { textAlign: "center", marginTop: spacing.xl },
});
