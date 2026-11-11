// El contrato de «seguir» a otra persona. Los errores llegan como `FollowsFailure`.
export interface FollowRepository {
  // Seguir es idempotente: si ya la sigue no inserta otra fila. No se puede
  // seguir a uno mismo.
  follow(params: { followerId: string; followedId: string }): Promise<void>;

  // Dejar de seguir a quien no se sigue no hace nada.
  unfollow(params: { followerId: string; followedId: string }): Promise<void>;

  isFollowing(params: { followerId: string; followedId: string }): Promise<boolean>;

  // A quiénes sigue la persona, sin repetidos.
  followingIds(userId: string): Promise<string[]>;

  // Cuánta gente sigue a la persona.
  followersCount(userId: string): Promise<number>;
}
