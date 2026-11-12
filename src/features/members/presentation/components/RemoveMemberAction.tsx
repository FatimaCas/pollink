import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Alert } from "react-native";
import { Button, useTheme } from "react-native-paper";

import { useProjectMembersViewModel } from "../viewmodels/useProjectMembersViewModel";

// «Quitar del proyecto» desde el perfil de un miembro (B7). Solo lo ve el
// creador y solo sobre otro miembro: la regla es `canRemove` de Miembros.
export function RemoveMemberAction({ projectId, userId }: { projectId: string; userId: string }) {
  const vm = useProjectMembersViewModel(projectId);
  const navigation = useNavigation();
  const theme = useTheme();
  const member = vm.members.find((m) => m.userId === userId);
  if (!member || !vm.canRemove(member)) return null;

  const run = async () => {
    const failure = await vm.remove(member);
    if (failure) Alert.alert("No se pudo", failure);
    else navigation.goBack();
  };

  return (
    <Button
      compact
      icon="account-remove-outline"
      textColor={theme.colors.error}
      testID={RemoveMemberAction.key}
      onPress={() =>
        Alert.alert("Quitar del proyecto", "Saldrá del proyecto y sus tareas sin terminar quedarán libres.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Quitar", style: "destructive", onPress: run },
        ])
      }
    >
      Quitar del proyecto
    </Button>
  );
}

RemoveMemberAction.key = "personProfile.remove";
