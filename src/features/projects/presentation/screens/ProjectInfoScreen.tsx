import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Badge, Button, HelperText, List, ProgressBar, Text, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/core/components/EmptyState";
import { SegmentedTabs } from "@/src/core/components/SegmentedTabs";
import type { RootStackParamList } from "@/src/navigation/types";
import { radius, spacing } from "@/src/theme/tokens";
import { isOpen, PROJECT_LIMITS } from "../../domain/entities/Project";
import { ChipListField } from "../components/ChipListField";
import { ClosedProjectBanner } from "../components/ClosedProjectBanner";
import { CloseProjectDialog } from "../components/CloseProjectDialog";
import { LabelChips } from "../components/LabelChips";
import { ProjectActionsMenu } from "../components/ProjectActionsMenu";
import { ProjectStatusLabel } from "../components/ProjectStatusLabel";
import { useProjectInfoViewModel } from "../viewmodels/useProjectInfoViewModel";

type Tab = "progress" | "info";

const TABS: { value: Tab; label: string }[] = [
  { value: "progress", label: "Progreso" },
  { value: "info", label: "Info. básica" },
];

// La ficha de un proyecto (C4), para su creador y sus miembros. «Progreso»:
// avance de las tareas y la entrada a Miembros y Tareas (D) y, para el
// creador, a Solicitudes (A). «Info. básica»: la edita el creador. El ⋮ del
// creador cierra el proyecto (C5).
export default function ProjectInfoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ProjectInfo">>();
  const vm = useProjectInfoViewModel(params.projectId);
  const [tab, setTab] = useState<Tab>("progress");
  const [confirmingClose, setConfirmingClose] = useState(false);
  const { reload, project, canClose } = vm;
  const title = project?.title ?? "";

  // Al volver de Tareas o Solicitudes cambian el avance y los integrantes.
  useEffect(() => navigation.addListener("focus", reload), [navigation, reload]);
  // El ⋮ del creador (cerrar) va en el header mientras el proyecto siga abierto.
  useLayoutEffect(
    () =>
      navigation.setOptions({
        title,
        headerRight: canClose ? () => <ProjectActionsMenu onCloseProject={() => setConfirmingClose(true)} /> : undefined,
      }),
    [navigation, title, canClose],
  );

  const confirmClose = async () => {
    if (await vm.close()) setConfirmingClose(false);
  };

  if (vm.loading) return <ActivityIndicator style={styles.loading} testID={ProjectInfoScreen.loadingKey} />;
  if (vm.error || !project) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos abrir el proyecto"
        message={vm.error ?? undefined}
        action={
          <Button mode="contained" onPress={vm.reload} testID={ProjectInfoScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const muted = { color: theme.colors.onSurfaceVariant };
  const done = Math.round((project.progress * project.totalTasks) / 100);
  const projectId = project.id;

  const progressTab = (
    <>
      <View style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.bold}>
            Progreso general
          </Text>
          <ProjectStatusLabel status={project.status} testID={ProjectInfoScreen.statusKey} />
        </View>
        <View style={styles.progressRow}>
          <ProgressBar
            progress={project.progress / 100}
            color={theme.colors.primary}
            style={[styles.progress, { backgroundColor: theme.colors.surface }]}
          />
          <Text variant="titleLarge" style={styles.bold} testID={ProjectInfoScreen.percentKey}>
            {Math.round(project.progress)}%
          </Text>
        </View>
        <Text variant="bodyMedium" style={muted} testID={ProjectInfoScreen.tasksSummaryKey}>
          {project.totalTasks === 0
            ? "Aún no hay tareas en este proyecto."
            : `${done} de ${project.totalTasks} ${project.totalTasks === 1 ? "tarea terminada" : "tareas terminadas"}`}
        </Text>
      </View>

      <View style={[styles.links, { borderColor: theme.colors.outlineVariant }]}>
        <List.Item
          title="Miembros"
          description={`${project.memberCount} ${project.memberCount === 1 ? "integrante" : "integrantes"}`}
          left={(props) => <List.Icon {...props} icon="account-group-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("ProjectWorkspace", { projectId, tab: "members" })}
          testID={ProjectInfoScreen.membersKey}
        />
        <List.Item
          title="Tareas"
          description="Tablero de pendientes, en progreso y terminadas"
          left={(props) => <List.Icon {...props} icon="checkbox-marked-circle-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("ProjectWorkspace", { projectId, tab: "tasks" })}
          testID={ProjectInfoScreen.tasksKey}
        />
        <List.Item
          title="Asignaciones"
          description="Quién tiene qué tarea"
          left={(props) => <List.Icon {...props} icon="clipboard-account-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("ProjectWorkspace", { projectId, tab: "assignments" })}
          testID={ProjectInfoScreen.assignmentsKey}
        />
        {vm.isOwner ? (
          <List.Item
            title="Solicitudes"
            description="Personas que quieren colaborar"
            left={(props) => <List.Icon {...props} icon="account-plus-outline" />}
            right={(props) => (
              <View style={styles.badgeRow}>
                {vm.pendingRequests > 0 ? (
                  <Badge style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary }} testID={ProjectInfoScreen.requestsBadgeKey}>
                    {vm.pendingRequests}
                  </Badge>
                ) : null}
                <List.Icon {...props} icon="chevron-right" />
              </View>
            )}
            onPress={() => navigation.navigate("CollaborationRequests", { projectId })}
            testID={ProjectInfoScreen.requestsKey}
          />
        ) : null}
      </View>
    </>
  );

  const readOnlyInfo = (
    <>
      <Text variant="bodySmall" style={muted} testID={ProjectInfoScreen.readOnlyKey}>
        {vm.isOwner
          ? "El proyecto está cerrado: su información ya no se edita."
          : "Solo el creador del proyecto puede editar esta información."}
      </Text>
      <Field title="Descripción">
        <Text variant="bodyLarge">{project.description}</Text>
      </Field>
      <Field title="Carreras relacionadas">
        <LabelChips labels={project.jobs} emptyText="El proyecto no indicó carreras." />
      </Field>
      <Field title="Conocimientos requeridos">
        <LabelChips labels={project.skills} emptyText="El proyecto no indicó conocimientos." />
      </Field>
    </>
  );

  const editableInfo = (
    <>
      <TextInput
        mode="outlined"
        label="Nombre del proyecto"
        value={vm.draft.title}
        onChangeText={vm.setTitle}
        maxLength={PROJECT_LIMITS.titleMax}
        disabled={vm.saving}
        testID={ProjectInfoScreen.titleFieldKey}
      />
      <TextInput
        mode="outlined"
        label="Descripción"
        value={vm.draft.description}
        onChangeText={vm.setDescription}
        maxLength={PROJECT_LIMITS.descriptionMax}
        multiline
        numberOfLines={4}
        disabled={vm.saving}
        style={styles.description}
        testID={ProjectInfoScreen.descriptionFieldKey}
      />
      <ChipListField
        label="Carreras relacionadas"
        placeholder="Escribe una carrera"
        emptyText="Todavía no hay carreras."
        values={vm.draft.jobs}
        onAdd={(value) => vm.addLabel("jobs", value)}
        onRemove={(index) => vm.removeLabel("jobs", index)}
        disabled={vm.saving}
        testID={ProjectInfoScreen.jobsKey}
      />
      <ChipListField
        label="Conocimientos requeridos"
        placeholder="Escribe un conocimiento"
        emptyText="Todavía no hay conocimientos."
        values={vm.draft.skills}
        onAdd={(value) => vm.addLabel("skills", value)}
        onRemove={(index) => vm.removeLabel("skills", index)}
        disabled={vm.saving}
        testID={ProjectInfoScreen.skillsKey}
      />
      {vm.saveError ? (
        <HelperText type="error" padding="none" testID={ProjectInfoScreen.saveErrorKey}>
          {vm.saveError}
        </HelperText>
      ) : null}
      <View style={styles.actions}>
        <Button onPress={vm.discard} disabled={!vm.dirty || vm.saving} textColor={theme.colors.onSurface} testID={ProjectInfoScreen.discardKey}>
          Descartar
        </Button>
        <Button
          mode="contained"
          onPress={vm.save}
          loading={vm.saving}
          disabled={!vm.dirty || vm.saving}
          testID={ProjectInfoScreen.saveKey}
        >
          Guardar cambios
        </Button>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {!isOpen(project) ? <ClosedProjectBanner /> : null}
        <SegmentedTabs options={TABS} selected={tab} onSelect={setTab} testID={ProjectInfoScreen.tabsKey} />
        {tab === "progress" ? progressTab : vm.canEdit ? editableInfo : readOnlyInfo}
      </ScrollView>
      <CloseProjectDialog
        visible={confirmingClose}
        projectTitle={project.title}
        closing={vm.closing}
        onConfirm={confirmClose}
        onDismiss={() => setConfirmingClose(false)}
      />
    </KeyboardAvoidingView>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="titleSmall" style={styles.bold}>
        {title}
      </Text>
      {children}
    </View>
  );
}

ProjectInfoScreen.loadingKey = "projectInfo.loading";
ProjectInfoScreen.retryKey = "projectInfo.retry";
ProjectInfoScreen.tabsKey = "projectInfo.tabs";
ProjectInfoScreen.percentKey = "projectInfo.percent";
ProjectInfoScreen.statusKey = "projectInfo.status";
ProjectInfoScreen.tasksSummaryKey = "projectInfo.tasksSummary";
ProjectInfoScreen.membersKey = "projectInfo.members";
ProjectInfoScreen.tasksKey = "projectInfo.tasks";
ProjectInfoScreen.assignmentsKey = "projectInfo.assignments";
ProjectInfoScreen.requestsKey = "projectInfo.requests";
ProjectInfoScreen.requestsBadgeKey = "projectInfo.requestsBadge";
ProjectInfoScreen.readOnlyKey = "projectInfo.readOnly";
ProjectInfoScreen.titleFieldKey = "projectInfo.titleField";
ProjectInfoScreen.descriptionFieldKey = "projectInfo.descriptionField";
ProjectInfoScreen.jobsKey = "projectInfo.jobs";
ProjectInfoScreen.skillsKey = "projectInfo.skills";
ProjectInfoScreen.saveErrorKey = "projectInfo.saveError";
ProjectInfoScreen.discardKey = "projectInfo.discard";
ProjectInfoScreen.saveKey = "projectInfo.save";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: spacing.xl },
  content: { padding: spacing.gutter, gap: spacing.lg },
  bold: { fontWeight: "700" },
  card: { borderRadius: radius.md * 2, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  progress: { flex: 1, height: 14, borderRadius: radius.sm },
  links: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: "hidden" },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  field: { gap: spacing.sm },
  description: { minHeight: 110 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
