// Comentario de una tarea: una fila de `contribution`. Es plano: la tabla no
// guarda respuestas ni votos.
export interface TaskComment {
  id: string;
  userId: string;
  body: string;
  createdAt: Date | null;
}
