// La clave con la que se comparan carreras y habilidades (spec 04 §3.3):
// minúsculas, sin tildes ni diéresis, y `.` `,` `-` `/` como espacio, con los
// espacios colapsados. No se expanden abreviaturas: «Ing.» sigue siendo «ing».
//
// Debe coincidir con el SQL de `roble_queries/proyectos_filtrados.sql`,
// `opciones_filtros_proyectos.sql` y `buscar_proyectos.sql`: si cambia uno,
// cambian todos.
export function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
