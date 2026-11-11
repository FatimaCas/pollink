import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { usePeopleDirectory } from "@/src/features/profile/presentation/hooks/usePeopleDirectory";
import { usePersonName } from "@/src/features/profile/presentation/hooks/usePersonName";
import { fake } from "../../support/fake";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

function setup() {
  const asked: string[][] = [];
  const repo = fake<ProfileRepository>(
    {
      getNamesOf: async (ids) => {
        asked.push(ids);
        return Object.fromEntries(ids.filter((id) => id === "ana").map((id) => [id, "Ana Torres"]));
      },
    },
    "ProfileRepo",
  );
  const container = new Container().register(TOKENS.ProfileRepo, repo);
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={container}>{children}</DIProvider>;
  return { asked, wrapper };
}

beforeEach(() => {
  mockSession = fakeSession();
});

test("muestra el nombre de reserva y luego el real cuando llega", async () => {
  const { wrapper } = setup();
  const { result } = renderHook(() => usePersonName("ana"), { wrapper });
  expect(result.current).toBe("Otra persona");
  await waitFor(() => expect(result.current).toBe("Ana Torres"));
});

test("sin perfil se queda con el nombre de reserva indicado", async () => {
  const { wrapper, asked } = setup();
  const { result } = renderHook(() => usePersonName("nadie", "Alguien"), { wrapper });
  await waitFor(() => expect(asked).toHaveLength(1));
  expect(result.current).toBe("Alguien");
});

test("varias filas del mismo contenedor comparten la caché", async () => {
  const { wrapper, asked } = setup();
  const first = renderHook(() => usePersonName("ana"), { wrapper });
  await waitFor(() => expect(first.result.current).toBe("Ana Torres"));
  const second = renderHook(() => usePersonName("ana"), { wrapper });
  expect(second.result.current).toBe("Ana Torres");
  expect(asked).toEqual([["ana"]]);
});

test("precargar una lista de una vez evita lecturas por fila", async () => {
  const { wrapper, asked } = setup();
  const dir = renderHook(() => usePeopleDirectory(), { wrapper });
  await act(async () => {
    await dir.result.current.preload(["ana", "beto"]);
  });
  const row = renderHook(() => usePersonName("ana"), { wrapper });
  expect(row.result.current).toBe("Ana Torres");
  expect(asked).toEqual([["ana", "beto"]]);
});
