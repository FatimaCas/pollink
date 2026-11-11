import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, HelperText, Text, TextInput } from "react-native-paper";

import { BrandHeader } from "@/src/core/components/BrandHeader";
import { spacing } from "@/src/theme/tokens";
import { useSession } from "../context/SessionContext";

// Entrar con correo y contraseña, o seguir como invitado: un invitado puede
// mirar, guardar proyectos y comentar, pero no postularse ni crear proyectos.
export default function LoginScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { clearError } = session;

  useEffect(() => {
    clearError();
  }, [clearError]);

  const submit = async () => {
    if (await session.login(email, password)) navigation.goBack();
  };

  // Un invitado ya tiene sesión: no hay nada más que pedirle.
  const continueAsGuest = async () => {
    if (await session.ensureWritableSession()) navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BrandHeader />
        <Text variant="headlineSmall" style={styles.center}>
          Bienvenida o bienvenido
        </Text>
        <Text variant="bodyLarge" style={styles.center}>
          Entra para colaborar en proyectos.
        </Text>
        <TextInput
          testID={LoginScreen.emailFieldKey}
          mode="outlined"
          label="Correo"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID={LoginScreen.passwordFieldKey}
          mode="outlined"
          label="Contraseña"
          secureTextEntry={!showPassword}
          right={<TextInput.Icon testID={LoginScreen.togglePasswordKey} icon={showPassword ? "eye-off-outline" : "eye-outline"} onPress={() => setShowPassword((v) => !v)} forceTextInputFocus={false} />}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />
        {session.error ? (
          <HelperText type="error" testID={LoginScreen.errorKey}>
            {session.error}
          </HelperText>
        ) : null}
        <Button testID={LoginScreen.submitButtonKey} mode="contained" onPress={submit} loading={session.busy} disabled={session.busy} contentStyle={styles.cta}>
          Entrar
        </Button>
        <Button testID={LoginScreen.registerButtonKey} onPress={() => navigation.navigate("Register")}>
          No tengo cuenta, quiero registrarme
        </Button>
        <View style={styles.or}>
          <Divider style={styles.flex} />
          <Text variant="labelMedium">o</Text>
          <Divider style={styles.flex} />
        </View>
        <Button testID={LoginScreen.guestButtonKey} mode="outlined" icon="account-outline" onPress={continueAsGuest} disabled={session.busy} contentStyle={styles.cta}>
          Continuar como invitado
        </Button>
        <Text variant="bodySmall" style={styles.center}>
          Como invitado puedes explorar y guardar proyectos; para postularte necesitas una cuenta.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Las claves con las que las pruebas llegan a cada control sin depender de su texto.
LoginScreen.emailFieldKey = "login.email";
LoginScreen.passwordFieldKey = "login.password";
LoginScreen.submitButtonKey = "login.submit";
LoginScreen.registerButtonKey = "login.register";
LoginScreen.guestButtonKey = "login.guest";
LoginScreen.errorKey = "login.error";
LoginScreen.togglePasswordKey = "login.togglePassword";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.xl, gap: spacing.md },
  center: { textAlign: "center" },
  cta: { height: 48 },
  or: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
