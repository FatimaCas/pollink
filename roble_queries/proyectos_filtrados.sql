-- Consulta guardada `proyectos_filtrados`. Se crea en Roble con este SQL y la app la llama
-- por nombre con `executeQueryByName`. Viene de Imker (docs/db/saved_queries.sql).
--
-- proyectos_filtrados ($1 = carrera, $2 = habilidad, $3 = solo abiertos, $4 = tamaño de página, $5 = desplazamiento)
--   Usada por: feed de Descubrir (filtros y paginación en el servidor).
--   $1 y $2 son claves normalizadas (ver normalizeLabel en src/core/utils); '' = todas.
--   $3 es 'true' o 'false'. `total` = proyectos que cumplen el filtro, sin paginar.
--   Requiere project."createdAt": Roble no tiene valores por defecto, así que la
--   app lo escribe al crear el proyecto.
SELECT p._id, p._owner, p.title, p.description, p."imageUrl",
       p.jobs, p.skills, p.status, p.progress, p."createdAt",
       (SELECT COUNT(*) FROM project_member m
         WHERE m.project_id = p._id AND m.status = 'active') AS member_count,
       COUNT(*) OVER () AS total
FROM project p
WHERE ($3::text <> 'true' OR p.status = 'open')
  AND ($1::text = '' OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(p.jobs) AS j
        CROSS JOIN LATERAL (SELECT trim(regexp_replace(regexp_replace(
              translate(lower(j), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
              '[.,/-]', ' ', 'g'), '\s+', ' ', 'g'))) AS n(key)
        WHERE n.key = $1::text))
  AND ($2::text = '' OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(p.skills) AS s
        CROSS JOIN LATERAL (SELECT trim(regexp_replace(regexp_replace(
              translate(lower(s), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
              '[.,/-]', ' ', 'g'), '\s+', ' ', 'g'))) AS n(key)
        WHERE n.key = $2::text))
ORDER BY p."createdAt" DESC, p._id
LIMIT $4::int OFFSET $5::int;
