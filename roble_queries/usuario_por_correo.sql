-- Consulta guardada `usuario_por_correo`. Se crea en Roble con este SQL y la app la llama
-- por nombre con `executeQueryByName`. Viene de Imker (docs/db/saved_queries.sql).
--
-- usuario_por_correo ($1 = correo)
--   Usada por: invitaciones al crear un proyecto.
SELECT user_id, email FROM user_system WHERE lower(email) = lower($1);
