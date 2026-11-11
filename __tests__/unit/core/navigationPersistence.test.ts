import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, waitFor } from "@testing-library/react-native";

import { useNavigationPersistence } from "@/src/navigation/navigationPersistence";

const OLD = { routes: [{ name: "ProjectMembers", params: { projectId: "p1" } }] };

describe("useNavigationPersistence", () => {
  beforeEach(() => AsyncStorage.clear());

  test("ignora un estado guardado con la clave anterior (rutas que ya no existen)", async () => {
    await AsyncStorage.setItem("pollink.navigation.v1", JSON.stringify(OLD));
    const { result } = renderHook(() => useNavigationPersistence(true));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.initialState).toBeUndefined();
  });
});
