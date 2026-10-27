import { PrismaClient } from "@prisma/client";
import { addDays, setHours, startOfDay } from "date-fns";

const prisma = new PrismaClient();

const today = startOfDay(new Date());
const at = (offsetDays: number, hour = 10) => setHours(addDays(today, offsetDays), hour);

type UserKey =
  | "valeria"
  | "mateo"
  | "camila"
  | "diego"
  | "lucia"
  | "andres"
  | "sofia"
  | "javier"
  | "renata"
  | "tomas"
  | "isabela"
  | "nicolas";

type SeedUser = { name: string; email: string; role: string; jobTitle: string; active?: boolean };

const users: Record<UserKey, SeedUser> = {
  valeria: { name: "Valeria Soto", email: "valeria.soto@driony.com", role: "ADMIN", jobTitle: "Directora de operaciones" },
  mateo: { name: "Mateo Rivas", email: "mateo.rivas@driony.com", role: "GESTOR", jobTitle: "Líder de producto" },
  camila: { name: "Camila Herrera", email: "camila.herrera@driony.com", role: "GESTOR", jobTitle: "Líder de ingeniería" },
  diego: { name: "Diego Fuentes", email: "diego.fuentes@driony.com", role: "MIEMBRO", jobTitle: "Desarrollador backend" },
  lucia: { name: "Lucía Navarro", email: "lucia.navarro@driony.com", role: "MIEMBRO", jobTitle: "Desarrolladora frontend" },
  andres: { name: "Andrés Molina", email: "andres.molina@driony.com", role: "MIEMBRO", jobTitle: "Diseñador de producto" },
  sofia: { name: "Sofía Castillo", email: "sofia.castillo@driony.com", role: "GESTOR", jobTitle: "Líder de marketing" },
  javier: { name: "Javier Ortega", email: "javier.ortega@driony.com", role: "MIEMBRO", jobTitle: "Especialista en contenidos" },
  renata: { name: "Renata Vidal", email: "renata.vidal@driony.com", role: "MIEMBRO", jobTitle: "Analista de datos" },
  tomas: { name: "Tomás Aguirre", email: "tomas.aguirre@driony.com", role: "MIEMBRO", jobTitle: "Ingeniero de calidad" },
  isabela: { name: "Isabela Paredes", email: "isabela.paredes@driony.com", role: "MIEMBRO", jobTitle: "Soporte al cliente" },
  nicolas: { name: "Nicolás Bravo", email: "nicolas.bravo@driony.com", role: "MIEMBRO", jobTitle: "Técnico de operaciones", active: false },
};

type TeamKey = "producto" | "ingenieria" | "marketing" | "operaciones";

type SeedTeam = { name: string; description: string; colorSlot: number; lead: UserKey; members: UserKey[] };

const teams: Record<TeamKey, SeedTeam> = {
  producto: {
    name: "Producto",
    description: "Define qué construimos y por qué. Investigación, diseño y priorización.",
    colorSlot: 1,
    lead: "mateo",
    members: ["mateo", "andres", "renata", "lucia"],
  },
  ingenieria: {
    name: "Ingeniería",
    description: "Construye y mantiene la plataforma, la infraestructura y la calidad.",
    colorSlot: 2,
    lead: "camila",
    members: ["camila", "diego", "lucia", "tomas"],
  },
  marketing: {
    name: "Marketing",
    description: "Comunicación, campañas y crecimiento de la base de clientes.",
    colorSlot: 3,
    lead: "sofia",
    members: ["sofia", "javier", "renata"],
  },
  operaciones: {
    name: "Operaciones",
    description: "Personas, finanzas, soporte y todo lo que mantiene la empresa en marcha.",
    colorSlot: 4,
    lead: "valeria",
    members: ["valeria", "isabela", "nicolas", "tomas"],
  },
};

