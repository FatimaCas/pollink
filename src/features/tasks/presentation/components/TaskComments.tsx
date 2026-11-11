import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Avatar, Button, Divider, Text, TextInput, useTheme } from "react-native-paper";

import { initialsOf } from "@/src/core/components/PersonRow";
import { systemClock } from "@/src/core/utils/clock";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { Formatters } from "@/src/core/utils/formatters";
import { spacing } from "@/src/theme/tokens";
import { ProjectTask } from "../../domain/entities/ProjectTask";
import { useTaskCommentsViewModel } from "../viewmodels/useTaskCommentsViewModel";

// Comentarios de una tarea (como en Imker): caja para escribir, «Comentar» y la
// lista del más nuevo al más viejo. No hay diseño en Figma: sale de Imker con
// los tokens de Pollink.
export function TaskComments({ task, onInputFocus, onInputBlur }: { task: ProjectTask; onInputFocus?: () => void; onInputBlur?: () => void }) {
  const theme = useTheme();
  const show = useSnackbar();
  const vm = useTaskCommentsViewModel(task);
  const [text, setText] = useState("");

  const submit = async () => {
    const error = await vm.send(text);
    if (error === null) setText("");
    else show(error, { error: true });
  };

  const total = vm.comments.length;
  return (
    <View style={styles.root} testID="taskComments">
      <Text variant="titleSmall" style={styles.bold}>
        Comentarios
      </Text>
      <TextInput
        mode="outlined"
        placeholder="Añade un comentario..."
        value={text}
        onChangeText={setText}
        onFocus={onInputFocus}
        onBlur={onInputBlur}
        multiline
        numberOfLines={2}
        testID="taskComments.input"
      />
      <Button
        mode="contained"
        style={styles.send}
        onPress={submit}
        loading={vm.sending}
        disabled={vm.sending || text.trim() === ""}
        testID="taskComments.send"
      >
        Comentar
      </Button>

      {total === 0 ? (
        !vm.loaded ? (
          <ActivityIndicator style={styles.center} testID="taskComments.loading" />
        ) : (
          <View style={styles.center}>
            <Text variant="bodyMedium" style={styles.centerText} testID="taskComments.empty">
              {vm.error ?? "Aún no hay comentarios. ¡Sé el primero!"}
            </Text>
            {vm.error ? (
              <Button textColor={theme.colors.onSurface} onPress={vm.reload} testID="taskComments.retry">
                Reintentar
              </Button>
            ) : null}
          </View>
        )
      ) : (
        <>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }} testID="taskComments.count">
            {total} comentario{total === 1 ? "" : "s"}
          </Text>
          <Divider />
          {vm.comments.map((comment) => {
            const author = vm.authorOf(comment);
            return (
              <View key={comment.id} style={styles.comment} testID="taskComments.item">
                <View style={styles.header}>
                  <Avatar.Text
                    size={24}
                    label={initialsOf(author)}
                    color={theme.colors.onPrimary}
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <Text variant="labelLarge" style={styles.bold} numberOfLines={1}>
                    {author}
                  </Text>
                  {comment.createdAt ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      · {Formatters.relative(comment.createdAt, systemClock())}
                    </Text>
                  ) : null}
                </View>
                <Text
                  variant="bodyMedium"
                  style={[styles.body, { borderLeftColor: theme.colors.outline }]}
                >
                  {comment.body}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  bold: { fontWeight: "700" },
  send: { alignSelf: "flex-end" },
  center: { marginTop: spacing.lg, alignItems: "center" },
  centerText: { textAlign: "center" },
  comment: { marginTop: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  body: { marginLeft: 10, marginTop: 4, paddingLeft: spacing.md, borderLeftWidth: 2 },
});
