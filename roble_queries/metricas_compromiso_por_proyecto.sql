-- Consulta guardada `metricas_compromiso_por_proyecto`. Se crea en Roble con este SQL y la app la llama
-- por nombre con `executeQueryByName`. Viene de Imker (docs/db/saved_queries.sql).
--
-- metricas_compromiso_por_proyecto ($1 = ids separados por coma)
--   Usada por: features/trust (compromiso, tasa de respuesta, completados).
--   Una fila por (persona, proyecto); suma las estancias de la misma persona.
--   Depende de los contadores que mantiene features/tasks.
SELECT m.user_id, m.project_id,
       COALESCE(SUM(m.tasks_finished), 0) AS tasks_finished,
       COALESCE(SUM(m.tasks_taken), 0)    AS tasks_taken,
       p.total_tasks, p.progress
FROM project_member m
JOIN project p ON p._id = m.project_id
WHERE m.user_id = ANY(string_to_array($1, ',')::uuid[])
GROUP BY m.user_id, m.project_id, p.total_tasks, p.progress;
