import React from "react";
import { StyleSheet } from "react-native";
import { HelperText, TextInput } from "react-native-paper";

import { ChipListField } from "@/src/features/projects/presentation/components/ChipListField";
import { useEditProfileViewModel } from "../viewmodels/useEditProfileViewModel";

// Los campos del perfil (carrera, institución, «Sobre mí», habilidades) y el
// error de guardado. Los comparten «Editar perfil» y el onboarding. Los
// testID salen de `idPrefix`: `<prefijo>.program`, `.institution`, `.bio`,
// `.skills` y `.error`.
export function ProfileFormFields({ vm, idPrefix }: { vm: ReturnType<typeof useEditProfileViewModel>; idPrefix: string }) {
  return (
    <>
      <TextInput mode="outlined" label="Carrera" value={vm.program} onChangeText={vm.setProgram} disabled={vm.saving} testID={`${idPrefix}.program`} />
      <TextInput
        mode="outlined"
        label="Institución"
        value={vm.institution}
        onChangeText={vm.setInstitution}
        disabled={vm.saving}
        testID={`${idPrefix}.institution`}
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
        testID={`${idPrefix}.bio`}
      />
      <ChipListField
        label="Habilidades"
        placeholder="Escribe una habilidad"
        emptyText="Todavía no has agregado ninguna habilidad."
        values={vm.skills}
        onAdd={vm.addSkill}
        onRemove={vm.removeSkill}
        disabled={vm.saving}
        testID={`${idPrefix}.skills`}
      />
      {vm.error ? (
        <HelperText type="error" padding="none" testID={`${idPrefix}.error`}>
          {vm.error}
        </HelperText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bio: { minHeight: 110 },
});
