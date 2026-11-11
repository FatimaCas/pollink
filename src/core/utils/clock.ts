// El reloj, inyectable: lo que escribe `finished_at`, `joinedAt` y demás marcas
// de tiempo lo pide aquí, y las pruebas pasan uno fijo en vez de esperar.
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
