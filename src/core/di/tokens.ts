// One token per dependency registered in the container (see appContainer.ts).
export const TOKENS = {
  RobleClient: Symbol("RobleClient"),
  AuthRepo: Symbol("AuthRepo"),
} as const;
