import { act, renderHook } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { useApplyViewModel } from "@/src/features/requests/presentation/viewmodels/useApplyViewModel";
import { fake } from "../../support/fake";
import { joinRequest } from "../../support/requestFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

function setup(requests: Partial<JoinRequestRepository> = {}, members: Partial<MembersRepository> = {}) {
  const c = new Container()
    .register(TOKENS.JoinRequestRepo, fake<JoinRequestRepository>({ apply: async () => joinRequest(), ...requests }, "JoinRequestRepo"))
    .register(TOKENS.MembersRepo, fake<MembersRepository>({ activeMemberIds: async () => ["u_owner"], ...members }, "MembersRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  return renderHook(() => useApplyViewModel("p1"), { wrapper });
}

beforeEach(() => {
  mockSession = fakeSession();
});

test("con cuenta, empezar pide confirmación; cancelar vuelve al inicio", () => {
  const { result } = setup();
  act(() => result.current.start());
  expect(result.current.step).toBe("confirm");
  act(() => result.current.cancel());
  expect(result.current.step).toBe("idle");
});

test("un invitado no se postula: se le avisa que necesita cuenta", () => {
  mockSession = fakeSession({ hasAccount: false, isGuest: true });
  const { result } = setup();
  act(() => result.current.start());
  expect(result.current.step).toBe("needsAccount");
});

test("confirmar envía la solicitud a nombre de la sesión", async () => {
  const apply = jest.fn().mockResolvedValue(joinRequest());
  const { result } = setup({ apply });
  act(() => result.current.start());
  let ok = false;
  await act(async () => {
    ok = await result.current.confirm();
  });
  expect(ok).toBe(true);
  expect(apply).toHaveBeenCalledWith({ projectId: "p1", userId: "u2" });
  expect(result.current.step).toBe("idle");
});

test("quien ya es miembro no se postula y se le explica", async () => {
  const apply = jest.fn();
  const { result } = setup({ apply }, { activeMemberIds: async () => ["u2"] });
  act(() => result.current.start());
  let ok = true;
  await act(async () => {
    ok = await result.current.confirm();
  });
  expect(ok).toBe(false);
  expect(apply).not.toHaveBeenCalled();
  expect(result.current.error).toBe("Ya colaboras en este proyecto.");
  expect(result.current.step).toBe("confirm");
});

test("si el servidor rechaza, deja el mensaje y la confirmación abierta", async () => {
  const { result } = setup({ apply: async () => { throw new Error("Este proyecto está cerrado y ya no recibe solicitudes."); } });
  act(() => result.current.start());
  await act(async () => {
    await result.current.confirm();
  });
  expect(result.current.error).toMatch(/cerrado/);
  expect(result.current.step).toBe("confirm");
  expect(result.current.busy).toBe(false);
});

test("si la sesión se volvió de invitado antes de confirmar, no envía y pide cuenta", async () => {
  const apply = jest.fn();
  const { result, rerender } = setup({ apply });
  act(() => result.current.start());
  mockSession = fakeSession({ currentUser: () => ({ userId: "g", name: "x", email: "x", isAnonymous: true }) });
  rerender({});
  await act(async () => {
    await result.current.confirm();
  });
  expect(apply).not.toHaveBeenCalled();
  expect(result.current.step).toBe("needsAccount");
});
