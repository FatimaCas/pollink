import { NavigatorScreenParams } from "@react-navigation/native";

// Todas las rutas de Pollink, declaradas desde el principio (ver
// docs/plan-de-trabajo.md). Cada una ya tiene su pantalla en la feature de su
// responsable: implementar una pantalla no obliga a tocar este archivo. Solo se
// toca para cambiar los parámetros de una ruta, avisando a quien navega a ella.

// Pestañas de la barra inferior.
export type TabParamList = {
  Discover: undefined; // A · discover
  Projects: undefined; // C · projects
  Profile: undefined; // B · profile
};

// Pantallas del stack raíz.
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;

  // A · auth
  Login: undefined;
  Register: undefined;

  // A · discover y requests
  ApplicationSent: { projectId: string };
  CollaborationRequests: { projectId: string };
  ApplicantDetail: { requestId: string };
  RequestDecision: { requestId: string; accepted: boolean };

  // B · profile y trust
  Onboarding: undefined;
  EditProfile: undefined;
  Settings: undefined;
  // `projectId`: abierto desde un proyecto del que es miembro («En este proyecto»).
  PersonProfile: { userId: string; projectId?: string };
  // `onlyPrevious`: solo proyectos cerrados (desde la ficha de un aplicante).
  CollaborationHistory: { userId: string; onlyPrevious?: boolean };
  TrustIndicators: { userId: string };

  // C · projects e invitations
  ProjectDetail: { projectId: string };
  ProjectInfo: { projectId: string };
  CreateProject: undefined;
  Invitations: undefined;

  // D · tasks
  TaskBoard: { projectId: string };
  TaskDetail: { taskId: string };
};

// Makes useNavigation() / navigation.navigate() type-checked across the app.
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
