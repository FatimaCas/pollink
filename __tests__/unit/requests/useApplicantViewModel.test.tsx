import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { useApplicantViewModel } from "@/src/features/requests/presentation/viewmodels/useApplicantViewModel";
import { useJoinRequestsViewModel } from "@/src/features/requests/presentation/viewmodels/useJoinRequestsViewModel";
import { fake } from "../../support/fake";
import { joinRequest } from "../../support/requestFixtures";

jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useSession: () => require("../../support/sessionMock").fakeSession({ currentUser: () => ({ userId: "u_owner", name: "Dueña", email: "o@x.co", isAnonymous: false }) }),
}));

function container(requests: Partial<JoinRequestRepository>, members: Partial<MembersRepository> = {}) {
  return new Container()
    .register(TOKENS.JoinRequestRepo, fake<JoinRequestRepository>(requests, "JoinRequestRepo"))
    .register(TOKENS.MembersRepo, fake<MembersRepository>(members, "MembersRepo"));
}
function wrap(c: Container) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <DIProvider container={c}>{children}</DIProvider>;
  };
}

describe("useApplicantViewModel", () => {
  test("aceptar: comprueba, agrega al miembro, marca la solicitud y cancela lo demás, en ese orden", async () => {
    const calls: string[] = [];
    const decided = joinRequest({ state: "accepted", reviewedBy: "u_owner" });
    const c = container(
      {
        requestById: async () => joinRequest(),
        ensureAcceptable: async () => { calls.push("ensure"); return joinRequest(); },
        decide: async () => { calls.push("decide"); return decided; },
        cancelPending: async () => { calls.push("cancel"); return 0; },
      },
      { addMember: async () => { calls.push("addMember"); return {} as never; } },
    );
    const { result } = renderHook(() => useApplicantViewModel("r1"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.request).not.toBeNull());
    let ok = false;
    await act(async () => { ok = await result.current.decide(true); });
    expect(ok).toBe(true);
    expect(calls).toEqual(["ensure", "addMember", "decide", "cancel"]);
    expect(result.current.request?.state).toBe("accepted");
  });

  test("aceptar agrega al aplicante al proyecto de la solicitud", async () => {
    const addMember = jest.fn().mockResolvedValue({});
    const c = container(
      { requestById: async () => joinRequest({ userId: "u_x", projectId: "p9" }), ensureAcceptable: async () => joinRequest(), decide: async () => joinRequest({ state: "accepted" }), cancelPending: async () => 0 },
      { addMember },
    );
    const { result } = renderHook(() => useApplicantViewModel("r1"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.request).not.toBeNull());
    await act(async () => { await result.current.decide(true); });
    expect(addMember).toHaveBeenCalledWith({ projectId: "p9", userId: "u_x" });
  });

  test("si el proyecto ya cerró no agrega a nadie y muestra el motivo", async () => {
    const addMember = jest.fn();
    const decide = jest.fn();
    const c = container(
      { requestById: async () => joinRequest(), ensureAcceptable: async () => { throw new Error("Este proyecto está cerrado y ya no recibe solicitudes."); }, decide },
      { addMember },
    );
    const { result } = renderHook(() => useApplicantViewModel("r1"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.request).not.toBeNull());
    let ok = true;
    await act(async () => { ok = await result.current.decide(true); });
    expect(ok).toBe(false);
    expect(addMember).not.toHaveBeenCalled();
    expect(decide).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/cerrado/);
  });

  test("rechazar no toca a los miembros", async () => {
    const addMember = jest.fn();
    const decide = jest.fn().mockResolvedValue(joinRequest({ state: "rejected" }));
    const c = container({ requestById: async () => joinRequest(), decide }, { addMember });
    const { result } = renderHook(() => useApplicantViewModel("r1"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.request).not.toBeNull());
    await act(async () => { await result.current.decide(false); });
    expect(addMember).not.toHaveBeenCalled();
    expect(decide).toHaveBeenCalledWith({ requestId: "r1", accepted: false, reviewerId: "u_owner" });
  });

  test("si falla al marcar la solicitud, el miembro ya agregado no se duplica al reintentar (addMember es idempotente) y se informa", async () => {
    const decide = jest.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue(joinRequest({ state: "accepted" }));
    const c = container(
      { requestById: async () => joinRequest(), ensureAcceptable: async () => joinRequest(), decide, cancelPending: async () => 0 },
      { addMember: async () => ({}) as never },
    );
    const { result } = renderHook(() => useApplicantViewModel("r1"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.request).not.toBeNull());
    await act(async () => { await result.current.decide(true); });
    expect(result.current.error).toBe("sin red");
    expect(result.current.request?.state).toBe("pending");
    await act(async () => { await result.current.decide(true); });
    expect(result.current.request?.state).toBe("accepted");
  });

  test("una solicitud que no existe deja un error", async () => {
    const c = container({ requestById: async () => null });
    const { result } = renderHook(() => useApplicantViewModel("zzz"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.error).toBe("No se encontró la solicitud."));
  });

  test("una solicitud ya resuelta no se vuelve a resolver", async () => {
    const decide = jest.fn();
    const c = container({ requestById: async () => joinRequest({ state: "accepted" }), decide });
    const { result } = renderHook(() => useApplicantViewModel("r1"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.request).not.toBeNull());
    await act(async () => { expect(await result.current.decide(false)).toBe(false); });
    expect(decide).not.toHaveBeenCalled();
  });
});

describe("useJoinRequestsViewModel", () => {
  test("lista las solicitudes y cuenta las pendientes", async () => {
    const list = [joinRequest({ id: "a" }), joinRequest({ id: "b", state: "rejected" })];
    const c = container({ requestsForProject: async () => list });
    const { result } = renderHook(() => useJoinRequestsViewModel("p1"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.requests).toHaveLength(2);
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.nameOf(list[0])).toBe("Aplicante");
  });

  test("un fallo deja el error y reload lo recupera", async () => {
    const requestsForProject = jest.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValue([joinRequest()]);
    const c = container({ requestsForProject });
    const { result } = renderHook(() => useJoinRequestsViewModel("p1"), { wrapper: wrap(c) });
    await waitFor(() => expect(result.current.error).toBe("sin red"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.requests).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });
});
