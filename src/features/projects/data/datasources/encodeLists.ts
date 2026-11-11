import { Row } from "@/src/core/roble/guard";

// Roble rechaza una lista nativa en una columna jsonb: `jobs` y `skills` viajan
// como texto JSON, igual que el checklist de las tareas.
export function encodeLists(fields: Row): Row {
  const encoded = { ...fields };
  for (const key of ["jobs", "skills"]) {
    if (Array.isArray(encoded[key])) encoded[key] = JSON.stringify(encoded[key]);
  }
  return encoded;
}
