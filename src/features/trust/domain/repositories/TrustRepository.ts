import { TrustMetrics } from "../entities/TrustMetrics";

// Contrato de confianza. La UI depende de esto, nunca de Roble.
export interface TrustRepository {
  // Indicadores de `userId`, calculados de su historial. Sin historial, NO_TRUST.
  getTrustMetricsOf(userId: string): Promise<TrustMetrics>;

  // Índice de compromiso (0–100) de varias personas con dos consultas para
  // todas. Quien no tiene historial no aparece; un 0 es un 0 real.
  getCommitmentScores(userIds: string[]): Promise<Record<string, number>>;
}
