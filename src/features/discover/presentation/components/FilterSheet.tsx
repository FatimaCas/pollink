import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, Switch, Text } from "react-native-paper";

import { BottomSheet } from "@/src/core/components/BottomSheet";
import { SelectField } from "@/src/core/components/SelectField";
import { spacing } from "@/src/theme/tokens";
import { FilterLabels, ProjectFilter } from "../../domain/entities/ProjectFilter";
import { useFilterSheetViewModel } from "../viewmodels/useFilterSheetViewModel";

// La hoja de filtros (spec 04 §4.2): carrera, habilidad (depende de la carrera)
// y «solo abiertos». El botón primario dice cuántos proyectos dará antes de
// aplicar; cerrar la hoja descarta el borrador y «Limpiar» no la cierra.
export function FilterSheet({
  visible,
  applied,
  onApply,
  onDismiss,
}: {
  visible: boolean;
  applied: ProjectFilter;
  onApply: (filter: ProjectFilter, labels: FilterLabels) => void;
  onDismiss: () => void;
}) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      {visible ? <SheetBody applied={applied} onApply={onApply} /> : null}
    </BottomSheet>
  );
}

function SheetBody({ applied, onApply }: { applied: ProjectFilter; onApply: (filter: ProjectFilter, labels: FilterLabels) => void }) {
  const vm = useFilterSheetViewModel(applied);
  const all = { value: null, label: "Todas" };
  const careers = [all, ...vm.options.careers.map((o) => ({ value: o.key as string | null, label: `${o.label} (${o.count})` }))];
  const skills = [all, ...vm.options.skills.map((o) => ({ value: o.key as string | null, label: `${o.label} (${o.count})` }))];
  const none = vm.resultCount === 0;

  return (
    <>
      <View style={styles.header}>
        <Text variant="titleLarge">Filtros</Text>
        <Button compact onPress={vm.clear} testID={FilterSheet.clearKey}>
          Limpiar
        </Button>
      </View>
      <SelectField testID={FilterSheet.careerKey} label="Carrera" value={vm.draft.career} options={careers} onSelect={vm.setCareer} />
      <SelectField testID={FilterSheet.skillKey} label="Habilidad" value={vm.draft.skill} options={skills} onSelect={vm.setSkill} />
      <View style={styles.switchRow}>
        <Text variant="bodyLarge">Solo abiertos</Text>
        <Switch value={vm.draft.onlyOpen} onValueChange={vm.setOnlyOpen} testID={FilterSheet.openOnlyKey} accessibilityLabel="Solo abiertos" />
      </View>
      {vm.error ? <HelperText type="error">{vm.error}</HelperText> : null}
      <Button
        mode="contained"
        onPress={() =>
          onApply(vm.draft, {
            career: vm.options.careers.find((o) => o.key === vm.draft.career)?.label,
            skill: vm.options.skills.find((o) => o.key === vm.draft.skill)?.label,
          })
        }
        disabled={none}
        contentStyle={styles.cta}
        testID={FilterSheet.applyKey}
      >
        {vm.resultCount == null ? "Ver proyectos" : none ? "Sin proyectos" : vm.resultCount === 1 ? "Ver 1 proyecto" : `Ver ${vm.resultCount} proyectos`}
      </Button>
    </>
  );
}

FilterSheet.careerKey = "discover.filters.career";
FilterSheet.skillKey = "discover.filters.skill";
FilterSheet.clearKey = "discover.filters.clear";
FilterSheet.openOnlyKey = "discover.filters.onlyOpen";
FilterSheet.applyKey = "discover.filters.apply";

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: spacing.md },
  cta: { height: 48 },
});
