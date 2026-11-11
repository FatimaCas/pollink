import React, { useState } from "react";
import { IconButton, Menu, useTheme } from "react-native-paper";

// El menú ⋮ del creador en la ficha del proyecto. Hoy tiene una sola acción:
// cerrar el proyecto (C5).
export function ProjectActionsMenu({ onCloseProject }: { onCloseProject: () => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <IconButton
          icon="dots-vertical"
          onPress={() => setOpen(true)}
          accessibilityLabel="Más acciones"
          testID={ProjectActionsMenu.openKey}
        />
      }
    >
      <Menu.Item
        leadingIcon="lock-outline"
        title="Cerrar proyecto"
        titleStyle={{ color: theme.colors.error }}
        onPress={() => {
          setOpen(false);
          onCloseProject();
        }}
        testID={ProjectActionsMenu.closeKey}
      />
    </Menu>
  );
}

ProjectActionsMenu.openKey = "projectActions.open";
ProjectActionsMenu.closeKey = "projectActions.close";
