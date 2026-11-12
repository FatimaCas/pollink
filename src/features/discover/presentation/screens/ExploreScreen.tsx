import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/core/components/EmptyState";
import { radius, spacing } from "@/src/theme/tokens";
import { ProjectCard } from "../components/ProjectCard";
import { ExploreChip, useExploreViewModel } from "../viewmodels/useExploreViewModel";

const LOGO = require("../../../../../assets/images/pollink-logo.svg");

// La pestaña Explorar (Figma `5:14`): buscador de proyectos por texto y chips
// de una sola selección (Todos · Destacados · carreras). Sin texto y con
// «Todos», la abeja grande en tenue.
export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const vm = useExploreViewModel();

  const chips: { id: string; label: string; value: ExploreChip }[] = [
    { id: "all", label: "Todos", value: { kind: "all" } },
    { id: "featured", label: "Destacados", value: { kind: "featured" } },
    ...vm.careers.map((c) => ({ id: `career.${c.key}`, label: c.label, value: { kind: "career", key: c.key } as ExploreChip })),
  ];
  const isActive = (value: ExploreChip) =>
    value.kind === vm.chip.kind && (value.kind !== "career" || (vm.chip.kind === "career" && vm.chip.key === value.key));

  let body: React.ReactNode = null;
  if (vm.idle) {
    body = (
      <View style={styles.idle} testID={ExploreScreen.idleKey}>
        <Image source={LOGO} style={styles.bigBee} contentFit="contain" tintColor={theme.colors.primary} />
        <Text style={[styles.brand, { color: theme.colors.primary }]}>POLLINK</Text>
      </View>
    );
  } else if (vm.loading) {
    body = <ActivityIndicator style={styles.center} testID={ExploreScreen.loadingKey} />;
  } else if (vm.error) {
    body = (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos buscar"
        message={vm.error}
        action={
          <Button mode="contained" onPress={vm.retry} testID={ExploreScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  } else if (vm.projects.length === 0) {
    body = <EmptyState icon="magnify-close" title="Ningún proyecto coincide" message="Prueba con otras palabras u otra categoría." />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Image source={LOGO} style={styles.smallBee} contentFit="contain" tintColor={theme.colors.primary} />
        <Text variant="headlineSmall">Explorar</Text>
        <Text variant="bodyLarge">¿Qué quieres hacer hoy?</Text>
        <View style={[styles.search, { borderColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.primary} />
          <TextInput
            value={vm.text}
            onChangeText={vm.setText}
            placeholder="Buscar proyectos"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={[styles.input, { color: theme.colors.onSurface }]}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar proyectos"
            testID={ExploreScreen.searchKey}
          />
          {vm.text ? (
            <Pressable onPress={() => vm.setText("")} accessibilityLabel="Borrar búsqueda" hitSlop={8} testID={ExploreScreen.clearKey}>
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {chips.map(({ id, label, value }) => {
            const active = isActive(value);
            return (
              <Pressable
                key={id}
                onPress={() => vm.setChip(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                testID={`${ExploreScreen.chipKey}.${id}`}
                style={[
                  styles.chip,
                  { borderColor: theme.colors.primary },
                  active && { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text variant="labelLarge" style={{ color: active ? theme.colors.onPrimary : theme.colors.onSurface }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        data={vm.idle || vm.loading || vm.error ? [] : vm.projects}
        keyExtractor={(project) => project.id}
        ListEmptyComponent={body}
        ListFooterComponent={vm.loadingMore ? <ActivityIndicator style={styles.footer} testID="explore.loadingMore" /> : null}
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
    </View>
  );
}

ExploreScreen.searchKey = "explore.search";
ExploreScreen.clearKey = "explore.search.clear";
ExploreScreen.chipKey = "explore.chip";
ExploreScreen.idleKey = "explore.idle";
ExploreScreen.loadingKey = "explore.loading";
ExploreScreen.retryKey = "explore.retry";

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, gap: 2 },
  smallBee: { width: 46, height: 37, alignSelf: "center", marginBottom: spacing.md },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.gutter, paddingVertical: spacing.lg },
  chip: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: 6 },
  list: { flexGrow: 1, paddingBottom: spacing.xl },
  center: { marginTop: spacing.xl },
  footer: { marginVertical: spacing.lg },
  idle: { flexGrow: 1, alignItems: "center", justifyContent: "center", opacity: 0.35, paddingBottom: spacing.xl },
  bigBee: { width: 260, height: 210 },
  brand: { marginTop: spacing.lg, fontSize: 56, fontWeight: "800", letterSpacing: 2 },
});
