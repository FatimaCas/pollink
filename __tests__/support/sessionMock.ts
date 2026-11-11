// Una sesión falsa para las pruebas de view models y pantallas que solo leen
// `useSession()`. Se usa dentro de `jest.mock(...)` (ver los componentes).
export function fakeSession(over: Record<string, unknown> = {}) {
  const user = { userId: "u2", name: "Laura Pérez", email: "l@x.co", isAnonymous: false };
  return {
    user,
    hasAccount: true,
    isGuest: false,
    guestName: null,
    displayName: user.name,
    currentUser: () => user,
    ensureLoggedIn: () => true,
    ensureWritableSession: async () => true,
    ...over,
  };
}