type SeedTask = {
  title: string;
  description?: string;
  team: TeamKey;
  assignee: UserKey | null;
  status: "PENDIENTE" | "EN_PROGRESO" | "EN_REVISION" | "COMPLETADA";
  priority: "BAJA" | "MEDIA" | "ALTA" | "URGENTE";
  /** Días relativos a hoy para la fecha límite (negativo = vencida). */
  due?: number;
  /** Días relativos a hoy en que se completó (solo para COMPLETADA). */
  completed?: number;
};

const tasks: SeedTask[] = [
  // Producto
  { title: "Definir roadmap del cuarto trimestre", description: "Consolidar las iniciativas de cada equipo y acordar el orden con dirección.", team: "producto", assignee: "mateo", status: "EN_PROGRESO", priority: "ALTA", due: 5 },
  { title: "Entrevistas con usuarios de la versión beta", description: "Ocho entrevistas de 30 minutos. Registrar hallazgos en la base de conocimiento.", team: "producto", assignee: "renata", status: "EN_PROGRESO", priority: "MEDIA", due: 2 },
  { title: "Prototipo del nuevo flujo de alta", team: "producto", assignee: "andres", status: "EN_REVISION", priority: "ALTA", due: 0 },
  { title: "Documentar requisitos del módulo de informes", team: "producto", assignee: "mateo", status: "PENDIENTE", priority: "MEDIA", due: 9 },
  { title: "Priorizar el backlog de mejoras", team: "producto", assignee: "mateo", status: "COMPLETADA", priority: "MEDIA", completed: -3 },
  { title: "Análisis de métricas de retención", team: "producto", assignee: "renata", status: "COMPLETADA", priority: "ALTA", completed: -10 },
  { title: "Rediseño de la pantalla de ajustes", team: "producto", assignee: "andres", status: "PENDIENTE", priority: "BAJA", due: 14 },
  { title: "Revisión de accesibilidad del panel", description: "Contraste, foco visible y navegación por teclado en todas las vistas.", team: "producto", assignee: "andres", status: "EN_PROGRESO", priority: "MEDIA", due: -2 },
  { title: "Encuesta de satisfacción trimestral", team: "producto", assignee: "renata", status: "COMPLETADA", priority: "BAJA", completed: -24 },
  { title: "Guía de estilo de componentes", team: "producto", assignee: "andres", status: "COMPLETADA", priority: "MEDIA", completed: -38 },
  { title: "Especificación de notificaciones", team: "producto", assignee: "lucia", status: "PENDIENTE", priority: "MEDIA", due: 6 },
  // Ingeniería
  { title: "Migrar la base de datos a la nueva versión", description: "Ventana de mantenimiento el sábado. Probar la restauración antes.", team: "ingenieria", assignee: "diego", status: "EN_PROGRESO", priority: "URGENTE", due: 1 },
  { title: "Corregir error en el cálculo de totales", description: "Los descuentos acumulados se aplican dos veces en facturas con más de un ítem.", team: "ingenieria", assignee: "diego", status: "EN_REVISION", priority: "URGENTE", due: -1 },
  { title: "Implementar autenticación de dos factores", team: "ingenieria", assignee: "camila", status: "EN_PROGRESO", priority: "ALTA", due: 7 },
  { title: "Pruebas de regresión del módulo de pagos", team: "ingenieria", assignee: "tomas", status: "PENDIENTE", priority: "ALTA", due: 3 },
  { title: "Optimizar tiempos de carga del panel", team: "ingenieria", assignee: "lucia", status: "EN_PROGRESO", priority: "MEDIA", due: 0 },
  { title: "Actualizar dependencias del proyecto", team: "ingenieria", assignee: "diego", status: "COMPLETADA", priority: "BAJA", completed: -6 },
  { title: "Configurar despliegue continuo", team: "ingenieria", assignee: "camila", status: "COMPLETADA", priority: "ALTA", completed: -17 },
  { title: "Revisión de seguridad de la API", team: "ingenieria", assignee: "camila", status: "PENDIENTE", priority: "ALTA", due: 12 },
  { title: "Automatizar copias de seguridad", team: "ingenieria", assignee: "diego", status: "COMPLETADA", priority: "MEDIA", completed: -31 },
  { title: "Escribir pruebas unitarias del servicio de correo", team: "ingenieria", assignee: "tomas", status: "EN_PROGRESO", priority: "MEDIA", due: -4 },
  { title: "Refactorizar componente de tabla", team: "ingenieria", assignee: "lucia", status: "COMPLETADA", priority: "MEDIA", completed: -13 },
  { title: "Monitorización de errores en producción", team: "ingenieria", assignee: "camila", status: "COMPLETADA", priority: "ALTA", completed: -45 },
  { title: "Soporte para exportación a CSV", team: "ingenieria", assignee: "lucia", status: "PENDIENTE", priority: "BAJA", due: 20 },
  { title: "Pruebas de carga del servidor", team: "ingenieria", assignee: "tomas", status: "COMPLETADA", priority: "MEDIA", completed: -52 },
  // Marketing
  { title: "Campaña de lanzamiento de otoño", team: "marketing", assignee: "sofia", status: "EN_PROGRESO", priority: "ALTA", due: 4 },
  { title: "Redactar artículo sobre novedades", team: "marketing", assignee: "javier", status: "EN_REVISION", priority: "MEDIA", due: 0 },
  { title: "Calendario de redes sociales de noviembre", team: "marketing", assignee: "javier", status: "PENDIENTE", priority: "MEDIA", due: 8 },
  { title: "Informe de resultados de la campaña anterior", team: "marketing", assignee: "renata", status: "COMPLETADA", priority: "ALTA", completed: -8 },
  { title: "Actualizar la página de precios", team: "marketing", assignee: "sofia", status: "PENDIENTE", priority: "ALTA", due: 2 },
  { title: "Boletín mensual de octubre", team: "marketing", assignee: "javier", status: "COMPLETADA", priority: "MEDIA", completed: -20 },
  { title: "Estudio de palabras clave", team: "marketing", assignee: "renata", status: "COMPLETADA", priority: "BAJA", completed: -27 },
  { title: "Vídeo demostrativo del producto", team: "marketing", assignee: "javier", status: "EN_PROGRESO", priority: "MEDIA", due: -6 },
  { title: "Webinar con clientes", team: "marketing", assignee: "sofia", status: "COMPLETADA", priority: "ALTA", completed: -41 },
  // Operaciones
  { title: "Renovar contratos con proveedores", team: "operaciones", assignee: "valeria", status: "EN_PROGRESO", priority: "ALTA", due: 10 },
  { title: "Plan de incorporación de nuevos empleados", team: "operaciones", assignee: "isabela", status: "PENDIENTE", priority: "MEDIA", due: 15 },
  { title: "Cierre contable de septiembre", team: "operaciones", assignee: "valeria", status: "COMPLETADA", priority: "URGENTE", completed: -15 },
  { title: "Responder tickets pendientes de soporte", team: "operaciones", assignee: "isabela", status: "EN_PROGRESO", priority: "ALTA", due: 0 },
  { title: "Inventario de equipos informáticos", team: "operaciones", assignee: "nicolas", status: "PENDIENTE", priority: "BAJA", due: -9 },
  { title: "Revisión de la política de vacaciones", team: "operaciones", assignee: "valeria", status: "EN_REVISION", priority: "MEDIA", due: 6 },
  { title: "Actualizar base de conocimientos", team: "operaciones", assignee: "isabela", status: "COMPLETADA", priority: "MEDIA", completed: -2 },
  { title: "Auditoría interna de procesos", team: "operaciones", assignee: "valeria", status: "COMPLETADA", priority: "ALTA", completed: -34 },
  { title: "Formación en herramientas internas", team: "operaciones", assignee: "isabela", status: "COMPLETADA", priority: "BAJA", completed: -49 },
  { title: "Preparar presupuesto del próximo año", team: "operaciones", assignee: "valeria", status: "PENDIENTE", priority: "URGENTE", due: 11 },
  { title: "Encuesta de clima laboral", team: "operaciones", assignee: null, status: "PENDIENTE", priority: "MEDIA", due: 18 },
];

