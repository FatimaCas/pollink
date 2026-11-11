import React from "react";
import { Button, Dialog, HelperText, Portal, Text } from "react-native-paper";

// «¿Postularte al proyecto?»: la confirmación antes de enviar la solicitud.
export function ConfirmApplicationDialog({
  visible,
  projectTitle,
  busy,
  error,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  projectTitle: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} dismissable={!busy}>
        <Dialog.Title>¿Postularte al proyecto?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">Estás a punto de postularte a:</Text>
          <Text variant="titleMedium" style={{ marginTop: 6 }} testID={ConfirmApplicationDialog.titleKey}>
            {projectTitle}
          </Text>
          {error ? (
            <HelperText type="error" testID={ConfirmApplicationDialog.errorKey}>
              {error}
            </HelperText>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={busy} testID={ConfirmApplicationDialog.cancelKey}>
            Cancelar
          </Button>
          <Button mode="contained" icon="check" onPress={onConfirm} loading={busy} disabled={busy} testID={ConfirmApplicationDialog.confirmKey}>
            Confirmar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

ConfirmApplicationDialog.titleKey = "confirmApplication.title";
ConfirmApplicationDialog.errorKey = "confirmApplication.error";
ConfirmApplicationDialog.cancelKey = "confirmApplication.cancel";
ConfirmApplicationDialog.confirmKey = "confirmApplication.confirm";
