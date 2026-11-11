import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TouchableRipple, useTheme } from "react-native-paper";

import { Formatters } from "@/src/core/utils/formatters";
import { radius, spacing } from "@/src/theme/tokens";
import { InvitationItem } from "../viewmodels/useInvitationsViewModel";

// Una invitación pendiente: el proyecto, quién invitó («Te invitó…», que abre
// su perfil) y «Rechazar» / «Aceptar». El nombre de quien invitó depende del
// directorio de personas (B); mientras no exista se dice qué papel tiene.
export function InvitationCard({
  item,
  busy,
  disabled,
  onOpenProject,
  onOpenInviter,
  onAccept,
  onDecline,
}: {
  item: InvitationItem;
  busy: boolean;
  disabled: boolean;
  onOpenProject: () => void;
  onOpenInviter: (userId: string) => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const theme = useTheme();
  const { invitation, project } = item;
  const testID = `invitation.${invitation.id}`;
  const inviter = invitation.invitedBy;
  const who = inviter === null ? null : inviter === project.ownerId ? "el creador del proyecto" : "un integrante del proyecto";
  const when = invitation.createdAt ? ` · ${Formatters.relative(invitation.createdAt)}` : "";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]} testID={testID}>
      <TouchableRipple onPress={onOpenProject} accessibilityRole="button" accessibilityLabel={project.title} testID={`${testID}.project`}>
        <View style={styles.texts}>
          <Text variant="titleMedium" style={styles.bold} numberOfLines={1}>
            {project.title}
          </Text>
          <Text variant="bodyMedium" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant }}>
            {project.description}
          </Text>
        </View>
      </TouchableRipple>

      {who && inviter ? (
        <TouchableRipple onPress={() => onOpenInviter(inviter)} accessibilityRole="button" testID={`${testID}.inviter`}>
          <View style={styles.inviter}>
            <MaterialCommunityIcons name="email-outline" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelLarge" style={styles.inviterText}>
              Te invitó {who}
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {when}
              </Text>
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
          </View>
        </TouchableRipple>
      ) : null}

      <View style={styles.actions}>
        <Button mode="outlined" textColor={theme.colors.onSurface} onPress={onDecline} disabled={disabled} testID={`${testID}.decline`}>
          Rechazar
        </Button>
        <Button mode="contained" onPress={onAccept} loading={busy} disabled={disabled} testID={`${testID}.accept`}>
          Aceptar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md * 2, marginHorizontal: spacing.gutter, marginBottom: spacing.md, padding: spacing.md, gap: spacing.sm },
  texts: { gap: spacing.xs },
  bold: { fontWeight: "700" },
  inviter: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs },
  inviterText: { flex: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
