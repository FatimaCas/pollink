import { Row } from "../roble/guard";

// El backend falso: las mismas filas que devolvería Roble, en memoria.
//
// Guarda **filas**, no entidades, y esa es la gracia: los datasources en
// memoria devuelven lo mismo que los de Roble, así que el repositorio —que es
// uno solo— hace el mismo trabajo en los dos casos.
//
// Se pierde al cerrar la app. Existe para trabajar en la UI sin servidor y
// para que las pruebas no necesiten red.
//
// Cada feature guarda sus filas en `table(TABLES.xxx)` y las siembra en su
// `registerXxxLocal` (en su `di.ts`), así que este archivo no cambia al agregar
// una feature.
export class DummyData {
  // La cuenta con la que arranca la demo.
  static readonly demoEmail = "ana@demo.com";
  static readonly demoPassword = "123456";

  // Filas de `user_system`, con lo poco que la app mira de ellas.
  users: Row[] = [];
  passwords: Record<string, string> = {};

  // Las filas de cada tabla, por nombre (ver `TABLES` en core/roble/tables.ts).
  private readonly tables = new Map<string, Row[]>();

  // Las filas de una tabla. La primera vez la crea vacía.
  table(name: string): Row[] {
    let rows = this.tables.get(name);
    if (!rows) {
      rows = [];
      this.tables.set(name, rows);
    }
    return rows;
  }

  // Quién tiene la sesión abierta, o `null`.
  session: Row | null = null;

  // Latencia simulada, para que los estados de carga se vean. Las pruebas la
  // bajan: en Jest los relojes son de verdad.
  readonly latencyMs: number;

  // Arranca por encima de los ids sembrados a mano: si volviera a emitirlos,
  // una fila nueva pisaría una de prueba.
  private counter = 100;
  nextId(prefix: string) {
    this.counter += 1;
    return `${prefix}_${this.counter}`;
  }

  constructor({ latencyMs = 300 }: { latencyMs?: number } = {}) {
    this.latencyMs = latencyMs;
    this.seed();
  }

  // Espera la latencia simulada, escalada para cada tipo de llamada.
  delay(factor = 1) {
    return new Promise<void>((resolve) => setTimeout(resolve, this.latencyMs * factor));
  }

  private seed() {
    this.users.push(
      { userId: "u_ana", name: "Ana Torres", email: DummyData.demoEmail },
      { userId: "u_beto", name: "Beto Ramirez", email: "beto@demo.com" },
      { userId: "u_carla", name: "Carla Mendez", email: "carla@demo.com" },
    );
    for (const u of this.users) this.passwords[u.email] = DummyData.demoPassword;
  }
}

// Filtra filas por igualdad, como `db.read(tabla, filtros)`.
export function matchesRow(row: Row, filters?: Row) {
  return !filters || Object.entries(filters).every(([k, v]) => row[k] === v);
}
