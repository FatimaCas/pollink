import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Badge, Button, List, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandHeader } from "@/src/core/components/BrandHeader";
import { EmptyState } from "@/src/core/components/EmptyState";
import { SegmentedTabs } from "@/src/core/components/SegmentedTabs";
import { SavedProjectsView } from "@/src/features/discover/presentation/components/SavedProjectsView";
import { spacing } from "@/src/theme/tokens";
import { Project } from "../../domain/entities/Project";
import { MyProjectCard } from "../components/MyProjectCard";
import { useMyProjectsViewModel } from "../viewmodels/useMyProjectsViewModel";

type Section = "mine" | "others" | "saved";

const SECTIONS: { value: Section; label: string }[] = [
  { value: "mine", label: "Mis proyectos" },
  { value: "others", label: "Otros proyectos" },
  { value: "saved", label: "Guardados" },
];

// La pestaña Proyectos: «Mis proyectos» (los que creaste) y «Otros proyectos»
// (en los que colaboras hoy) son de C; «Guardados» es de A (discover).
export default function ProjectsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [section, setSection] = useState<Section>("mine");
  const vm = useMyProjectsViewModel();
  const { reload } = vm;

  // Al volver (de crear un proyecto, de una invitación aceptada) se vuelve a leer.
  useEffect(() => navigation.addListener("focus", reload), [navigation, reload]);

  const open = (project: Project) => navigation.navigate("ProjectInfo", { projectId: project.id });
  const create = () => navigation.navigate("CreateProject");

  const body = () => {
    if (section === "saved") return <SavedProjectsView />;
    if (vm.needsAccount) {
      return (
        <EmptyState
          icon="account-lock-outline"
          title="Necesitas una cuenta"
          message="Con una cuenta puedes crear proyectos y ver aquellos en los que colaboras. Tus guardados sí están disponibles."
          action={
            <Button mode="contained" onPress={vm.signIn} testID={ProjectsScreen.signInKey}>
              Entrar o crear cuenta
            </Button>
          }
        />
      );
    }
    if (vm.loading) return <ActivityIndicator style={styles.loading} testID={ProjectsScreen.loadingKey} />;
    const projects = section === "mine" ? vm.owned : vm.joined;
    if (vm.error && projects.length === 0) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="No pudimos cargar tus proyectos"
          message={vm.error}
          action={
            <Button mode="contained" onPress={vm.reload} testID={ProjectsScreen.retryKey}>
              Reintentar
            </Button>
          }
        />
      );
    }
    return (
      <FlatList
        data={projects}
        keyExtractor={(project) => project.id}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={vm.reload}
        ListHeaderComponent={
          section === "mine" ? (
            projects.length > 0 ? (
              <View style={styles.header}>
                <Button mode="contained" icon="plus" compact onPress={create} testID={ProjectsScreen.createKey}>
                  Nuevo proyecto
                </Button>
              </View>
            ) : null
          ) : (
            // Las invitaciones (C6) viven aquí: aceptarlas suma a «Otros proyectos».
            <List.Item
              title="Invitaciones"
              description={
                vm.invitationCount === 0
                  ? "No tienes invitaciones pendientes"
                  : `${vm.invitationCount} ${vm.invitationCount === 1 ? "invitación pendiente" : "invitaciones pendientes"}`
              }
              left={(props) => <List.Icon {...props} icon="email-outline" />}
              right={(props) => (
                <View style={styles.badgeRow}>
                  {vm.invitationCount > 0 ? (
                    <Badge style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary }} testID={ProjectsScreen.invitationsBadgeKey}>
                      {vm.invitationCount}
                    </Badge>
                  ) : null}
                  <List.Icon {...props} icon="chevron-right" />
                </View>
              )}
              onPress={() => navigation.navigate("Invitations")}
              style={styles.invitations}
              testID={ProjectsScreen.invitationsKey}
            />
          )
        }
        ListEmptyComponent={
          section === "mine" ? (
            <EmptyState
              icon="lightbulb-on-outline"
              title="Aún no tienes proyectos propios"
              message="Crea uno y desde ahí invita a quienes quieras que colaboren."
              action={
                <Button mode="contained" icon="plus" onPress={create} testID={ProjectsScreen.createFirstKey}>
                  Crear mi primer proyecto
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="account-group-outline"
              title="Aún no colaboras en ningún proyecto"
              message="Cuando acepten tu solicitud o aceptes una invitación, el proyecto aparecerá aquí."
              action={
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate("Tabs", { screen: "Discover" })}
                  testID={ProjectsScreen.exploreKey}
                >
                  Explorar proyectos
                </Button>
              }
            />
          )
        }
        renderItem={({ item }) => <MyProjectCard project={item} onPress={() => open(item)} />}
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <BrandHeader />
      <SegmentedTabs options={SECTIONS} selected={section} onSelect={setSection} style={styles.tabs} testID={ProjectsScreen.tabsKey} />
      {body()}
    </View>
  );
}

ProjectsScreen.tabsKey = "projects.tabs";
ProjectsScreen.loadingKey = "projects.loading";
ProjectsScreen.retryKey = "projects.retry";
ProjectsScreen.signInKey = "projects.signIn";
ProjectsScreen.createKey = "projects.create";
ProjectsScreen.createFirstKey = "projects.createFirst";
ProjectsScreen.exploreKey = "projects.explore";
ProjectsScreen.invitationsKey = "projects.invitations";
ProjectsScreen.invitationsBadgeKey = "projects.invitationsBadge";

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { marginHorizontal: spacing.gutter, marginBottom: spacing.sm },
  loading: { marginTop: spacing.xl },
  list: { flexGrow: 1, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  header: { alignItems: "flex-end", paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm },
  invitations: { marginHorizontal: spacing.gutter - spacing.md, marginBottom: spacing.sm },
  badgeRow: { flexDirection: "row", alignItems: "center" },
});
