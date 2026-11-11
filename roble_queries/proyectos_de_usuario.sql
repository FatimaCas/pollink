-- Consulta guardada `proyectos_de_usuario`. Se crea en Roble con este SQL y la app la llama
-- por nombre con `executeQueryByName`. Viene de Imker (docs/db/saved_queries.sql).
--
-- proyectos_de_usuario ($1 = user_id)
--   Usada por: historial de colaboración (features/profile).
--   Todos los proyectos con estancia en cualquier estado; la app decide cuáles
--   son «anteriores».
SELECT DISTINCT p.*
FROM project p
JOIN project_member m ON m.project_id = p._id
WHERE m.user_id = $1::uuid;
