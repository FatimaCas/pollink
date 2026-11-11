import { StackActions, useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";

import { BrandHeader } from "@/src/core/components/BrandHeader";
import { goToOnboarding } from "@/src/navigation/navigationRef";
import { spacing } from "@/src/theme/tokens";
import { useSession } from "../context/SessionContext";

// Crear una cuenta con nombre, correo y contraseña.
export default function RegisterScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmation: "" });
  const set = (field: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));
  const { clearError } = session;

  useEffect(() => {
    clearError();
  }, [clearError]);

  const submit = async () => {
    // Se cierran las dos rutas: registro y login. Después, los primeros datos
    // del perfil (se pueden omitir).
    if (await session.register(form)) {
      navigation.dispatch(StackActions.pop(2));
      goToOnboarding();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BrandHeader />
        <Text variant="headlineSmall" style={styles.center}>
          Crea tu cuenta
        </Text>
        <TextInput testID={RegisterScreen.nameFieldKey} mode="outlined" label="Nombre" autoCapitalize="words" value={form.name} onChangeText={set("name")} />
        <TextInput testID={RegisterScreen.emailFieldKey} mode="outlined" label="Correo" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set("email")} />
        <TextInput testID={RegisterScreen.passwordFieldKey} mode="outlined" label="Contraseña" secureTextEntry value={form.password} onChangeText={set("password")} />
        <TextInput
          testID={RegisterScreen.confirmationFieldKey}
          mode="outlined"
          label="Repite la contraseña"
          secureTextEntry
          value={form.confirmation}
          onChangeText={set("confirmation")}
          onSubmitEditing={submit}
        />
        {session.error ? (
          <HelperText type="error" testID={RegisterScreen.errorKey}>
            {session.error}
          </HelperText>
        ) : null}
        <Button testID={RegisterScreen.submitButtonKey} mode="contained" onPress={submit} loading={session.busy} disabled={session.busy} contentStyle={styles.cta}>
          Crear cuenta
        </Button>
        <Button onPress={() => navigation.goBack()}>Ya tengo cuenta</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

RegisterScreen.nameFieldKey = "register.name";
RegisterScreen.emailFieldKey = "register.email";
RegisterScreen.passwordFieldKey = "register.password";
RegisterScreen.confirmationFieldKey = "register.confirmation";
RegisterScreen.submitButtonKey = "register.submit";
RegisterScreen.errorKey = "register.error";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.xl, gap: spacing.md },
  center: { textAlign: "center" },
  cta: { height: 48 },
});
