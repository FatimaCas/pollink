import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { emptyProfile } from "@/src/features/profile/domain/entities/UserProfile";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { useMyProfileViewModel } from "@/src/features/profile/presentation/viewmodels/useMyProfileViewModel";
import { fake } from "../../support/fake";
import { profile } from "../../support/profileFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

function render(repo: Partial<ProfileRepository> = {}) {
  const calls: string[] = [];
  const container = new Container().register(
    TOKENS.ProfileRepo,
    fake<ProfileRepository>(
      {
        ensureMyProfile: async (name) => void calls.push(`ensure:${name}`),
        getMyProfile: async () => {
          calls.push("get");
          return profile();
        },
        ...repo,
      },
      "ProfileRepo",
    ),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={container}>{children}</DIProvider>;
  return { calls, ...renderHook(() => useMyProfileViewModel(), { wrapper }) };
}

beforeEach(() => {
  mockSession = fakeSession();
});

test("garantiza la fila propia y luego lee el perfil", async () => {
  const { result, calls } = render();
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(calls).toEqual(["ensure:Laura Pérez", "get"]);
  expect(result.current.profile?.name).toBe("Laura Pérez");
  expect(result.current.academicInfo).toBe("Diseño Gráfico - Universidad del Norte");
  expect(result.current.incomplete).toBe(false);
});

test("falta carrera o habilidades: pide completar el perfil", async () => {
  const { result } = render({ getMyProfile: async () => emptyProfile("u2", "Laura") });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.incomplete).toBe(true);
});

test("sin cuenta no lee nada y avisa que hace falta una", async () => {
  mockSession = fakeSession({ user: null, hasAccount: false });
  const { result, calls } = render();
  expect(result.current.needsAccount).toBe(true);
  expect(result.current.loading).toBe(false);
  expect(result.current.profile).toBeNull();
  expect(calls).toEqual([]);
});

test("un invitado tampoco tiene perfil que leer", async () => {
  mockSession = fakeSession({ hasAccount: false, isGuest: true });
  const { result, calls } = render();
  expect(result.current.needsAccount).toBe(true);
  expect(result.current.isGuest).toBe(true);
  expect(calls).toEqual([]);
});

test("un fallo deja el mensaje y reload reintenta", async () => {
  let fail = true;
  const { result } = render({
    getMyProfile: async () => {
      if (fail) throw new Error("Sin conexión.");
      return profile();
    },
  });
  await waitFor(() => expect(result.current.error).toBe("Sin conexión."));
  expect(result.current.loading).toBe(false);
  fail = false;
  result.current.reload();
  await waitFor(() => expect(result.current.profile).not.toBeNull());
  expect(result.current.error).toBeNull();
});
