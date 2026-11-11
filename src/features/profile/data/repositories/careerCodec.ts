import { Career } from "../../domain/entities/UserProfile";

// `career` es jsonb: normalmente `{program, institution}`, pero una fila vieja
// puede traer texto plano (que cuenta como carrera) o texto JSON. Si no calza
// nada, vacío en vez de fallar.
export function parseCareer(value: unknown): Career {
  const empty: Career = { program: "", institution: "" };
  let raw = value;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return empty;
    try {
      raw = JSON.parse(text);
    } catch {
      return { program: text, institution: "" };
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return { program: String(o.program ?? "").trim(), institution: String(o.institution ?? "").trim() };
  }
  return empty;
}

// `career` es NOT NULL: aunque no haya nada, se guarda el objeto con vacíos.
export function careerToJson(career: Career): Career {
  return { program: career.program.trim(), institution: career.institution.trim() };
}
