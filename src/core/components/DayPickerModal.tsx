import React from "react";
import { ThemeProvider, useTheme } from "react-native-paper";
import { DatePickerModal, es, registerTranslation } from "react-native-paper-dates";

registerTranslation("es", es);

// El selector de día (calendario) de la app, sobre `react-native-paper-dates`:
// se pinta con el tema de Paper, así que sigue los colores y la forma del
// rebranding sin código extra. Elige un solo día, en español, y no deja elegir
// uno anterior a `minDay` (la fecha límite de una tarea nunca es del pasado).
// El amarillo de marca no se lee como texto sobre fondo claro: dentro del
// calendario la selección y «Guardar» usan el par `secondary` del tema (negro en
// claro, blanco en oscuro), como la pestaña activa.
export function DayPickerModal({
  visible,
  initial,
  minDay,
  label = "Fecha límite",
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  // El día con el que abre; si es anterior a `minDay` se ignora.
  initial?: Date | null;
  minDay: Date;
  label?: string;
  onDismiss: () => void;
  onConfirm: (day: Date) => void;
}) {
  const theme = useTheme();
  const pickerTheme = {
    ...theme,
    colors: { ...theme.colors, primary: theme.colors.secondary, onPrimary: theme.colors.onSecondary },
  };
  const start = new Date(minDay.getFullYear(), minDay.getMonth(), minDay.getDate());
  const date = initial && initial.getTime() >= start.getTime() ? initial : start;
  return (
    <ThemeProvider theme={pickerTheme}>
      <DatePickerModal
        locale="es"
        mode="single"
        visible={visible}
        date={date}
        validRange={{ startDate: start }}
        label={label}
        saveLabel="Guardar"
        onDismiss={onDismiss}
        onConfirm={({ date: picked }) => {
          if (picked) onConfirm(picked);
        }}
      />
    </ThemeProvider>
  );
}
