import { useNavigation } from "@react-navigation/native";
import React from "react";

import { AccountRequiredDialog } from "@/src/features/auth/presentation/components/AccountRequiredDialog";
import { useApplyViewModel } from "../viewmodels/useApplyViewModel";
import { ConfirmApplicationDialog } from "./ConfirmApplicationDialog";

// Todo lo de «Solicitar unirme» menos el botón: el aviso de cuenta, la
// confirmación y el paso a «Solicitud enviada». El detalle del proyecto (C4)
// pone su botón y llama a `start`:
//
//   <ApplyToProject projectId={id} projectTitle={title}>
//     {({ start, busy }) => <Button onPress={start} disabled={busy}>Solicitar unirme</Button>}
//   </ApplyToProject>
export function ApplyToProject({
  projectId,
  projectTitle,
  children,
}: {
  projectId: string;
  projectTitle: string;
  children: (control: { start: () => void; busy: boolean }) => React.ReactNode;
}) {
  const navigation = useNavigation();
  const vm = useApplyViewModel(projectId);

  const confirm = async () => {
    if (await vm.confirm()) navigation.navigate("ApplicationSent", { projectId });
  };

  return (
    <>
      {children({ start: vm.start, busy: vm.busy })}
      <ConfirmApplicationDialog
        visible={vm.step === "confirm"}
        projectTitle={projectTitle}
        busy={vm.busy}
        error={vm.error}
        onConfirm={confirm}
        onDismiss={vm.cancel}
      />
      <AccountRequiredDialog
        visible={vm.step === "needsAccount"}
        message="Para postularte a un proyecto necesitas una cuenta: así el equipo sabe quién eres."
        onDismiss={vm.cancel}
      />
    </>
  );
}
