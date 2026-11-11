import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/core/components/EmptyState";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { spacing } from "@/src/theme/tokens";
import { FeedModePicker } from "../components/FeedModePicker";
import { FilterBar } from "../components/FilterBar";
import { FilterSheet } from "../components/FilterSheet";
import { ProjectCard } from "../components/ProjectCard";
import { useDiscoverViewModel } from "../viewmodels/useDiscoverViewModel";

// La pestaña Descubrir: saludo, selector de modo, barra de filtros y el feed
// paginado de proyectos. Cada estado tiene su pantalla: cargando, error con
// reintento, feed vacío y filtros sin coincidencias.
export default function DiscoverScreen() {
  const session = useSession();
  // Con `key`, cambiar de sesión remonta el feed: filtros y modo vuelven al principio.
  return <DiscoverFeed key={session.user?.userId ?? "sin-sesion"} />;
}

function DiscoverFeed() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const session = useSession();
  const vm = useDiscoverViewModel();
  const [sheetOpen, setSheetOpen] = useState(false);

  const firstName = session.hasAccount || session.guestName ? session.displayName.split(" ")[0] : "";
  const hasProjects = vm.projects.length > 0;

  const header = (
    <View style={styles.header}>
      <Text variant="headlineSmall" testID="discover.greeting">
        {firstName ? `Hola, ${firstName}` : "Hola"}
      </Text>
      <Text variant="bodyLarge">¿Qué quieres hacer hoy?</Text>
      <View style={styles.mode}>
        <FeedModePicker mode={vm.mode} onSelect={vm.setMode} />
      </View>
      {/* Sin datos todavía (o con el feed vacío y sin filtros) no hay nada que filtrar. */}
      {!vm.loading && !vm.error && (hasProjects || vm.filtered) ? (
        <FilterBar
          filter={vm.filter}
          total={vm.total}
          labels={vm.labels}
          onOpen={() => setSheetOpen(true)}
          onChange={vm.changeFilter}
        />
      ) : null}
    </View>
  );

  let body: React.ReactNode = null;
  if (vm.loading) {
    body = <ActivityIndicator style={styles.center} testID={DiscoverScreen.loadingKey} />;
  } else if (vm.error && !hasProjects) {
    body = (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar los proyectos"
        message={vm.error}
        action={
          <Button mode="contained" onPress={vm.retry} testID={DiscoverScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  } else if (!hasProjects && vm.filtered) {
    body = (
      <EmptyState
        icon="magnify-close"
        title="Ningún proyecto coincide"
        message="Prueba con otra carrera o habilidad, o quita algún filtro."
        action={
          <Button mode="contained" onPress={vm.clearFilter} testID={DiscoverScreen.clearKey}>
            Limpiar filtros
          </Button>
        }
      />
    );
  } else if (!hasProjects) {
    body = <EmptyState icon="beehive-outline" title="No hay proyectos disponibles" message="Cuando alguien publique uno, lo verás aquí." />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <FlatList
        data={vm.loading || vm.error ? [] : vm.projects}
        keyExtractor={(project) => project.id}
        ListHeaderComponent={header}
        ListEmptyComponent={body}
        ListFooterComponent={vm.loadingMore ? <ActivityIndicator style={styles.footer} testID="discover.loadingMore" /> : null}
        refreshing={vm.refreshing}
        onRefresh={vm.reload}
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            saved={vm.savedIds.has(item.id)}
            onPress={() => navigation.navigate("ProjectDetail", { projectId: item.id })}
            onToggleSaved={() => vm.toggleSaved(item)}
          />
        )}
      />
      <FilterSheet
        visible={sheetOpen}
        applied={vm.filter}
        onApply={(next, labels) => {
          setSheetOpen(false);
          vm.setFilter(next, labels);
        }}
        onDismiss={() => setSheetOpen(false)}
      />
    </View>
  );
}

DiscoverScreen.loadingKey = "discover.loading";
DiscoverScreen.retryKey = "discover.retry";
DiscoverScreen.clearKey = "discover.clear";

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: 2 },
  mode: { marginTop: spacing.md },
  center: { marginTop: spacing.xl },
  footer: { marginVertical: spacing.lg },
});
