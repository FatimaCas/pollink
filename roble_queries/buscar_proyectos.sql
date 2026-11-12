-- Consulta guardada `buscar_proyectos`. Se crea en Roble con este SQL y la app la llama
-- por nombre con `executeQueryByName`.
--
-- buscar_proyectos ($1 = texto, $2 = carrera, $3 = tamaño de página, $4 = desplazamiento)
--   Usada por: Explorar (búsqueda por texto y chips de carrera, paginada en el servidor).
--   $1 es el texto ya normalizado (ver normalizeLabel en src/core/utils); se busca dentro
--   del título y la descripción, normalizados igual. $2 es la clave normalizada de la
--   carrera. '' = sin condición. `total` = proyectos que cumplen, sin paginar.
--   Mismo orden y mismas columnas que `proyectos_filtrados`.
SELECT p._id, p._owner, p.title, p.description, p."imageUrl",
       p.jobs, p.skills, p.status, p.progress, p."createdAt",
       (SELECT COUNT(*) FROM project_member m
         WHERE m.project_id = p._id AND m.status = 'active') AS member_count,
       COUNT(*) OVER () AS total
FROM project p
WHERE ($1::text = '' OR strpos(
        trim(regexp_replace(regexp_replace(
          translate(lower(coalesce(p.title, '') || ' ' || coalesce(p.description, '')),
                    'áéíóúüñàèìòù', 'aeiouunaeiou'),
          '[.,/-]', ' ', 'g'), '\s+', ' ', 'g')),
        $1::text) > 0)
  AND ($2::text = '' OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(p.jobs) AS j
        CROSS JOIN LATERAL (SELECT trim(regexp_replace(regexp_replace(
              translate(lower(j), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
              '[.,/-]', ' ', 'g'), '\s+', ' ', 'g'))) AS n(key)
        WHERE n.key = $2::text))
ORDER BY p."createdAt" DESC, p._id
LIMIT $3::int OFFSET $4::int;
