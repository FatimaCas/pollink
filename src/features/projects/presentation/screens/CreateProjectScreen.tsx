import { useNavigation } from "@react-navigation/native";
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/src/theme/tokens";
import { PROJECT_LIMITS } from "../../domain/entities/Project";
import { ChipListField } from "../components/ChipListField";
import { useCreateProjectViewModel } from "../viewmodels/useCreateProjectViewModel";

// Crear un proyecto (C2): nombre, descripción, carreras relacionadas,
// conocimientos e invitados por correo. Al crearlo vuelve a donde estaba.
export default function CreateProjectScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const vm = useCreateProjectViewModel();

  const submit = async () => {
    if (await vm.submit()) navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          mode="outlined"
          label="Nombre del proyecto"
          value={vm.title}
          onChangeText={vm.setTitle}
          maxLength={PROJECT_LIMITS.titleMax}
          disabled={vm.submitting}
          testID={CreateProjectScreen.titleKey}
        />
        <TextInput
          mode="outlined"
          label="Descripción"
          value={vm.description}
          onChangeText={vm.setDescription}
          maxLength={PROJECT_LIMITS.descriptionMax}
          multiline
          numberOfLines={4}
          disabled={vm.submitting}
          style={styles.description}
          testID={CreateProjectScreen.descriptionKey}
        />

        <ChipListField
          label="Carreras relacionadas"
          placeholder="Escribe una carrera"
          emptyText="Todavía no has agregado ninguna carrera."
          values={vm.jobs}
          onAdd={(value) => vm.add("jobs", value)}
          onRemove={(index) => vm.remove("jobs", index)}
          disabled={vm.submitting}
          testID={CreateProjectScreen.jobsKey}
        />
        <ChipListField
          label="Conocimientos requeridos"
          placeholder="Escribe un conocimiento"
          emptyText="Todavía no has agregado ningún conocimiento."
          values={vm.skills}
          onAdd={(value) => vm.add("skills", value)}
          onRemove={(index) => vm.remove("skills", index)}
          disabled={vm.submitting}
          testID={CreateProjectScreen.skillsKey}
        />
        <ChipListField
          label="Invitar personas (opcional)"
          placeholder="correo@uninorte.edu.co"
          emptyText="Puedes invitar a alguien por su correo, o hacerlo después."
          values={vm.emails}
          onAdd={(value) => vm.add("emails", value)}
          onRemove={(index) => vm.remove("emails", index)}
          keyboardType="email-address"
          disabled={vm.submitting}
          testID={CreateProjectScreen.emailsKey}
        />

        {vm.error ? (
          <HelperText type="error" padding="none" testID={CreateProjectScreen.errorKey}>
            {vm.error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={submit}
          loading={vm.submitting}
          disabled={vm.submitting}
          contentStyle={styles.cta}
          testID={CreateProjectScreen.submitKey}
        >
          Crear proyecto
        </Button>
        <Text variant="bodySmall" style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          Serás el creador del proyecto y podrás editar su información después.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

CreateProjectScreen.titleKey = "createProject.title";
CreateProjectScreen.descriptionKey = "createProject.description";
CreateProjectScreen.jobsKey = "createProject.jobs";
CreateProjectScreen.skillsKey = "createProject.skills";
CreateProjectScreen.emailsKey = "createProject.emails";
CreateProjectScreen.errorKey = "createProject.error";
CreateProjectScreen.submitKey = "createProject.submit";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.gutter, gap: spacing.lg },
  description: { minHeight: 110 },
  cta: { height: 48 },
  note: { textAlign: "center" },
});
