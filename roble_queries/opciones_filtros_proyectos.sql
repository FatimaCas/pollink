-- Consulta guardada `opciones_filtros_proyectos`. Se crea en Roble con este SQL y la app la llama
-- por nombre con `executeQueryByName`. Viene de Imker (docs/db/saved_queries.sql).
--
-- opciones_filtros_proyectos ($1 = carrera elegida, $2 = solo abiertos)
--   Usada por: selectores de la hoja de filtros de Descubrir.
--   Una fila por opción: kind ('career' | 'skill'), key (normalizada), label (variante
--   más frecuente; en empate la primera alfabéticamente) y project_count.
--   Las carreras no dependen de la habilidad elegida; las habilidades sí de la carrera.
--   La normalización debe coincidir con normalizeLabel (src/core/utils).
WITH base AS (
  SELECT p._id, p.jobs, p.skills FROM project p
  WHERE $2::text <> 'true' OR p.status = 'open'
),
c AS (
  SELECT DISTINCT b._id, 'career'::text AS kind, n.key, j AS label
  FROM base b
  CROSS JOIN LATERAL jsonb_array_elements_text(b.jobs) AS j
  CROSS JOIN LATERAL (SELECT trim(regexp_replace(regexp_replace(
        translate(lower(j), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
        '[.,/-]', ' ', 'g'), '\s+', ' ', 'g'))) AS n(key)
  WHERE n.key <> ''
),
s AS (
  SELECT DISTINCT b._id, 'skill'::text AS kind, n.key, x AS label
  FROM base b
  CROSS JOIN LATERAL jsonb_array_elements_text(b.skills) AS x
  CROSS JOIN LATERAL (SELECT trim(regexp_replace(regexp_replace(
        translate(lower(x), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
        '[.,/-]', ' ', 'g'), '\s+', ' ', 'g'))) AS n(key)
  WHERE n.key <> ''
    AND ($1::text = '' OR b._id IN (SELECT _id FROM c WHERE key = $1::text))
),
u AS (SELECT * FROM c UNION ALL SELECT * FROM s),
variants AS (SELECT kind, key, label, COUNT(*) AS n FROM u GROUP BY kind, key, label),
totals   AS (SELECT kind, key, COUNT(DISTINCT _id) AS project_count FROM u GROUP BY kind, key)
SELECT DISTINCT ON (v.kind, v.key) v.kind, v.key, v.label, t.project_count
FROM variants v JOIN totals t USING (kind, key)
ORDER BY v.kind, v.key, v.n DESC, v.label;
