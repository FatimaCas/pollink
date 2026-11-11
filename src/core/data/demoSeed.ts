import { Container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { AuthRepository } from "@/src/features/auth/domain/repositories/AuthRepository";
import { DiscoverRepository } from "@/src/features/discover/domain/repositories/DiscoverRepository";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { ProfileRepository } from "@/src/features/profile/domain/repositories/ProfileRepository";
import { ProjectRepository } from "@/src/features/projects/domain/repositories/ProjectRepository";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";
import { DummyData } from "./dummyData";

// Datos de demostración para `EXPO_PUBLIC_DATA_SOURCE=local`. Se siembran con
// los repositorios (no con filas a mano) para que formatos y contadores salgan
// como en producción.

type Person = { name: string; email: string; program: string; bio: string; skills: string[] };

// Ana, Beto y Carla ya existen en `DummyData`; solo se completa su perfil.
const PEOPLE: Record<string, Person> = {
  ana: { name: "Ana Torres", email: DummyData.demoEmail, program: "Ingeniería de Sistemas", bio: "Programo apps y colecciono grabaciones de pregones. Busco gente rara y buena.", skills: ["React Native", "Python", "Cartografía sonora"] },
  beto: { name: "Beto Ramirez", email: "beto@demo.com", program: "Antropología", bio: "Entrevisto a los que nadie entrevista: vendedores, porteros, pescadores.", skills: ["Entrevista", "Transcripción", "Etnografía"] },
  carla: { name: "Carla Mendez", email: "carla@demo.com", program: "Gastronomía", bio: "Fritos, sancochos y recetas que no están en ningún libro.", skills: ["Cocina caribe", "Fotografía", "Escritura"] },
  ifeoma: { name: "Ifeoma Zuluaga Petrova", email: "ifeoma@demo.com", program: "Ingeniería Acústica", bio: "Grabo el sonido de las ciudades a las 4 a. m. y lo convierto en mapas.", skills: ["Grabación de campo", "Python", "Arduino"] },
  teo: { name: "Teodoro «Teo» Mbappé Restrepo", email: "teo@demo.com", program: "Biología Marina", bio: "Cuento manatíes con drones. Pregúntame por el Canal del Dique.", skills: ["Drones", "R", "Buceo científico"] },
  xio: { name: "Xiomara Kwon Arrieta", email: "xiomara@demo.com", program: "Diseño Industrial", bio: "Hago muebles con redes de pesca recicladas.", skills: ["Fabricación digital", "Figma", "Cerámica"] },
  anselmo: { name: "Anselmo Quintero Vidal", email: "anselmo@demo.com", program: "Música", bio: "Acordeonista de día, productor de champeta de noche.", skills: ["Acordeón", "Ableton", "Composición"] },
  dayana: { name: "Dayana Phuong Cervantes", email: "dayana@demo.com", program: "Medicina", bio: "Futura médica con alma de botánica: mi abuela curaba con matas.", skills: ["Botánica", "Investigación clínica", "Fotografía"] },
  cristobal: { name: "Cristóbal Eljach Sánchez-Montes", email: "cristobal@demo.com", program: "Derecho", bio: "Derechos de quienes trabajan en la calle, en lenguaje que se entienda.", skills: ["Derecho laboral", "Redacción", "Mediación"] },
  matilde: { name: "Matilde Abushihab Gómez", email: "matilde@demo.com", program: "Arquitectura", bio: "Techos verdes, terrazas y todo lo que crece donde no debería.", skills: ["AutoCAD", "Hidroponía", "Maquetas"] },
};

type Task = {
  title: string;
  description?: string;
  // Días respecto de hoy (negativo = vencida); sin valor, sin fecha límite.
  days?: number;
  // Quién la reserva. Sin `by`, queda pendiente.
  by?: string;
  // Pasos del checklist: con `done` todos marcados, la tarea queda terminada.
  done?: string[];
  open?: string[];
  comments?: [string, string][];
};

type Seed = {
  owner: string;
  title: string;
  description: string;
  jobs: string[];
  skills: string[];
  team?: string[];
  pending?: string[];
  invite?: string[];
  tasks?: Task[];
  close?: boolean;
  savedBy?: string[];
};

const PROJECTS: Seed[] = [
  {
    owner: "ana",
    title: "Atlas sonoro de los pregoneros de Barranquilla",
    description: "Grabar, transcribir y mapear los pregones de vendedores ambulantes antes de que desaparezcan: «¡Bollo e' yuca, bollo limpio!». Cada pregón queda geolocalizado con su hora y su vendedor.",
    jobs: ["Ingeniería Acústica", "Antropología", "Ingeniería de Sistemas"],
    skills: ["Grabación de campo", "React Native", "Transcripción", "Cartografía sonora"],
    team: ["ifeoma", "beto"],
    pending: ["anselmo", "teo"],
    tasks: [
      { title: "Grabar pregones en el mercado de Barranquillita", description: "Ir a las 5 a. m., antes del ruido de los camiones.", days: -2, by: "ifeoma", done: ["Cargar baterías", "Grabar 20 min por puesto", "Subir a la nube"], comments: [["ana", "Quedó limpio, ni un camión. ¡Gracias, Ifeoma!"]] },
      { title: "Transcribir los 37 pregones del Prado", description: "Con ortografía costeña: «e'», «pa'», «ajá».", days: 3, by: "beto", done: ["Pregones 1–12"], open: ["Pregones 13–25", "Pregones 26–37"], comments: [["beto", "El del bollo limpio tiene tres variantes, ¿las cuento como una?"], ["ana", "Cuéntalas aparte, la entonación cambia el sentido."]] },
      { title: "Diseñar el ícono del vendedor de raspao", days: 6 },
      { title: "Pedir permiso a la Alcaldía para grabar en el Paseo Bolívar", by: "ana" },
      { title: "Calibrar el micrófono binaural", description: "Comparar contra la grabadora Zoom H5.", days: 10 },
      { title: "Entrevistar a don Efraín, pregonero desde 1974", days: 14 },
    ],
    savedBy: ["xio"],
  },
  {
    owner: "ana",
    title: "Bancas que suenan cuando alguien se sienta",
    description: "Mobiliario urbano con piezos que toca una nota distinta por persona. Prototipo para el parque Washington.",
    jobs: ["Diseño Industrial", "Ingeniería Electrónica", "Música"],
    skills: ["Arduino", "Fabricación digital"],
    team: ["xio", "anselmo"],
    pending: ["ifeoma"],
    tasks: [
      { title: "Afinar las siete notas de la escala", by: "anselmo", done: ["Elegir escala pentatónica", "Probar con piezos"], days: -5 },
      { title: "Cortar el prototipo en madera", by: "xio", days: 4, done: ["Planos"], open: ["Corte CNC", "Lijado"] },
      { title: "Conseguir permiso del parque Washington", days: 9 },
    ],
  },
  {
    owner: "teo",
    title: "Censo de manatíes con drones en el Canal del Dique",
    description: "Vuelos al amanecer, conteo con visión por computador y un tablero público para la CRA. Necesitamos manos para etiquetar 40 000 fotos.",
    jobs: ["Biología Marina", "Ingeniería de Sistemas", "Ingeniería Ambiental"],
    skills: ["Drones", "Visión por computador", "Python"],
    team: ["ana", "ifeoma", "dayana"],
    tasks: [
      { title: "Primer vuelo de reconocimiento", days: -10, by: "teo", done: ["Revisar clima", "Volar 3 tramos"] },
      { title: "Etiquetar las primeras 5 000 fotos", days: -1, by: "ana", done: ["Instalar la herramienta"], open: ["Lote 1", "Lote 2"], comments: [["ana", "Voy por el lote 1. Los manatíes se parecen a las boyas, ojo."]] },
      { title: "Entrenar el modelo de conteo", by: "ifeoma", days: 12 },
      { title: "Revisar la salud de los ejemplares fotografiados", days: 20 },
    ],
  },
  {
    owner: "carla",
    title: "Recetario de la abuela en realidad aumentada",
    description: "Escaneamos las ollas de las abuelas del barrio Abajo y les pegamos sus recetas en AR.",
    jobs: ["Diseño Gráfico", "Gastronomía"],
    skills: ["Unity", "Fotogrametría"],
    team: ["beto"],
    tasks: [
      { title: "Escanear la olla de doña Mireya", days: 7 },
      { title: "Transcribir la receta del arroz de lisa" },
    ],
    savedBy: ["ana"],
  },
  {
    owner: "xio",
    title: "Sillas tejidas con redes de pesca de Puerto Colombia",
    description: "Recogemos redes abandonadas con los pescadores y las tejemos sobre marcos de acero reciclado.",
    jobs: ["Diseño Industrial", "Administración"],
    skills: ["Cerámica", "Tejido", "Soldadura"],
    team: ["matilde"],
    invite: ["ana"],
    tasks: [{ title: "Recolectar redes con los pescadores", days: 5, by: "matilde" }],
  },
  {
    owner: "dayana",
    title: "Herbario digital de plantas medicinales del mercado de Bazurto",
    description: "Fotografiar, identificar y catalogar las matas que venden las yerbateras, con sus usos y sus advertencias.",
    jobs: ["Medicina", "Biología Marina", "Ingeniería de Sistemas"],
    skills: ["Botánica", "Fotografía", "Bases de datos"],
    team: ["carla", "cristobal"],
    pending: ["ana"],
    tasks: [
      { title: "Visitar a las yerbateras de la calle 30", days: -3, by: "carla", done: ["Conseguir permiso", "Fotografiar 15 matas"], comments: [["carla", "Doña Rosa me regaló un manojo de ruda. Dice que es para la suerte."]] },
      { title: "Redactar el aviso de uso responsable", days: 8, by: "cristobal", open: ["Borrador"] },
      { title: "Montar la base de datos de especies", days: 15 },
    ],
    savedBy: ["ana"],
  },
  {
    owner: "cristobal",
    title: "Liga de ajedrez para porteros de edificio",
    description: "Torneo nocturno en las porterías de Alto Prado y El Golf. El portero que gana sube de turno.",
    jobs: ["Derecho", "Arquitectura"],
    skills: ["Ajedrez", "Organización de eventos"],
    team: ["matilde"],
    tasks: [
      { title: "Consultar el reglamento con la administración", by: "cristobal", done: ["Pedir cita"], open: ["Redactar"], days: -7 },
      { title: "Conseguir 12 tableros" },
    ],
    savedBy: ["ana", "teo"],
  },
  {
    owner: "anselmo",
    title: "Traductor de señas para la verbena",
    description: "Una app que traduce en vivo las señas básicas a texto, para que las verbenas sean para todos.",
    jobs: ["Música", "Ingeniería de Sistemas"],
    skills: ["Visión por computador", "Lengua de señas"],
    team: ["ana", "ifeoma"],
    tasks: [
      { title: "Recopilar 200 clips de señas", days: 6, by: "ana", done: ["Contactar a la asociación"], open: ["Grabar 100", "Grabar 200"] },
      { title: "Prueba de latencia en una verbena", days: 18 },
    ],
  },
  {
    owner: "carla",
    title: "Mapa de los mejores fritos del Caribe",
    description: "Carimañolas, arepas de huevo, empanadas de cazón: un mapa con quién las hace y a qué hora salen calientes.",
    jobs: ["Gastronomía", "Diseño Gráfico"],
    skills: ["Cartografía", "Fotografía"],
    team: ["beto", "teo"],
    close: true,
    tasks: [
      { title: "Probar y puntuar 30 puestos", days: -20, by: "beto", done: ["Lista", "Visitas"], comments: [["beto", "Las de huevo de Luruaco no tienen rival, discútanme."]] },
      { title: "Subir el mapa", days: -4, by: "teo", done: ["Diseño", "Publicación"] },
      { title: "Escribir las reseñas", days: -10, by: "carla", done: ["Primeras 10", "Siguientes 20"] },
    ],
  },
  {
    owner: "matilde",
    title: "Huerta hidropónica en la terraza de Bienestar",
    description: "Lechugas y albahaca sobre tubos de PVC para la cafetería de Bienestar Universitario.",
    jobs: ["Arquitectura", "Ingeniería Ambiental"],
    skills: ["Hidroponía", "Plomería básica"],
  },
  {
    owner: "cristobal",
    title: "Cartilla de derechos para vendedores ambulantes",
    description: "Qué pueden hacer y qué no cuando llega el espacio público, escrito para leerse de pie en dos minutos.",
    jobs: ["Derecho", "Diseño Gráfico", "Antropología"],
    skills: ["Redacción", "Ilustración"],
    team: ["beto", "anselmo", "xio", "matilde", "dayana"],
    tasks: [
      { title: "Entrevistar a 15 vendedores", days: -6, by: "beto", done: ["Guía de preguntas", "Entrevistas"], comments: [["beto", "Casi todos conocen el decreto pero no el recurso. Eso es lo que falta."]] },
      { title: "Ilustrar las 8 escenas", days: 2, by: "xio", done: ["Bocetos"], open: ["Tinta"] },
      { title: "Revisión jurídica del texto", days: 9, by: "cristobal", done: ["Primera lectura"], open: ["Segunda lectura"] },
      { title: "Imprimir 500 copias", days: 25 },
    ],
  },
  {
    owner: "anselmo",
    title: "Archivo de champeta en casetes",
    description: "Digitalizar los casetes de los picós de Barranquilla antes de que se desmagneticen.",
    jobs: ["Música", "Ingeniería Acústica"],
    skills: ["Digitalización", "Restauración de audio"],
    team: ["ifeoma"],
    close: true,
    tasks: [
      { title: "Digitalizar los 120 casetes", days: -30, by: "ifeoma", done: ["Limpiar cabezales", "Digitalizar"] },
      { title: "Catalogar por picó y año", days: -15, by: "anselmo", done: ["Hoja de cálculo", "Etiquetas"] },
    ],
  },
];

export async function seedDemoData(container: Container): Promise<void> {
  const auth = container.resolve<AuthRepository>(TOKENS.AuthRepo);
  const profiles = container.resolve<ProfileRepository>(TOKENS.ProfileRepo);
  const projects = container.resolve<ProjectRepository>(TOKENS.ProjectRepo);
  const members = container.resolve<MembersRepository>(TOKENS.MembersRepo);
  const requests = container.resolve<JoinRequestRepository>(TOKENS.JoinRequestRepo);
  const invitations = container.resolve<InvitationRepository>(TOKENS.InvitationRepo);
  const tasks = container.resolve<TaskRepository>(TOKENS.TaskRepo);
  const discover = container.resolve<DiscoverRepository>(TOKENS.DiscoverRepo);

  const ids: Record<string, string> = {};
  const as = async (key: string) => {
    await auth.logout();
    const me = await auth.loginWithEmail(PEOPLE[key].email, DummyData.demoPassword);
    ids[key] = me.userId;
    return me.userId;
  };
  const day = (n: number) => new Date(Date.now() + n * 86_400_000);

  for (const [key, p] of Object.entries(PEOPLE)) {
    await auth.logout();
    if (!["ana", "beto", "carla"].includes(key)) await auth.registerWithEmail(p.name, p.email, DummyData.demoPassword);
    await as(key);
    await profiles.ensureMyProfile(p.name);
    await profiles.updateMyProfile({ career: { program: p.program, institution: "Universidad del Norte" }, bio: p.bio, skills: p.skills });
  }

  for (const seed of PROJECTS) {
    await as(seed.owner);
    const project = await projects.createProject({
      draft: { title: seed.title, description: seed.description, jobs: seed.jobs, skills: seed.skills },
      ownerId: ids[seed.owner],
    });
    await members.addMember({ projectId: project.id, userId: ids[seed.owner], role: "owner" });

    for (const who of seed.team ?? []) {
      await as(who);
      const request = await requests.apply({ projectId: project.id, userId: ids[who] });
      await as(seed.owner);
      await requests.decide({ requestId: request.id, accepted: true, reviewerId: ids[seed.owner] });
      await members.addMember({ projectId: project.id, userId: ids[who] });
    }
    for (const who of seed.pending ?? []) {
      await as(who);
      await requests.apply({ projectId: project.id, userId: ids[who] });
    }
    if (seed.invite?.length) {
      await as(seed.owner);
      const found = await invitations.findAccounts(seed.invite.map((k) => PEOPLE[k].email));
      await invitations.invite({ projectId: project.id, invitees: found.found });
    }

    await as(seed.owner);
    const created = [];
    for (const t of seed.tasks ?? []) {
      created.push(
        await tasks.createTask({ projectId: project.id, title: t.title, description: t.description, deadline: t.days === undefined ? null : day(t.days) }),
      );
    }
    for (const [i, t] of (seed.tasks ?? []).entries()) {
      if (!t.by) continue;
      await as(t.by);
      let task = await tasks.reserveTask({ task: created[i], userId: ids[t.by] });
      const subtasks = [...(t.done ?? []).map((title) => ({ title, done: true })), ...(t.open ?? []).map((title) => ({ title, done: false }))];
      if (subtasks.length) task = await tasks.saveTaskProgress({ task, description: task.description, subtasks });
      for (const [who, body] of t.comments ?? []) {
        await as(who);
        await tasks.addComment({ task, userId: ids[who], body });
      }
    }
    await as(seed.owner);
    await tasks.recalculateProgress(project.id);
    if (seed.close) await projects.closeProject(project.id);

    for (const who of seed.savedBy ?? []) {
      await as(who);
      await discover.save({ userId: ids[who], projectId: project.id });
    }
  }

  // La app arranca en Descubrir, sin sesión.
  await auth.logout();
}