const STATUS_TEXT: Record<SeedTask["status"], string> = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  EN_REVISION: "En revisión",
  COMPLETADA: "Completada",
};

async function main() {
  await prisma.activity.deleteMany();
  await prisma.session.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const userIds = {} as Record<UserKey, string>;
  for (const [key, data] of Object.entries(users) as [UserKey, SeedUser][]) {
    const created = await prisma.user.create({
      data: { ...data, active: data.active ?? true, createdAt: at(-70) },
    });
    userIds[key] = created.id;
  }

  // Master account from .env: admin, no password yet (set it at /primer-acceso).
  const master = (process.env.MASTER_EMAIL ?? "").trim().toLowerCase();
  if (master) {
    await prisma.user.create({
      data: { name: "Administración", email: master, role: "ADMIN", jobTitle: "Cuenta master", createdAt: at(-70) },
    });
  }

  const teamIds = {} as Record<TeamKey, string>;
  for (const [key, data] of Object.entries(teams) as [TeamKey, SeedTeam][]) {
    const created = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        colorSlot: data.colorSlot,
        leadId: userIds[data.lead],
        createdAt: at(-65),
        members: { create: data.members.map((m) => ({ userId: userIds[m], joinedAt: at(-64) })) },
      },
    });
    teamIds[key] = created.id;
    await prisma.activity.create({
      data: {
        type: "EQUIPO_CREADO",
        message: `${users[data.lead].name} creó el equipo ${data.name}`,
        userId: userIds[data.lead],
        createdAt: at(-65, 9),
      },
    });
  }

  let i = 0;
  for (const t of tasks) {
    i += 1;
    const completedAt = t.status === "COMPLETADA" ? at(t.completed ?? -1, 16) : null;
    const createdOffset = completedAt ? (t.completed ?? -1) - 6 - (i % 9) : -1 - (i % 23);
    const createdAt = at(createdOffset, 9 + (i % 7));
    const dueDate =
      t.due !== undefined ? at(t.due, 12) : completedAt ? at((t.completed ?? -1) + 1, 12) : null;
    const leadKey = teams[t.team].lead;

    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description ?? null,
        status: t.status,
        priority: t.priority,
        dueDate,
        completedAt,
        createdAt,
        updatedAt: completedAt ?? createdAt,
        teamId: teamIds[t.team],
        assigneeId: t.assignee ? userIds[t.assignee] : null,
      },
    });

    await prisma.activity.create({
      data: {
        type: "TAREA_CREADA",
        message: `${users[leadKey].name} creó la tarea «${t.title}»`,
        taskId: task.id,
        userId: userIds[leadKey],
        createdAt,
      },
    });

    if (t.assignee) {
      await prisma.activity.create({
        data: {
          type: "TAREA_ASIGNADA",
          message: `${users[leadKey].name} asignó «${t.title}» a ${users[t.assignee].name}`,
          taskId: task.id,
          userId: userIds[leadKey],
          createdAt,
        },
      });
    }

    if (t.status === "EN_PROGRESO" || t.status === "EN_REVISION") {
      const who = t.assignee ?? leadKey;
      await prisma.activity.create({
        data: {
          type: "ESTADO_CAMBIADO",
          message: `${users[who].name} movió «${t.title}» a ${STATUS_TEXT[t.status]}`,
          taskId: task.id,
          userId: userIds[who],
          createdAt: addDays(createdAt, 1),
        },
      });
    }

    if (completedAt) {
      const who = t.assignee ?? leadKey;
      await prisma.activity.create({
        data: {
          type: "TAREA_COMPLETADA",
          message: `${users[who].name} completó «${t.title}»`,
          taskId: task.id,
          userId: userIds[who],
          createdAt: completedAt,
        },
      });
    }
  }

  const counts = {
    usuarios: await prisma.user.count(),
    equipos: await prisma.team.count(),
    tareas: await prisma.task.count(),
    actividades: await prisma.activity.count(),
  };
  console.log("Seed completado:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
