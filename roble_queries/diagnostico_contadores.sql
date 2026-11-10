-- Consulta guardada `diagnostico_contadores`. Se crea en Roble con este SQL y la app la llama
-- por nombre con `executeQueryByName`. Viene de Imker (docs/db/saved_queries.sql).
--
-- diagnostico_contadores (sin parámetros)
--   Usada por: comprobación de los contadores antes de cada entrega.
--   Solo lectura. Una fila por cada contador que NO coincide con lo que dicen las
--   filas base; sin filas = contadores consistentes. Se parte de datos limpios:
--   esta consulta es el diagnóstico, no hay recálculo.
--   kind: project_total | project_progress | member_finished | member_taken
--   `stored` = lo guardado; `expected` = lo que dan las filas de `task`.
--   Para member_taken `expected` es una cota inferior (las tareas que tiene ahora
--   a su nombre): `tasks_taken` es un contador de eventos y no se puede
--   reconstruir, así que solo se marca si está POR DEBAJO de ese mínimo.
WITH real AS (
  SELECT p._id AS project_id, p.total_tasks, p.progress,
         COUNT(t._id) AS real_total,
         COUNT(t._id) FILTER (WHERE t.status = 'done') AS real_done
  FROM project p
  LEFT JOIN task t ON t.project_id = p._id
  GROUP BY p._id, p.total_tasks, p.progress
),
by_user AS (
  SELECT project_id, assignee_id AS user_id,
         COUNT(*) AS assigned,
         COUNT(*) FILTER (WHERE status = 'done') AS done
  FROM task
  WHERE assignee_id IS NOT NULL
  GROUP BY project_id, assignee_id
),
stays AS (
  SELECT project_id, user_id,
         COALESCE(SUM(tasks_taken), 0)    AS taken,
         COALESCE(SUM(tasks_finished), 0) AS finished
  FROM project_member
  GROUP BY project_id, user_id
)
SELECT 'project_total' AS kind, project_id::text, NULL::text AS user_id,
       COALESCE(total_tasks, 0)::numeric AS stored, real_total::numeric AS expected
FROM real
WHERE COALESCE(total_tasks, 0) <> real_total
UNION ALL
SELECT 'project_progress', project_id::text, NULL,
       COALESCE(progress, 0)::numeric,
       CASE WHEN real_total = 0 THEN 0 ELSE real_done * 100.0 / real_total END
FROM real
WHERE abs(COALESCE(progress, 0)::numeric
          - CASE WHEN real_total = 0 THEN 0 ELSE real_done * 100.0 / real_total END)
      > 0.01
UNION ALL
SELECT 'member_finished', s.project_id::text, s.user_id::text,
       s.finished::numeric, COALESCE(u.done, 0)::numeric
FROM stays s
LEFT JOIN by_user u ON u.project_id = s.project_id AND u.user_id = s.user_id
WHERE s.finished <> COALESCE(u.done, 0)
UNION ALL
SELECT 'member_taken', s.project_id::text, s.user_id::text,
       s.taken::numeric, u.assigned::numeric
FROM stays s
JOIN by_user u ON u.project_id = s.project_id AND u.user_id = s.user_id
WHERE s.taken < u.assigned
ORDER BY 1, 2, 3;
