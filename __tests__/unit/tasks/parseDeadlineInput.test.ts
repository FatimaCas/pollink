import { parseDeadlineInput } from "@/src/features/tasks/presentation/utils/parseDeadlineInput";

const now = new Date(2026, 10, 10, 12, 0, 0);

test("vacío es sin fecha", () => {
  expect(parseDeadlineInput("", now)).toBeNull();
  expect(parseDeadlineInput("   ", now)).toBeNull();
});

test("una fecha válida termina al final de ese día local", () => {
  const d = parseDeadlineInput("15/11/2026", now)!;
  expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 15, 23, 59]);
});

test("hoy todavía es válido", () => {
  expect(parseDeadlineInput("10/11/2026", now)).not.toBeNull();
});

test.each(["2026-11-15", "15-11-2026", "hola"])("formato incorrecto %j", (text) => {
  expect(() => parseDeadlineInput(text, now)).toThrow("dd/mm/aaaa");
});

test("una fecha que no existe se rechaza", () => {
  expect(() => parseDeadlineInput("31/02/2027", now)).toThrow("no existe");
});

test("una fecha pasada se rechaza", () => {
  expect(() => parseDeadlineInput("09/11/2026", now)).toThrow("anterior a hoy");
});
