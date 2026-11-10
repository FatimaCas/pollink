import React from "react";
import { DatePickerModal, es, registerTranslation } from "react-native-paper-dates";

registerTranslation("es", es);

// El selector de día (calendario) de la app, sobre `react-native-paper-dates`:
// se pinta con el tema de Paper, así que sigue los colores y la forma del
// rebranding sin código extra. Elige un solo día, en español, y no deja elegir
// uno anterior a `minDay` (la fecha límite de una tarea nunca es del pasado).
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
  const start = new Date(minDay.getFullYear(), minDay.getMonth(), minDay.getDate());
  const date = initial && initial.getTime() >= start.getTime() ? initial : start;
  return (
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
  );
}
