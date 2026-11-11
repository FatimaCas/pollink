import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Button, Dialog, Portal, Text } from "react-native-paper";

// El aviso de «necesitas una cuenta»: lo que ve un invitado (o quien no ha
// entrado) cuando intenta algo que exige cuenta, como postularse a un proyecto.
// Ofrece entrar o crear la cuenta; «Ahora no» lo cierra sin más.
export function AccountRequiredDialog({
  visible,
  message,
  onDismiss,
}: {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}) {
  const navigation = useNavigation();
  const go = (route: "Login" | "Register") => {
    onDismiss();
    navigation.navigate(route);
  };
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} testID={AccountRequiredDialog.dialogKey}>
        <Dialog.Title>Necesitas una cuenta</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} testID={AccountRequiredDialog.dismissKey}>
            Ahora no
          </Button>
          <Button onPress={() => go("Register")} testID={AccountRequiredDialog.registerKey}>
            Crear cuenta
          </Button>
          <Button mode="contained" onPress={() => go("Login")} testID={AccountRequiredDialog.loginKey}>
            Entrar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

AccountRequiredDialog.dialogKey = "accountRequired.dialog";
AccountRequiredDialog.dismissKey = "accountRequired.dismiss";
AccountRequiredDialog.registerKey = "accountRequired.register";
AccountRequiredDialog.loginKey = "accountRequired.login";
