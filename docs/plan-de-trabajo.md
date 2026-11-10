# Plan de trabajo: recrear Imker en Pollink

Pollink recrea en React Native el alcance de **Imker** (la app Flutter de
`design-thinking/app`): descubrir proyectos, postularse, invitar, colaborar en
tareas y ver indicadores de confianza. La base técnica es la de r_market: DI,
cliente de Roble, autenticación con invitado, navegación, theme y pruebas.

Todo se escribe según [CONVENTIONS.md](../CONVENTIONS.md).

## 1. Fuentes

| Qué | Dónde (en `design-thinking/app`) |
|---|---|
| Qué hace cada feature | `CODEBASE_INDEX.md` |
| Requisitos con criterios de aceptación | `plan-finalizacion-imker/03-requisitos.md` |
| Filtros de Descubrir | `plan-finalizacion-imker/04-especificacion-filtros.md` |
| Indicadores de confianza (fórmulas, casos borde, textos) | `plan-finalizacion-imker/05-especificacion-confianza.md` |
| Modelo de datos y reglas de los contadores | `plan-finalizacion-imker/anexos/A1-modelo-de-datos.md` |
| Notas de Roble | `plan-finalizacion-imker/anexos/A2-notas-roble.md` |
| Consultas guardadas | `../docs/db/saved_queries.sql` |
| Diagrama de clases de la base | `../docs/db/class_diagram.puml` |
| Comportamiento esperado, caso por caso | `test/features/<feature>/` (las pruebas de Imker) |

Las pruebas de Imker sirven como especificación. Cada feature de Pollink recrea
las pruebas de su contraparte, como mínimo las de repositorio y view model.

## 2. Mapa de features

Imker tiene todo lo de proyectos en un solo `features/projects` (7 300 líneas y
un repositorio con 30 métodos). En Pollink se parte en cuatro features, para que
dos personas no editen el mismo archivo y se cumpla la regla de «un repositorio
por feature».

| Feature en Pollink | Viene de (Imker) | Tablas de Roble | Responsable |
|---|---|---|---|
| `auth` | `features/auth` (ya existe en la base de r_market: se adapta) | `user_system` | **A** |
| `home` (navegación) | `features/home` (splash + pestañas) | — | **A** |
| `discover` | `features/discover` + guardar proyecto | `project`, `project_saved` | **A** |
| `requests` | solicitudes de `features/projects` | `project_join_request` | **A** |
| `profile` | `features/profile` + `PersonProfilePage` + `PeopleDirectory` | `profile` | **B** |
| `trust` | `features/trust` + sus pantallas en perfil | (consultas guardadas) | **B** |
| `projects` | proyectos de `features/projects` | `project` | **C** |
| `invitations` | invitaciones de `features/projects` | `project_invitation` | **C** |
| `members` | miembros y estancias de `features/projects` | `project_member` | **D** |
| `tasks` | `features/tasks` | `task`, `contribution` | **D** |

Cuando un flujo toca dos features (por ejemplo, aceptar una solicitud agrega un
miembro), el **view model** inyecta los dos repositorios y los orquesta. Un
repositorio nunca llama a otro.

## 3. Reparto

### Persona A · Plataforma, acceso, Descubrir y solicitudes

Abre el camino para los demás: su Fase 0 bloquea a todo el equipo.

| # | Tarea | Imker de referencia | Tam. |
|---|---|---|---|
| A1 | **Limpiar la base**: borrar las features de r_market (`listings`, `vehicles`, `qa`, `chat`, `profiles`, sus pruebas, `dummyData` y `assets/cars`), renombrar a Pollink (`package.json`, `app.json`), crear `.gitignore`, `.env.example` y `.roble.mcp.env.example` | — | M |
| A2 | **Esquema**: pasar las tablas de Imker a `roble.schema.desired.json` y las consultas guardadas a `roble_queries/*.sql`; verificar contra el proyecto de Roble de Pollink con `npm run smoke` | `docs/db/` | M |
| A3 | **Navegación**: migrar a `@react-navigation/stack`; pestañas Descubrir · Proyectos · Perfil con pantallas vacías; persistencia del estado de navegación | `home/`, `routes/` | M |
| A4 | **Auth**: adaptar login, registro, invitado y guardar cuenta; quitar lo que era de carros; aviso de «necesitas cuenta» para invitados | `auth/` | M |
| A5 | **Descubrir**: feed paginado con `proyectos_filtrados`, tarjeta de proyecto, guardar/quitar de guardados | `discover/` | L |
| A6 | **Filtros**: carrera, habilidad y «solo abiertos», con `normalizeLabel`; hoja de filtros, chips y estado sin resultados | `discover/domain/project_filter*`, spec 04 | L |
| A7 | **Postularse**: diálogo de confirmación y pantalla de «solicitud enviada» | `confirm_application_dialog`, `collaboration_done_page` | S |
| A8 | **Solicitudes** (del creador): lista con «Compromiso N %», ficha del aplicante, aceptar/rechazar y pantalla de resultado | `collaboration_requests_*`, `applicant_detail_page`, `request_decision_result_page` | L |

