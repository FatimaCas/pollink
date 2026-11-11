import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Chip, Text, useTheme } from "react-native-paper";

import { initialsOf } from "@/src/core/utils/formatters";
import { spacing } from "@/src/theme/tokens";
import { UserProfile } from "../../domain/entities/UserProfile";

// El perfil de una persona, tal como lo dibuja el Figma: foto (iniciales) con
// nombre, carrera e institución a su lado, las pastillas de acción, «Sobre mí»,
// «Habilidades» y debajo lo que cada pantalla quiera agregar (`children`:
// «Proyectos», historial…). Es de solo lectura: sirve para el perfil propio y
// para el de otra persona.
//
// Contrato con A, C y D (plan de trabajo, §5): `profile` + `name` + `actions`
// (pastillas) + `children`. El widget de confianza entra como una pastilla más
// en `actions`.
export function ProfileView({
  profile,
  name,
  actions,
  emptyBio,
  children,
}: {
  profile: UserProfile;
  // El nombre a mostrar si la fila de perfil no lo trae (p. ej. el de la sesión).
  name?: string;
  // Pastillas junto al nombre: «Editar perfil», confianza…
  actions?: React.ReactNode;
  // Qué decir cuando no hay descripción. Sin esto, la sección no se muestra.
  emptyBio?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const shownName = profile.name || name || "Sin nombre";
  const { program, institution } = profile.career;
  const muted = { color: theme.colors.onSurfaceVariant };

  return (
    <View style={styles.root} testID="profileView">
      <View style={styles.header}>
        <Avatar.Text
          size={96}
          label={initialsOf(shownName)}
          color={theme.colors.onPrimary}
          style={{ backgroundColor: theme.colors.primary }}
        />
        <View style={styles.identity}>
          <Text variant="headlineSmall" style={styles.name} testID={ProfileView.nameKey}>
            {shownName}
          </Text>
          {program ? (
            <Text variant="bodyMedium" style={muted} testID={ProfileView.programKey}>
              {program}
            </Text>
          ) : null}
          {institution ? (
            <View style={styles.institution}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={muted} testID={ProfileView.institutionKey}>
                {institution}
              </Text>
            </View>
          ) : null}
          {actions ? <View style={styles.pills}>{actions}</View> : null}
        </View>
      </View>

      {profile.bio || emptyBio ? (
        <View style={styles.section}>
          <Text variant="titleLarge">Sobre mí</Text>
          <Text variant="bodyLarge" style={profile.bio ? undefined : muted} testID={ProfileView.bioKey}>
            {profile.bio || emptyBio}
          </Text>
        </View>
      ) : null}

      {profile.skills.length > 0 ? (
        <View style={styles.section}>
          <Text variant="titleLarge">Habilidades</Text>
          <View style={styles.chips}>
            {profile.skills.map((skill) => (
              <Chip
                key={skill}
                style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.primary }]}
                testID={`${ProfileView.skillKeyPrefix}.${skill}`}
              >
                {skill}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      {children}
    </View>
  );
}

ProfileView.nameKey = "profileView.name";
ProfileView.programKey = "profileView.program";
ProfileView.institutionKey = "profileView.institution";
ProfileView.bioKey = "profileView.bio";
ProfileView.skillKeyPrefix = "profileView.skill";

const styles = StyleSheet.create({
  root: { gap: spacing.lg, paddingHorizontal: spacing.gutter },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  identity: { flex: 1, gap: 2 },
  name: { fontWeight: "700" },
  institution: { flexDirection: "row", alignItems: "center", gap: 4 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  section: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderWidth: 1 },
});
