import React from "react";
import { Button, Dialog, Portal, Text, useTheme } from "react-native-paper";

// Confirmar el cierre de un proyecto: es irreversible, así que se explica qué
// pasa y el botón de cerrar va en el color de error.
export function CloseProjectDialog({
  visible,
  projectTitle,
  closing,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  projectTitle: string;
  closing: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={closing ? undefined : onDismiss} testID={CloseProjectDialog.key}>
        <Dialog.Title>¿Cerrar «{projectTitle}»?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            El proyecto dejará de recibir solicitudes e invitaciones. Quienes ya colaboran siguen en él y pueden seguir
            con sus tareas. No se puede volver a abrir.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={closing} textColor={theme.colors.onSurface} testID={CloseProjectDialog.cancelKey}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            onPress={onConfirm}
            loading={closing}
            disabled={closing}
            testID={CloseProjectDialog.confirmKey}
          >
            Cerrar proyecto
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

CloseProjectDialog.key = "closeProjectDialog";
CloseProjectDialog.cancelKey = "closeProjectDialog.cancel";
CloseProjectDialog.confirmKey = "closeProjectDialog.confirm";
