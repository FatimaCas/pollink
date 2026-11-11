import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandHeader } from "@/src/core/components/BrandHeader";
import { SegmentedTabs } from "@/src/core/components/SegmentedTabs";
import { SavedProjectsView } from "@/src/features/discover/presentation/components/SavedProjectsView";
import { spacing } from "@/src/theme/tokens";

type Section = "mine" | "others" | "saved";

const SECTIONS: { value: Section; label: string }[] = [
  { value: "mine", label: "Mis proyectos" },
  { value: "others", label: "Otros proyectos" },
  { value: "saved", label: "Guardados" },
];

// La pestaña Proyectos: «Mis proyectos · Otros proyectos · Guardados».
// «Guardados» es de A (discover); «Mis proyectos» y «Otros proyectos» son la
// tarea C3 y quedan pendientes: C reemplaza esos dos cuerpos.
export default function ProjectsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>("mine");

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <BrandHeader />
      <SegmentedTabs options={SECTIONS} selected={section} onSelect={setSection} style={styles.tabs} testID={ProjectsScreen.tabsKey} />
      {section === "saved" ? (
        <SavedProjectsView />
      ) : (
        <View style={styles.pending} testID={`projects.pending.${section}`}>
          <Text variant="bodyLarge" style={styles.center}>
            {section === "mine" ? "Mis proyectos" : "Otros proyectos"}: pendiente (tarea C3 de docs/plan-de-trabajo.md).
          </Text>
        </View>
      )}
    </View>
  );
}

ProjectsScreen.tabsKey = "projects.tabs";

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { marginHorizontal: spacing.gutter, marginBottom: spacing.sm },
  pending: { flex: 1, justifyContent: "center", padding: spacing.xl },
  center: { textAlign: "center" },
});
