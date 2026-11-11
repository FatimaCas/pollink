import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Dialog, HelperText, Portal, Text, useTheme } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { PersonRow } from "@/src/core/components/PersonRow";
import { Formatters } from "@/src/core/utils/formatters";
import type { RootStackParamList } from "@/src/navigation/types";
import { spacing } from "@/src/theme/tokens";
import { isPending, JOIN_REQUEST_STATE_LABELS } from "../../domain/entities/JoinRequest";
import { useApplicantViewModel } from "../viewmodels/useApplicantViewModel";

// La ficha del aplicante: quién es, cuándo pidió unirse y, si sigue pendiente,
// «Aceptar» y «Rechazar». Desde aquí se abre su perfil y su historial de
// colaboración (B). Los indicadores de confianza (B6) se suman cuando existan.
export default function ApplicantDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "ApplicantDetail">>();
  const vm = useApplicantViewModel(params.requestId);
  const [confirmingReject, setConfirmingReject] = useState(false);

  if (vm.loading) return <ActivityIndicator style={styles.center} testID={ApplicantDetailScreen.loadingKey} />;

  const { request } = vm;
  if (!request) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar la solicitud"
        message={vm.error ?? undefined}
        action={
          <Button mode="contained" onPress={vm.reload} testID={ApplicantDetailScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const decide = async (accepted: boolean) => {
    setConfirmingReject(false);
    if (await vm.decide(accepted)) {
      navigation.dispatch(StackActions.replace("RequestDecision", { requestId: request.id, accepted }));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <PersonRow
        testID="applicant.person"
        name={vm.name}
        subtitle={request.createdAt ? `Solicitó unirse el ${Formatters.date(request.createdAt)}` : undefined}
      />
      <Text variant="labelLarge" testID="applicant.state">
        {JOIN_REQUEST_STATE_LABELS[request.state]}
      </Text>

      <View style={styles.links}>
        <Button
          mode="outlined"
          icon="account-outline"
          onPress={() => navigation.navigate("PersonProfile", { userId: request.userId })}
          testID={ApplicantDetailScreen.profileKey}
        >
          Ver perfil
        </Button>
        <Button
          mode="outlined"
          icon="history"
          onPress={() => navigation.navigate("CollaborationHistory", { userId: request.userId, onlyPrevious: true })}
          testID={ApplicantDetailScreen.historyKey}
        >
          Historial de colaboración
        </Button>
      </View>

      {vm.error ? (
        <HelperText type="error" testID={ApplicantDetailScreen.errorKey}>
          {vm.error}
        </HelperText>
      ) : null}

      {isPending(request) ? (
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="check"
            onPress={() => decide(true)}
            loading={vm.busy}
            disabled={vm.busy}
            contentStyle={styles.cta}
            testID={ApplicantDetailScreen.acceptKey}
          >
            Aceptar
          </Button>
          <Button
            mode="outlined"
            icon="close"
            onPress={() => setConfirmingReject(true)}
            disabled={vm.busy}
            contentStyle={styles.cta}
            testID={ApplicantDetailScreen.rejectKey}
          >
            Rechazar
          </Button>
        </View>
      ) : null}

      <Portal>
        <Dialog visible={confirmingReject} onDismiss={() => setConfirmingReject(false)}>
          <Dialog.Title>¿Rechazar la solicitud?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">La persona no podrá volver a postularse con esta solicitud.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmingReject(false)}>Cancelar</Button>
            <Button mode="contained" onPress={() => decide(false)} testID={ApplicantDetailScreen.confirmRejectKey}>
              Rechazar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

ApplicantDetailScreen.loadingKey = "applicant.loading";
ApplicantDetailScreen.retryKey = "applicant.retry";
ApplicantDetailScreen.profileKey = "applicant.profile";
ApplicantDetailScreen.historyKey = "applicant.history";
ApplicantDetailScreen.errorKey = "applicant.error";
ApplicantDetailScreen.acceptKey = "applicant.accept";
ApplicantDetailScreen.rejectKey = "applicant.reject";
ApplicantDetailScreen.confirmRejectKey = "applicant.confirmReject";

const styles = StyleSheet.create({
  center: { marginTop: spacing.xl },
  container: { padding: spacing.gutter, gap: spacing.md },
  links: { gap: spacing.sm, marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  cta: { height: 48 },
});
