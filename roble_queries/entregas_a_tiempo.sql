-- Consulta guardada `entregas_a_tiempo`. Se crea en Roble con este SQL y la app la llama
-- por nombre con `executeQueryByName`. Viene de Imker (docs/db/saved_queries.sql).
--
-- entregas_a_tiempo ($1 = ids separados por coma)
--   Usada por: features/trust (entrega a tiempo).
SELECT assignee_id AS user_id,
       COUNT(*) FILTER (WHERE finished_at IS NOT NULL
                          AND deadline IS NOT NULL) AS con_deadline,
       COUNT(*) FILTER (WHERE finished_at <= deadline) AS a_tiempo
FROM task
WHERE assignee_id = ANY(string_to_array($1, ',')::uuid[])
  AND status = 'done'
GROUP BY assignee_id;
