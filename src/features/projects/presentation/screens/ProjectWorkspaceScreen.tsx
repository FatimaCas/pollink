import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { SegmentedTabs } from "@/src/core/components/SegmentedTabs";
import { ProjectMembersTab } from "@/src/features/members/presentation/screens/ProjectMembersScreen";
import { AssignmentsTab } from "@/src/features/tasks/presentation/screens/AssignmentsScreen";
import { TaskBoardTab } from "@/src/features/tasks/presentation/screens/TaskBoardScreen";
import type { ProjectWorkspaceTab, RootStackParamList } from "@/src/navigation/types";
import { spacing } from "@/src/theme/tokens";

const TABS: { value: ProjectWorkspaceTab; label: string }[] = [
  { value: "members", label: "Miembros" },
  { value: "tasks", label: "Tareas" },
  { value: "assignments", label: "Asignaciones" },
];

// La barra Miembros · Tareas · Asignaciones del Figma (158:199) sobre un solo
// proyecto. La pestaña es estado local: cambiar de pestaña no apila rutas, así
// que «atrás» vuelve a la ficha del proyecto. Las filas de `ProjectInfoScreen`
// abren esta pantalla ya en la pestaña que corresponde.
export default function ProjectWorkspaceScreen() {
  const theme = useTheme();
  const { params } = useRoute<RouteProp<RootStackParamList, "ProjectWorkspace">>();
  const [tab, setTab] = useState<ProjectWorkspaceTab>(params.tab);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SegmentedTabs
        style={styles.tabs}
        options={TABS}
        selected={tab}
        onSelect={setTab}
        testID={ProjectWorkspaceScreen.tabsKey}
      />
      {tab === "members" ? (
        <ProjectMembersTab projectId={params.projectId} />
      ) : tab === "tasks" ? (
        <TaskBoardTab projectId={params.projectId} />
      ) : (
        <AssignmentsTab projectId={params.projectId} />
      )}
    </View>
  );
}

ProjectWorkspaceScreen.tabsKey = "projectWorkspace.tabs";

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { marginHorizontal: spacing.gutter, marginTop: spacing.md },
});
