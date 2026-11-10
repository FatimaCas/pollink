import { NavigatorScreenParams } from "@react-navigation/native";

// Screens inside the bottom tabs.
export type TabParamList = {
  Profile: undefined;
};

// Screens in the root stack.
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Login: undefined;
  Register: undefined;
};

// Makes useNavigation() / navigation.navigate() type-checked across the app.
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
