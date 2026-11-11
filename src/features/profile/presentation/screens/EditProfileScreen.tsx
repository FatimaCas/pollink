import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { spacing } from "@/src/theme/tokens";
import { ProfileFormFields } from "../components/ProfileFormFields";
import { useEditProfileViewModel } from "../viewmodels/useEditProfileViewModel";

// Editar perfil (B2): carrera, institución, «Sobre mí» y habilidades. Al
// guardar vuelve a la pantalla anterior.
export default function EditProfileScreen() {
  const navigation = useNavigation();
  const vm = useEditProfileViewModel();

  if (vm.loading) return <ActivityIndicator style={styles.flex} testID={EditProfileScreen.loadingKey} />;

  if (vm.loadError) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar tu perfil"
        message={vm.loadError}
        action={
          <Button mode="contained" onPress={vm.reload} testID={EditProfileScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const submit = async () => {
    if (await vm.save()) navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ProfileFormFields vm={vm} idPrefix="editProfile" />
        <Button mode="contained" onPress={submit} loading={vm.saving} disabled={vm.saving} contentStyle={styles.cta} testID={EditProfileScreen.saveKey}>
          Guardar
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

EditProfileScreen.loadingKey = "editProfile.loading";
EditProfileScreen.retryKey = "editProfile.retry";
EditProfileScreen.programKey = "editProfile.program";
EditProfileScreen.institutionKey = "editProfile.institution";
EditProfileScreen.bioKey = "editProfile.bio";
EditProfileScreen.skillsKey = "editProfile.skills";
EditProfileScreen.errorKey = "editProfile.error";
EditProfileScreen.saveKey = "editProfile.save";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.gutter, gap: spacing.lg },
  cta: { height: 48 },
});
