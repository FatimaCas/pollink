import { normalizeLabel } from "@/src/core/utils/normalizeLabel";

test("las variantes de escritura dan la misma clave", () => {
  expect(normalizeLabel("Ing. Sóftware")).toBe("ing software");
  expect(normalizeLabel("ing software")).toBe("ing software");
  expect(normalizeLabel("Ing.  Software ")).toBe("ing software");
});

test("no expande abreviaturas ni unifica sinónimos", () => {
  expect(normalizeLabel("Ingeniería de Software")).not.toBe(normalizeLabel("Ing. Software"));
  expect(normalizeLabel("JS")).not.toBe(normalizeLabel("JavaScript"));
});

test("quita tildes, diéresis y la eñe, y trata . , - / como espacio", () => {
  expect(normalizeLabel("Ñandú-Pingüino/Árbol,Sí")).toBe("nandu pinguino arbol si");
});

test("un texto vacío o de puro símbolo da clave vacía", () => {
  expect(normalizeLabel("  . - ")).toBe("");
});
