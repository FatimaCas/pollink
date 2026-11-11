import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Avatar, Button, Card, Dialog, Portal, Text } from "react-native-paper";

import { initialsOf } from "@/src/core/utils/formatters";
import { EmptyState } from "@/src/core/components/EmptyState";
import { useSession } from "../context/SessionContext";
import { SaveAccountForm, SaveAccountSheet } from "./SaveAccountSheet";

// La cuenta de quien está dentro: entrar, guardar la cuenta de invitado y
// cerrar sesión. La pestaña Perfil (feature `profile`) la muestra mientras se
// construye; después se puede mover a Ajustes, como en Imker.
export function AccountPanel() {
  const navigation = useNavigation();
  const session = useSession();
  const [saving, setSaving] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const user = session.user;

  // Si el correo ya tiene cuenta, Roble no fusiona nada: lo único honesto es
  // decirlo y ofrecer entrar, avisando de que lo del invitado se queda atrás.
  const saveAccount = async (form: SaveAccountForm) => {
    if (await session.upgrade(form)) {
      setSaving(false);
      // Ya tiene cuenta: los primeros datos del perfil (se pueden omitir).
      navigation.navigate("Onboarding");
      return;
    }
    if (session.lastFailureCode() === "ANON_UPGRADE_EMAIL_TAKEN") {
      setSaving(false);
      setEmailTaken(true);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon="account-outline"
        title="No has entrado"
        message="Entra o crea una cuenta para continuar."
        action={
          <Button mode="contained" onPress={() => navigation.navigate("Login")}>
            Entrar
          </Button>
        }
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Avatar.Text size={80} label={initialsOf(user.name)} style={styles.center} />
      <Text variant="titleLarge" style={styles.centerText}>
        {session.guestName ?? user.name}
      </Text>
      {/* La dirección de un invitado es inventada: en su lugar va lo único cierto. */}
      <Text variant="bodyMedium" style={styles.centerText}>
        {session.isGuest ? "Estás como invitado" : user.email}
      </Text>

      {session.isGuest ? (
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium">Guarda tu cuenta</Text>
            <Text variant="bodySmall">
              Sin correo ni contraseña, lo que haces vive solo en este teléfono.
            </Text>
            <Button
              mode="contained"
              icon="content-save-outline"
              onPress={() => {
                session.clearError();
                setSaving(true);
              }}
              contentStyle={styles.cta}
            >
              Guardar mi cuenta
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {/* A un invitado no se le ofrece cerrar sesión: no tiene con qué volver. */}
      {!session.isGuest ? (
        <Button mode="outlined" icon="logout" onPress={session.logout} contentStyle={styles.cta}>
          Cerrar sesión
        </Button>
      ) : null}

      <SaveAccountSheet
        visible={saving}
        initialName={session.guestName}
        busy={session.busy}
        error={session.error}
        onSubmit={saveAccount}
        onDismiss={() => setSaving(false)}
      />
      <Portal>
        <Dialog visible={emailTaken} onDismiss={() => setEmailTaken(false)}>
          <Dialog.Title>Ese correo ya tiene cuenta</Dialog.Title>
          <Dialog.Content>
            <Text>Puedes entrar con ella, pero lo que guardaste como invitado se queda en esta sesión: no se pasa a la otra cuenta.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEmailTaken(false)}>Usar otro correo</Button>
            <Button
              onPress={() => {
                setEmailTaken(false);
                navigation.navigate("Login");
              }}
            >
              Entrar con esa cuenta
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  center: { alignSelf: "center", marginBottom: 4 },
  centerText: { textAlign: "center" },
  card: { marginTop: 12 },
  cardContent: { gap: 8 },
  cta: { height: 48 },
});