Depende de: `Project` (C) para A5; `ProfileView` y el widget de indicadores (B)
para A8; `MembersRepository.addMember` (D) para aceptar una solicitud.

### Persona B · Perfil y confianza

| # | Tarea | Imker de referencia | Tam. |
|---|---|---|---|
| B1 | **Perfil (datos)**: entidad, datasource y repositorio de `profile` (`career` como `{program, institution}`, `skills` jsonb); crear la fila propia al entrar | `profile/data`, `profile/domain` | M |
| B2 | **Perfil propio**: pestaña Perfil (`ProfileView`), editar perfil, ajustes y cerrar sesión, tarjeta «Completa tu perfil» | `profile_page`, `edit_profile_page`, `settings_page`, `profile_view` | L |
| B3 | **Onboarding**: primeros datos tras registrarse o guardar la cuenta (se puede omitir) | `onboarding_page` | S |
| B4 | **Directorio de personas**: caché de nombres por sesión, usada por miembros, invitaciones y tareas | `people_directory`, `user_name_cache` | S |
| B5 | **Confianza (lógica)**: `TrustMetrics.calculate` como función pura (nulos, promedio de los que tienen datos), repositorio con `metricas_compromiso_por_proyecto` y `entregas_a_tiempo` | `trust/`, spec 05 | M |
| B6 | **Confianza (UI)**: widget de indicadores, pantalla de indicadores con la explicación de cada uno, estados de carga, error y reintento | `trust_indicators*`, spec 05 §6 | M |
| B7 | **Perfil de otra persona**: solo lectura; «en qué anda» y el historial de colaboración (`proyectos_de_usuario`) | `person_profile_page`, `collaboration_history_page` | M |

Depende de: `getProjectsOfPerson` (C) para B7. Publica `ProfileView`, el widget
de indicadores y `PeopleDirectory`, que usan A, C y D.

### Persona C · Proyectos e invitaciones

| # | Tarea | Imker de referencia | Tam. |
|---|---|---|---|
| C1 | **Proyectos (datos)**: entidad `Project` (con `memberCount`, `status`, `progress`, `jobs`, `skills`), datasource y repositorio | `projects/domain/models/project*`, `roble_project_data_source` | L |
| C2 | **Crear proyecto**: formulario con carreras, habilidades e invitados por correo; validar **todos** los correos con `usuario_por_correo` antes de escribir, y deshacer si falla | `create_project` | L |
| C3 | **Mis proyectos**: pestaña Proyectos con «Creados por mí» y «Colaborando», y el aviso para invitados | `projects_page`, `co_created_projects_page`, `other_projects_page`, `user_projects_controller` | L |
| C4 | **Detalle y ficha del proyecto**: detalle público, ficha con las pestañas Progreso e Info. básica, edición de la info básica | `project_detail_page`, `project_info_page`, `project_basic_info_*`, `project_progress_tab` | L |
| C5 | **Cerrar proyecto**: menú ⋮ del creador, cierre irreversible y aviso de proyecto cerrado | `closed_project_banner`, `project_status_label` | S |
| C6 | **Invitaciones**: listar las pendientes, aceptar/rechazar, «Te invitó X ›»; no listar las de proyectos cerrados | `invitations_controller`, `inviter_row` | M |

C1 es la **primera entrega de todo el equipo después de la Fase 0**: la entidad
`Project` y la interfaz `ProjectRepository` desbloquean a A, B y D. Depende de
`MembersRepository` (D) para crear el miembro creador y aceptar invitaciones.

### Persona D · Miembros y tareas

