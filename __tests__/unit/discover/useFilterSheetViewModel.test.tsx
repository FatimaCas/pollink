import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { Container } from "@/src/core/di/container";
import { DIProvider } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { NO_FILTER, ProjectFilter } from "@/src/features/discover/domain/entities/ProjectFilter";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { useFilterSheetViewModel } from "@/src/features/discover/presentation/viewmodels/useFilterSheetViewModel";
import { fake } from "../../support/fake";

const options = {
  careers: [{ key: "gastronomia", label: "Gastronomía", count: 2 }],
  skills: [{ key: "postres", label: "Postres", count: 1 }],
};

function setup(applied: ProjectFilter = NO_FILTER, repo: Partial<DiscoverRepository> = {}) {
  const feedPage = jest.fn(async ({ filter }: { filter: ProjectFilter }) => ({ projects: [], total: filter.career ? 1 : 5 }));
  const filterOptions = jest.fn(async () => options);
  const c = new Container().register(TOKENS.DiscoverRepo, fake<DiscoverRepository>({ feedPage, filterOptions, ...repo }, "DiscoverRepo"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <DIProvider container={c}>{children}</DIProvider>;
  const hook = renderHook(() => useFilterSheetViewModel(applied), { wrapper });
  return { ...hook, feedPage, filterOptions };
}

test("el borrador parte de lo aplicado y carga opciones y conteo", async () => {
  const { result, filterOptions } = setup();
  await waitFor(() => expect(result.current.resultCount).toBe(5));
  expect(result.current.options).toEqual(options);
  expect(filterOptions).toHaveBeenCalledWith({ career: null, onlyOpen: false });
});

test("elegir carrera suelta la habilidad y recalcula opciones y conteo", async () => {
  const { result, filterOptions } = setup({ career: null, skill: "postres", onlyOpen: false });
  await waitFor(() => expect(result.current.resultCount).toBe(5));
  act(() => result.current.setCareer("gastronomia"));
  expect(result.current.draft).toEqual({ career: "gastronomia", skill: null, onlyOpen: false });
  await waitFor(() => expect(result.current.resultCount).toBe(1));
  expect(filterOptions).toHaveBeenLastCalledWith({ career: "gastronomia", onlyOpen: false });
});

test("una habilidad que ya no existe con la carrera elegida se limpia sola", async () => {
  const { result } = setup({ career: null, skill: "ya-no-existe", onlyOpen: false });
  await waitFor(() => expect(result.current.draft.skill).toBeNull());
});

test("«solo abiertos» cambia las opciones y «limpiar» deja todo en Todas", async () => {
  const { result, filterOptions } = setup();
  await waitFor(() => expect(result.current.resultCount).toBe(5));
  act(() => result.current.setOnlyOpen(true));
  await waitFor(() => expect(filterOptions).toHaveBeenLastCalledWith({ career: null, onlyOpen: true }));
  act(() => result.current.clear());
  expect(result.current.draft).toEqual(NO_FILTER);
});

test("si no se pueden cargar las opciones lo dice, y el conteo queda sin dato", async () => {
  const { result } = setup(NO_FILTER, { filterOptions: async () => { throw new Error("sin red"); }, feedPage: async () => { throw new Error("x"); } });
  await waitFor(() => expect(result.current.error).toBe("sin red"));
  expect(result.current.resultCount).toBeNull();
});
