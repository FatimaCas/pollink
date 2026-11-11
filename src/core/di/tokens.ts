// Un token por dependencia del contenedor. Está completo: hay uno por cada
// repositorio del plan de trabajo, aunque la feature todavía no lo registre.
// Resolver uno sin registrar lanza «No provider for Symbol(...)».
export const TOKENS = {
  RobleClient: Symbol("RobleClient"),
  AuthRepo: Symbol("AuthRepo"), // A · auth
  DiscoverRepo: Symbol("DiscoverRepo"), // A · discover (feed y guardados)
  JoinRequestRepo: Symbol("JoinRequestRepo"), // A · requests
  ProfileRepo: Symbol("ProfileRepo"), // B · profile
  TrustRepo: Symbol("TrustRepo"), // B · trust
  ProjectRepo: Symbol("ProjectRepo"), // C · projects
  InvitationRepo: Symbol("InvitationRepo"), // C · invitations
  MembersRepo: Symbol("MembersRepo"), // D · members
  TaskRepo: Symbol("TaskRepo"), // D · tasks
  FollowRepo: Symbol("FollowRepo"), // follows
} as const;