| # | Tarea | Imker de referencia | Tam. |
|---|---|---|---|
| D1 | **Miembros (datos)**: entidad de estancia (`active` / `left` / `removed`; cada estancia es una fila nueva), agregar sin duplicar el miembro activo, roles | `project_member`, `member_stay`, `membership_rules_test` | M |
| D2 | **Pestaña Miembros**: lista de activos con nombre y carrera; abrir su perfil (B7) | `project_members_tab`, `project_members_controller`, `member_labels` | M |
| D3 | **Salir y quitar**: salir (no el creador) y quitar a un colaborador (solo el creador); libera las tareas sin terminar | `member_exit`, `leave_and_remove_test` | M |
| D4 | **Tareas (datos)**: entidad, datasource y repositorio de `task`; `Clock` inyectable; recalcular `progress` y `total_tasks`; contadores `tasks_taken` / `tasks_finished` | `tasks/data`, `tasks/domain`, A1 «Valores derivados» | L |
| D5 | **Tablero**: columnas todo/doing/done, crear tarea con fecha límite opcional, reservar sin pisar a quien se adelantó | `task_board_page`, `new_task_dialog`, `task_card` | L |
| D6 | **Progreso de una tarea**: descripción, checklist (completarlo la termina), editar la fecha límite, señal de vencida, `finished_at` | `task_progress_page`, `checklist_editor` | M |
| D7 | **Comentarios** de una tarea (`contribution`, planos) | `task_comments_view` | S |

D1 es la **segunda entrega temprana**: `MembersRepository` lo usan A (aceptar
una solicitud) y C (crear proyecto, aceptar invitación). Los contadores de D4
alimentan los indicadores de B5. Esa regla se acuerda entre B y D antes de
escribir código.

## 4. Fases

```
        Fase 0        Fase 1                     Fase 2           Fase 3
        (A + todos)   (cada quien su feature)    (flujos)         (cierre)
A  ──── A1 A2 A3 ──── A4 → A5 → A6 → A7 ────────── A8 ─────────── QA
B  ──── contratos ─── B1 → B4 → B2 → B3 → B5 ───── B6 → B7 ────── QA
C  ──── contratos ─── C1 → C2 → C3 → C4 ────────── C5 → C6 ────── QA
D  ──── contratos ─── D1 → D4 → D5 → D6 ────────── D2 → D3 → D7 ─ QA
```

**Fase 0 · Base y contratos.** A hace A1–A3. En paralelo, cada persona abre un PR
**solo con su `domain/`**: entidades, interfaces de repositorio, su `Failure` y
sus `TOKENS`. Se revisa entre todos y se fusiona antes de seguir. Desde ahí cada
quien programa contra las interfaces de los demás con falsos (`fake<X>()`), sin
esperar a que estén implementadas.

**Fase 1 · Features aisladas.** Datos, view models y pantallas de cada feature,
con sus pruebas unitarias. Hito: cada pestaña funciona por separado contra
Roble.

**Fase 2 · Flujos entre features.** Postularse → aceptar → aparecer en Miembros
→ reservar tarea → terminarla → ver cambiar los indicadores. Hito: el flujo
completo con dos cuentas reales.

**Fase 3 · Cierre.** Congelar funciones, QA manual con dos cuentas y un
invitado, y corregir lo que aparezca. Cada quien prueba el flujo de **otro**.

## 5. Contratos que hay que acordar en la Fase 0

| Contrato | Lo publica | Lo usan |
|---|---|---|
| `Project` y `ProjectRepository` | C | A, B, D |
| `MembersRepository` (`addMember`, `activeMemberIds`, `leave`, `remove`) | D | A, C |
| `TaskRepository.releaseUnfinishedTasks` | D | D3 (y C si cerrar un proyecto lo necesita) |
| `ProfileView`, widget de indicadores, `PeopleDirectory` | B | A, C, D |
| `JoinRequestRepository` (`create`, `cancelPending`) | A | C (aceptar una invitación cancela la solicitud pendiente) |
| `useSession()`: quién está dentro y si es invitado | A | todos |
| Contadores de `project` y `project_member` | D | B |

## 6. Reglas de trabajo

- Una rama y un PR por tarea (`feat/a5-discover-feed`), contra `dev`. `main`
  solo recibe versiones.
- Cada PR pasa `npm run typecheck`, `npm run lint` y `npm run test:ci`, y lo
  revisa alguien de **otro** carril.
- No se edita el código de la feature de otra persona sin avisarle. Si hace
  falta un cambio en su interfaz, se le pide en su carril.
- Los cambios de esquema y de consultas guardadas los fusiona A (dueño de
  `roble.schema.desired.json`), aunque los proponga otra persona.
- Tamaños: **S** ≈ medio día, **M** ≈ 1–2 días, **L** ≈ 3–4 días de una persona.

## 7. Decisiones

- **Notificaciones**: Imker las dejó fuera de alcance; la base de r_market las
  tiene funcionando en Roble. Se considera fuera de alcance en Pollink también.
- **Imágenes** de proyecto y perfil: fuera de alcance en Imker. Se asume lo
  mismo.
- **Quién ve los indicadores de otra persona**: Imker los muestra al creador que
  revisa una solicitud y entre miembros (su Q-06). Se asume lo mismo.
