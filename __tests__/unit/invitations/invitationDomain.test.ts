import {
  answerable,
  cleanEmails,
  invitationStatusOf,
  isPending,
  looksLikeEmail,
  ProjectInvitation,
} from "@/src/features/invitations/domain/entities/ProjectInvitation";

const invitation = (over: Partial<ProjectInvitation> = {}): ProjectInvitation => ({
  id: "i1",
  projectId: "p1",
  userId: "u2",
  email: "ana@demo.com",
  status: "pending",
  invitedBy: "u1",
  createdAt: null,
  respondedAt: null,
  ...over,
});

describe("invitationStatusOf", () => {
  test("lee los estados conocidos", () => {
    expect(invitationStatusOf("pending")).toBe("pending");
    expect(invitationStatusOf("accepted")).toBe("accepted");
    expect(invitationStatusOf("declined")).toBe("declined");
    expect(invitationStatusOf("cancelled")).toBe("cancelled");
  });
  test("un estado desconocido no deja la invitación viva", () => {
    expect(invitationStatusOf("???")).toBe("cancelled");
    expect(invitationStatusOf(undefined)).toBe("cancelled");
  });
});

test("isPending", () => {
  expect(isPending(invitation())).toBe(true);
  expect(isPending(invitation({ status: "accepted" }))).toBe(false);
});

test("cleanEmails quita espacios, vacíos y repetidos sin importar mayúsculas", () => {
  expect(cleanEmails([" Ana@Demo.com", "", "ana@demo.com", "beto@demo.com ", "  "])).toEqual([
    "ana@demo.com",
    "beto@demo.com",
  ]);
});

test("looksLikeEmail", () => {
  expect(looksLikeEmail("ana@demo.com")).toBe(true);
  expect(looksLikeEmail(" ana@demo.com ")).toBe(true);
  expect(looksLikeEmail("ana@demo")).toBe(false);
  expect(looksLikeEmail("ana demo@x.co")).toBe(false);
  expect(looksLikeEmail("")).toBe(false);
});

test("answerable deja solo las pendientes de proyectos abiertos donde aún no colabora", () => {
  const list = [
    invitation({ id: "ok", projectId: "abierto" }),
    invitation({ id: "cerrado", projectId: "cerrado" }),
    invitation({ id: "ya", projectId: "ya" }),
    invitation({ id: "borrado", projectId: "borrado" }),
    invitation({ id: "respondida", projectId: "abierto", status: "declined" }),
  ];
  expect(answerable(list, new Set(["abierto", "ya"]), new Set(["ya"])).map((i) => i.id)).toEqual(["ok"]);
});
