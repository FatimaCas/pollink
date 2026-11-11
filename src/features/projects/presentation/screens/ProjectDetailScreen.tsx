import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/core/components/EmptyState";
import { ApplyToProject } from "@/src/features/requests/presentation/components/ApplyToProject";
import type { RootStackParamList } from "@/src/navigation/types";
import { radius, spacing } from "@/src/theme/tokens";
import { isOpen } from "../../domain/entities/Project";
import { ProjectRelation } from "../../domain/entities/ProjectRelation";
import { ClosedProjectBanner } from "../components/ClosedProjectBanner";
import { LabelChips } from "../components/LabelChips";
import { useProjectDetailViewModel } from "../viewmodels/useProjectDetailViewModel";

// Lo que se le dice a la persona según su relación con el proyecto. `null`:
// nada que decir (puede postularse).
const RELATION_NOTES: Record<ProjectRelation, string | null> = {
  owner: "Eres el creador de este proyecto.",
  active: "Ya colaboras en este proyecto.",
  invited: "Te invitaron a este proyecto. Respóndela en tus invitaciones.",
  pending: "Te postulaste: el creador aún no responde tu solicitud.",
  saved: null,
  none: null,
};

// El detalle público de un proyecto (C4), al que se llega desde Descubrir y
// Guardados: descripción, integrantes, carreras y conocimientos, guardar, y la
// acción que corresponde a la relación de la persona con el proyecto.
export default function ProjectDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ProjectDetail">>();
  const vm = useProjectDetailViewModel(params.projectId);
  const { reload, project, saved } = vm;
  // El marcador vive en el header: llama siempre a la versión más nueva sin
  // volver a montar las opciones en cada render.
  const toggleSaved = useRef(vm.toggleSaved);
  useEffect(() => {
    toggleSaved.current = vm.toggleSaved;
  });
  const hasProject = project !== null;

  // Al volver (de «Solicitud enviada», de responder una invitación) la relación cambia.
  useEffect(() => navigation.addListener("focus", reload), [navigation, reload]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: hasProject
        ? () => (
            <IconButton
              icon={saved ? "bookmark" : "bookmark-outline"}
              onPress={() => toggleSaved.current()}
              accessibilityLabel={saved ? "Quitar de guardados" : "Guardar proyecto"}
              testID={ProjectDetailScreen.saveKey}
            />
          )
        : undefined,
    });
  }, [navigation, hasProject, saved]);

  if (vm.loading) return <ActivityIndicator style={styles.loading} testID={ProjectDetailScreen.loadingKey} />;
  if (vm.error || !project) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos abrir el proyecto"
        message={vm.error ?? undefined}
        action={
          <Button mode="contained" onPress={vm.reload} testID={ProjectDetailScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const muted = { color: theme.colors.onSurfaceVariant };
  const note = RELATION_NOTES[vm.relation];
  const canApply = (vm.relation === "none" || vm.relation === "saved") && isOpen(project);
  const members = `${project.memberCount} ${project.memberCount === 1 ? "integrante" : "integrantes"}`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]}
    >
      <View style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text variant="headlineSmall" style={styles.bold} testID={ProjectDetailScreen.titleKey}>
          {project.title}
        </Text>
        <View style={styles.membersRow}>
          <MaterialCommunityIcons name="account-group-outline" size={18} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelLarge" style={muted} testID={ProjectDetailScreen.membersKey}>
            {members}
          </Text>
        </View>
      </View>

      {!isOpen(project) ? <ClosedProjectBanner /> : null}

      <Section title="Descripción">
        <Text variant="bodyLarge">{project.description}</Text>
      </Section>
      <Section title="Carreras relacionadas">
        <LabelChips labels={project.jobs} emptyText="El proyecto no indicó carreras." />
      </Section>
      <Section title="Conocimientos requeridos">
        <LabelChips labels={project.skills} emptyText="El proyecto no indicó conocimientos." />
      </Section>

      {note ? (
        <View style={[styles.note, { backgroundColor: theme.colors.surfaceVariant }]} testID={ProjectDetailScreen.relationKey}>
          <Text variant="bodyMedium">{note}</Text>
        </View>
      ) : null}

      {vm.relation === "owner" || vm.relation === "active" ? (
        <Button
          mode="contained"
          contentStyle={styles.cta}
          onPress={() => navigation.navigate("ProjectInfo", { projectId: project.id })}
          testID={ProjectDetailScreen.openKey}
        >
          Abrir proyecto
        </Button>
      ) : null}
      {vm.relation === "invited" ? (
        <Button mode="contained" contentStyle={styles.cta} onPress={() => navigation.navigate("Invitations")} testID={ProjectDetailScreen.invitationsKey}>
          Ver mis invitaciones
        </Button>
      ) : null}
      {canApply ? (
        <ApplyToProject projectId={project.id} projectTitle={project.title}>
          {({ start, busy }) => (
            <Button
              mode="contained"
              buttonColor={theme.colors.tertiary}
              textColor={theme.colors.onTertiary}
              contentStyle={styles.cta}
              onPress={start}
              disabled={busy}
              testID={ProjectDetailScreen.applyKey}
            >
              Solicitar unirme
            </Button>
          )}
        </ApplyToProject>
      ) : null}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="titleMedium" style={styles.bold}>
        {title}
      </Text>
      {children}
    </View>
  );
}

ProjectDetailScreen.loadingKey = "projectDetail.loading";
ProjectDetailScreen.retryKey = "projectDetail.retry";
ProjectDetailScreen.titleKey = "projectDetail.title";
ProjectDetailScreen.membersKey = "projectDetail.members";
ProjectDetailScreen.saveKey = "projectDetail.save";
ProjectDetailScreen.relationKey = "projectDetail.relation";
ProjectDetailScreen.openKey = "projectDetail.open";
ProjectDetailScreen.invitationsKey = "projectDetail.invitations";
ProjectDetailScreen.applyKey = "projectDetail.apply";

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  content: { padding: spacing.gutter, gap: spacing.lg },
  hero: { borderRadius: radius.md * 2, padding: spacing.lg, gap: spacing.sm },
  bold: { fontWeight: "700" },
  membersRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  section: { gap: spacing.sm },
  note: { borderRadius: radius.md, padding: spacing.md },
  cta: { height: 48 },
});
