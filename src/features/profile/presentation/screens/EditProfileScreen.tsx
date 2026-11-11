import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { ChipListField } from "@/src/features/projects/presentation/components/ChipListField";
import { spacing } from "@/src/theme/tokens";
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
        <TextInput
          mode="outlined"
          label="Carrera"
          value={vm.program}
          onChangeText={vm.setProgram}
          disabled={vm.saving}
          testID={EditProfileScreen.programKey}
        />
        <TextInput
          mode="outlined"
          label="Institución"
          value={vm.institution}
          onChangeText={vm.setInstitution}
          disabled={vm.saving}
          testID={EditProfileScreen.institutionKey}
        />
        <TextInput
          mode="outlined"
          label="Sobre mí"
          value={vm.bio}
          onChangeText={vm.setBio}
          multiline
          numberOfLines={5}
          disabled={vm.saving}
          style={styles.bio}
          testID={EditProfileScreen.bioKey}
        />
        <ChipListField
          label="Habilidades"
          placeholder="Escribe una habilidad"
          emptyText="Todavía no has agregado ninguna habilidad."
          values={vm.skills}
          onAdd={vm.addSkill}
          onRemove={vm.removeSkill}
          disabled={vm.saving}
          testID={EditProfileScreen.skillsKey}
        />
        {vm.error ? (
          <HelperText type="error" padding="none" testID={EditProfileScreen.errorKey}>
            {vm.error}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={submit}
          loading={vm.saving}
          disabled={vm.saving}
          contentStyle={styles.cta}
          testID={EditProfileScreen.saveKey}
        >
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
  bio: { minHeight: 110 },
  cta: { height: 48 },
});
