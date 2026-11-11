import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { ProfileUpdate } from "@/src/features/profile/domain/entities/ProfileUpdate";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { useEditProfileViewModel } from "@/src/features/profile/presentation/viewmodels/useEditProfileViewModel";
import { fake } from "../../support/fake";
import { profile } from "../../support/profileFixtures";

const mockShow = jest.fn();
jest.mock("@/src/core/feedback/SnackbarProvider", () => ({ useSnackbar: () => mockShow }));

function render(repo: Partial<ProfileRepository> = {}) {
  const saved: ProfileUpdate[] = [];
  const container = new Container().register(
    TOKENS.ProfileRepo,
    fake<ProfileRepository>(
      {
        getMyProfile: async () => profile(),
        updateMyProfile: async (u) => {
          saved.push(u);
          return profile();
        },
        ...repo,
      },
      "ProfileRepo",
    ),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={container}>{children}</DIProvider>;
  const hook = renderHook(() => useEditProfileViewModel(), { wrapper });
  return { saved, ...hook };
}

beforeEach(() => mockShow.mockClear());

test("llena el formulario con el perfil actual", async () => {
  const { result } = render();
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.program).toBe("Diseño Gráfico");
  expect(result.current.institution).toBe("Universidad del Norte");
  expect(result.current.bio).toBe("Me gusta el diseño.");
  expect(result.current.skills).toEqual(["Figma", "Ilustración"]);
});

test("agregar una habilidad la limpia; una repetida (sin tildes ni mayúsculas) se rechaza", async () => {
  const { result } = render();
  await waitFor(() => expect(result.current.loading).toBe(false));
  let why: string | null = "x";
  act(() => {
    why = result.current.addSkill("  react   native ");
  });
  expect(why).toBeNull();
  expect(result.current.skills).toEqual(["Figma", "Ilustración", "react native"]);
  act(() => {
    why = result.current.addSkill("ILUSTRACION");
  });
  expect(why).toBe("Esa habilidad ya está en la lista.");
  act(() => {
    why = result.current.addSkill("   ");
  });
  expect(why).toBeNull();
  expect(result.current.skills).toHaveLength(3);
});

test("quitar una habilidad", async () => {
  const { result } = render();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.removeSkill(0));
  expect(result.current.skills).toEqual(["Ilustración"]);
});

test("guardar manda lo editado, avisa y devuelve true", async () => {
  const { result, saved } = render();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setProgram("Arquitectura"));
  act(() => result.current.setBio("Hola"));
  let ok = false;
  await act(async () => {
    ok = await result.current.save();
  });
  expect(ok).toBe(true);
  expect(saved).toEqual([{ career: { program: "Arquitectura", institution: "Universidad del Norte" }, bio: "Hola", skills: ["Figma", "Ilustración"] }]);
  expect(mockShow).toHaveBeenCalledWith("Perfil actualizado");
  expect(result.current.saving).toBe(false);
});

test("si guardar falla deja el mensaje y devuelve false", async () => {
  const { result } = render({
    updateMyProfile: async () => {
      throw new Error("No tienes permiso para editar este perfil.");
    },
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  let ok = true;
  await act(async () => {
    ok = await result.current.save();
  });
  expect(ok).toBe(false);
  expect(result.current.error).toBe("No tienes permiso para editar este perfil.");
  expect(mockShow).not.toHaveBeenCalled();
});

test("no deja guardar si el perfil no pudo cargar (se pisaría con vacíos)", async () => {
  const { result, saved } = render({
    getMyProfile: async () => {
      throw new Error("Sin conexión.");
    },
  });
  await waitFor(() => expect(result.current.loadError).toBe("Sin conexión."));
  let ok = true;
  await act(async () => {
    ok = await result.current.save();
  });
  expect(ok).toBe(false);
  expect(saved).toEqual([]);
});
