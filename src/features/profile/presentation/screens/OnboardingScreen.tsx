import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { initialsOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { spacing } from "@/src/theme/tokens";
import { ProfileFormFields } from "../components/ProfileFormFields";
import { useEditProfileViewModel } from "../viewmodels/useEditProfileViewModel";

// Onboarding (B3): los primeros datos del perfil justo después de crear la
// cuenta o de guardar la de invitado. Se puede omitir: quien no quiera
// llenarlo sigue donde estaba y lo completa después desde su perfil. Tanto
// guardar como omitir vuelven a la pantalla desde la que se llegó.
export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { displayName } = useSession();
  const vm = useEditProfileViewModel();
  const firstName = displayName.trim().split(/\s+/)[0] ?? "";

  const skip = () => navigation.goBack();
  const save = async () => {
    // Sin nada escrito, guardar es lo mismo que omitir.
    if (vm.isEmpty || (await vm.save())) skip();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.primaryContainer }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Avatar.Text size={80} label={initialsOf(displayName)} color={theme.colors.onPrimary} style={{ backgroundColor: theme.colors.primary }} />
          <Text variant="headlineMedium" style={styles.title} testID={OnboardingScreen.titleKey}>
            {firstName ? `¡Hola, ${firstName}!` : "Cuéntanos de ti"}
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Así te verá el resto de la gente al abrir tu perfil. Puedes completarlo ahora o más tarde.
          </Text>
        </View>

        {vm.loading ? (
          <ActivityIndicator testID={OnboardingScreen.loadingKey} />
        ) : (
          <>
            {/* Si el perfil no cargó no se ofrece el formulario: guardaría vacíos sobre lo que haya. */}
            {vm.loadError ? (
              <Button onPress={vm.reload} testID={OnboardingScreen.retryKey}>
                Reintentar
              </Button>
            ) : (
              <>
                <ProfileFormFields vm={vm} idPrefix="onboarding" />
                <Button mode="contained" onPress={save} loading={vm.saving} disabled={vm.saving} contentStyle={styles.cta} testID={OnboardingScreen.saveKey}>
                  Guardar y continuar
                </Button>
              </>
            )}
          </>
        )}
        <Button onPress={skip} disabled={vm.saving} testID={OnboardingScreen.skipKey}>
          Ahora no
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

OnboardingScreen.titleKey = "onboarding.title";
OnboardingScreen.loadingKey = "onboarding.loading";
OnboardingScreen.retryKey = "onboarding.retry";
OnboardingScreen.saveKey = "onboarding.save";
OnboardingScreen.skipKey = "onboarding.skip";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.gutter, gap: spacing.lg, paddingBottom: spacing.xl },
  hero: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center" },
  cta: { height: 48 },
});
