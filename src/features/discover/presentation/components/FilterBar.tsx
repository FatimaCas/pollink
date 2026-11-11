import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, Text } from "react-native-paper";

import { spacing } from "@/src/theme/tokens";
import { activeCount, FilterLabels, ProjectFilter } from "../../domain/entities/ProjectFilter";

// La barra fina bajo el saludo (spec 04 §4.1): el botón «Filtros (n)», los
// filtros puestos como chips que se quitan con ✕ y, con filtros, el total.
// Los chips muestran la etiqueta; `labels` la saca de las opciones conocidas.
export function FilterBar({
  filter,
  total,
  labels,
  onOpen,
  onChange,
}: {
  filter: ProjectFilter;
  total: number;
  labels: FilterLabels;
  onOpen: () => void;
  onChange: (next: ProjectFilter) => void;
}) {
  const count = activeCount(filter);
  return (
    <View style={styles.bar}>
      <Button mode="outlined" compact icon="tune-variant" onPress={onOpen} testID={FilterBar.openKey}>
        {count > 0 ? `Filtros (${count})` : "Filtros"}
      </Button>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {filter.career ? (
          <Chip compact onClose={() => onChange({ ...filter, career: null, skill: null })} closeIconAccessibilityLabel="Quitar filtro de carrera" testID="discover.chip.career">
            {labels.career ?? filter.career}
          </Chip>
        ) : null}
        {filter.skill ? (
          <Chip compact onClose={() => onChange({ ...filter, skill: null })} closeIconAccessibilityLabel="Quitar filtro de habilidad" testID="discover.chip.skill">
            {labels.skill ?? filter.skill}
          </Chip>
        ) : null}
        {filter.onlyOpen ? (
          <Chip compact onClose={() => onChange({ ...filter, onlyOpen: false })} closeIconAccessibilityLabel="Quitar filtro solo abiertos" testID="discover.chip.open">
            Solo abiertos
          </Chip>
        ) : null}
      </ScrollView>
      {count > 0 ? (
        <Text variant="labelMedium" testID="discover.total">
          {total === 1 ? "1 proyecto" : `${total} proyectos`}
        </Text>
      ) : null}
    </View>
  );
}

FilterBar.openKey = "discover.filters.open";

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm },
  chips: { gap: spacing.xs, alignItems: "center", flexGrow: 1 },
});
