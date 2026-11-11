import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { useMyProjectsViewModel } from "@/src/features/projects/presentation/viewmodels/useMyProjectsViewModel";
import { fake } from "../../support/fake";
import { ownProject } from "../../support/projectFixtures";
import { fakeSession } from "../../support/sessionMock";

let mockSession = fakeSession();
jest.mock("@/src/features/auth/presentation/context/SessionContext", () => ({ useSession: () => mockSession }));

function render(repo: Partial<ProjectRepository>) {
  const c = new Container().register(TOKENS.ProjectRepo, fake<ProjectRepository>(repo, "ProjectRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  return renderHook(() => useMyProjectsViewModel(), { wrapper }).result;
}

beforeEach(() => {
  mockSession = fakeSession();
});

test("separa los que creó de aquellos en los que colabora", async () => {
  const getProjectsOfPerson = jest.fn(async () => [
    ownProject({ id: "mio" }),
    ownProject({ id: "ajeno", ownerId: "u9" }),
  ]);
  const result = render({ getProjectsOfPerson });
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(getProjectsOfPerson).toHaveBeenCalledWith("u2");
  expect(result.current.owned.map((p) => p.id)).toEqual(["mio"]);
  expect(result.current.joined.map((p) => p.id)).toEqual(["ajeno"]);
  expect(result.current.needsAccount).toBe(false);
});

test("un invitado no tiene cuenta: no lee nada", () => {
  mockSession = fakeSession({ hasAccount: false, isGuest: true });
  const getProjectsOfPerson = jest.fn();
  const result = render({ getProjectsOfPerson });
  expect(result.current).toMatchObject({ needsAccount: true, loading: false, owned: [], joined: [] });
  expect(getProjectsOfPerson).not.toHaveBeenCalled();
});

test("si falla, guarda el mensaje y reintentar vuelve a leer", async () => {
  const getProjectsOfPerson = jest
    .fn()
    .mockRejectedValueOnce(new Error("sin red"))
    .mockResolvedValue([ownProject()]);
  const result = render({ getProjectsOfPerson });
  await waitFor(() => expect(result.current.error).toBe("sin red"));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.owned).toHaveLength(1));
  expect(result.current.error).toBeNull();
});
