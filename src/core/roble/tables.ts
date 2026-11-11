// Los nombres de las tablas y de las consultas guardadas de Roble, en un solo
// sitio: un typo aquí es un 404, no un error de compilación.
//
// Está completo: refleja `roble.schema.desired.json` y `roble_queries/`. Solo
// se toca cuando cambia el esquema, en el mismo PR que lo cambia.
export const TABLES = {
  profile: "profile",
  project: "project",
  projectSaved: "project_saved",
  projectJoinRequest: "project_join_request",
  projectMember: "project_member",
  projectInvitation: "project_invitation",
  task: "task",
  contribution: "contribution",
  userFollow: "user_follow",
} as const;

// Consultas guardadas (`roble_queries/<nombre>.sql`), para `executeQueryByName`.
export const QUERIES = {
  // $1 = correo. Invitaciones al crear un proyecto.
  userByEmail: "usuario_por_correo",
  // $1 = ids separados por coma. Indicadores de confianza.
  commitmentByProject: "metricas_compromiso_por_proyecto",
  // $1 = ids separados por coma. Indicador «entrega a tiempo».
  onTimeDeliveries: "entregas_a_tiempo",
  // Sin parámetros. Diagnóstico de los contadores de tareas.
  counterDiagnostics: "diagnostico_contadores",
  // $1 = user_id. Historial de colaboración.
  projectsOfUser: "proyectos_de_usuario",
  // $1 carrera, $2 habilidad, $3 solo abiertos, $4 tamaño de página, $5 desplazamiento.
  filteredProjects: "proyectos_filtrados",
  // $1 carrera elegida, $2 solo abiertos. Opciones de la hoja de filtros.
  filterOptions: "opciones_filtros_proyectos",
} as const;
