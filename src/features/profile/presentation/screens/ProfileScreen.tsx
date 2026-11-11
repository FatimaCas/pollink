import { useNavigation } from "@react-navigation/native";
import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandHeader } from "@/src/core/components/BrandHeader";
import { EmptyState } from "@/src/core/components/EmptyState";
import { AccountPanel } from "@/src/features/auth/presentation/components/AccountPanel";
import { spacing } from "@/src/theme/tokens";
import { CompleteProfileCard } from "../components/CompleteProfileCard";
import { ProfilePill } from "../components/ProfilePill";
import { ProfileProjects } from "../components/ProfileProjects";
import { ProfileView } from "../components/ProfileView";
import { useMyProfileViewModel } from "../viewmodels/useMyProfileViewModel";

// La pestaña Perfil (B2): tu perfil, la tarjeta «Completa tu perfil» si falta
// algo y tus proyectos. Sin cuenta (sin sesión o invitado) muestra el panel de
// `auth` para entrar o guardar la cuenta.
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const vm = useMyProfileViewModel();
  const { reload } = vm;

  // Al volver de editar el perfil se vuelve a leer.
  useEffect(() => navigation.addListener("focus", reload), [navigation, reload]);

  if (vm.needsAccount) return <AccountPanel />;

  if (vm.loading && !vm.profile) return <ActivityIndicator style={styles.loading} testID={ProfileScreen.loadingKey} />;

  if (!vm.profile) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar tu perfil"
        message={vm.error ?? undefined}
        action={
          <Button mode="contained" onPress={vm.reload} testID={ProfileScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const edit = () => navigation.navigate("EditProfile");

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top }]} testID={ProfileScreen.scrollKey}>
      <View>
        <BrandHeader />
        <IconButton
          icon="cog-outline"
          onPress={() => navigation.navigate("Settings")}
          accessibilityLabel="Ajustes"
          style={styles.settings}
          testID={ProfileScreen.settingsKey}
        />
      </View>
      {vm.incomplete ? <CompleteProfileCard onPress={edit} testID={ProfileScreen.completeKey} /> : null}
      <ProfileView
        profile={vm.profile}
        name={vm.sessionName}
        emptyBio="Cuéntanos algo sobre ti."
        actions={<ProfilePill label="Editar perfil" onPress={edit} testID={ProfileScreen.editKey} />}
      >
        <ProfileProjects userId={vm.profile.userId} onOpenProject={(projectId) => navigation.navigate("ProjectInfo", { projectId })} />
      </ProfileView>
    </ScrollView>
  );
}

ProfileScreen.loadingKey = "profile.loading";
ProfileScreen.retryKey = "profile.retry";
ProfileScreen.scrollKey = "profile.scroll";
ProfileScreen.settingsKey = "profile.settings";
ProfileScreen.completeKey = "profile.complete";
ProfileScreen.editKey = "profile.edit";

const styles = StyleSheet.create({
  loading: { flex: 1 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  settings: { position: "absolute", right: spacing.sm, top: 0 },
});
