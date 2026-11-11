import { useNavigation } from "@react-navigation/native";
import React, { useEffect } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { Button, useTheme } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { spacing } from "@/src/theme/tokens";
import { InvitationCard } from "../components/InvitationCard";
import { useInvitationsViewModel } from "../viewmodels/useInvitationsViewModel";

// Las invitaciones pendientes (C6): a qué proyecto, quién invitó, y aceptar o
// rechazar. Al aceptar, el proyecto pasa a «Otros proyectos».
export default function InvitationsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { ensureLoggedIn } = useSession();
  const vm = useInvitationsViewModel();
  const { reload } = vm;

  useEffect(() => navigation.addListener("focus", reload), [navigation, reload]);

  if (vm.needsAccount) {
    return (
      <EmptyState
        icon="account-lock-outline"
        title="Necesitas una cuenta"
        message="Las invitaciones llegan al correo de tu cuenta."
        action={
          <Button mode="contained" onPress={ensureLoggedIn} testID={InvitationsScreen.signInKey}>
            Entrar o crear cuenta
          </Button>
        }
      />
    );
  }
  if (vm.loading) return <ActivityIndicator style={styles.loading} testID={InvitationsScreen.loadingKey} />;
  if (vm.error && vm.items.length === 0) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar tus invitaciones"
        message={vm.error}
        action={
          <Button mode="contained" onPress={vm.reload} testID={InvitationsScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      data={vm.items}
      keyExtractor={(item) => item.invitation.id}
      contentContainerStyle={styles.list}
      refreshing={false}
      onRefresh={vm.reload}
      ListEmptyComponent={
        <EmptyState
          icon="email-open-outline"
          title="No tienes invitaciones pendientes"
          message="Cuando alguien te invite a su proyecto, aparecerá aquí."
        />
      }
      renderItem={({ item }) => (
        <InvitationCard
          item={item}
          busy={vm.busyId === item.invitation.id}
          disabled={vm.busyId !== null}
          onOpenProject={() => navigation.navigate("ProjectDetail", { projectId: item.project.id })}
          onOpenInviter={(userId) => navigation.navigate("PersonProfile", { userId })}
          onAccept={() => vm.accept(item)}
          onDecline={() => vm.decline(item)}
        />
      )}
    />
  );
}

InvitationsScreen.signInKey = "invitations.signIn";
InvitationsScreen.loadingKey = "invitations.loading";
InvitationsScreen.retryKey = "invitations.retry";

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  list: { flexGrow: 1, paddingTop: spacing.md, paddingBottom: spacing.xl },
});
