# Driony

Gestor de equipos, tareas y usuarios con panel de resumen. Construido con Next.js 16 (App Router), React 19, Tailwind CSS 4, Prisma 6 y SQLite.

## Qué incluye

- **Inicio de sesión**: cada persona entra con su correo y su contraseña. La sesión queda guardada 90 días y se renueva sola mientras se use la app.
- **Mis tareas** (`/mis-tareas`): cada persona ve solo lo suyo, agrupado en con retraso, para hoy, esta semana y más adelante. Puede añadir una tarea escribiendo y pulsando Enter, marcarla como hecha con un clic (con opción de deshacer), pulsar «Empezar» o quedarse con tareas sin responsable de su equipo.
- **Resumen** (`/`): titular con el estado del día, indicadores (tareas en curso, vencen hoy, con retraso, completadas este mes), tareas por equipo según estado, ritmo semanal de creadas y completadas, carga por persona, fechas límite y actividad reciente.
- **Todas las tareas** (`/tareas`): tabla y tablero kanban con arrastrar y soltar, casilla para marcar como hecha, filtros por texto, estado, prioridad, equipo y responsable (en la URL), crear, editar y eliminar. El formulario pide solo lo esencial (qué, quién, equipo y cuándo, con botones Hoy, Mañana y En una semana); notas, prioridad y estado están en «Más detalles».
- **Equipos** (`/equipos`, `/equipos/[id]`): tarjetas con avance, detalle con indicadores, gestión de miembros y tareas del equipo, crear, editar y eliminar.
- **Personas** (`/usuarios`): roles, puesto, equipos, carga de trabajo y si la cuenta está activada. Al añadir a alguien le llega un correo para activar su cuenta; el botón del sobre reenvía el acceso.
- **Ajustes** (`/ajustes`): servidor de correo SMTP con botones para Gmail, Outlook y Zoho, y un botón para enviarte un correo de prueba.
- **Mi cuenta** (`/cuenta`): cambiar nombre y contraseña, y cerrar la sesión en otros dispositivos.
- **Copiloto (IA)**: botón «Copiloto» en Mis tareas, Todas las tareas y cada equipo. Escribes lo que hay que hacer y propone tareas con equipo, responsable, prioridad y fecha, o pulsas «Sugerir para Operaciones» (o cualquier equipo) y propone ideas que no repitan lo que ya hay. Nada se crea hasta que revisas, editas y pulsas «Crear». Funciona con Claude (Anthropic) o con ChatGPT (OpenAI): eliges el proveedor y pones la clave en Ajustes.
- **Recorrido guiado**: la primera vez que alguien entra, un recorrido de 1 minuto resalta cada parte de la pantalla según su rol. Se repite con el botón de ayuda (?) de la barra lateral o desde Mi cuenta.
- **Guías paso a paso en Ajustes** para configurar Gmail y conseguir las claves de Anthropic y OpenAI.
- Avisos breves al guardar y un diálogo claro antes de borrar cualquier cosa.
- La actividad registra quién hizo cada cambio.
- Tema claro y oscuro (sigue el sistema, con interruptor manual).

## Permisos

| Rol           | Qué puede hacer                                                          |
| ------------- | ------------------------------------------------------------------------ |
| Miembro       | Solo Mis tareas: crear, completar y editar sus propias tareas            |
| Gestor        | Además Resumen, Todas las tareas y Equipos                                |
| Administrador | Todo, incluido Personas y Ajustes                                        |

La **cuenta master** es el correo de `MASTER_EMAIL` en `.env`. Siempre es administradora y no se puede desactivar ni eliminar.

## Puesta en marcha

```bash
npm install          # instala dependencias y genera el cliente de Prisma
npm run db:push      # crea la base de datos SQLite (prisma/dev.db)
npm run db:seed      # carga datos de ejemplo (12 personas, 4 equipos, 45 tareas)
npm run dev          # abre http://localhost:3000
```

Después abre http://localhost:3000. La primera vez, la pantalla de entrada te lleva a **configurar la cuenta master** (nombre y contraseña). Luego:

1. Ve a **Ajustes** y configura el correo SMTP. Con Gmail necesitas una [contraseña de aplicación](https://myaccount.google.com/apppasswords) (requiere verificación en dos pasos), servidor `smtp.gmail.com`, puerto `465`, SSL.
2. Escribe a quién enviar la prueba en «Enviar la prueba a» y pulsa «Enviar prueba».
3. Opcional: en **Ajustes > Copiloto (IA)** elige Claude o ChatGPT, pega la clave (cada sección explica cómo conseguirla), guarda y pulsa «Probar conexión». Cada uso se cobra en la cuenta de ese proveedor.
4. En **Personas**, pulsa el sobre de cada persona para enviarle su correo de activación. Si el correo aún no está configurado, verás un enlace para copiar y enviárselo por otro medio.

Variables de `.env`:

| Variable       | Para qué sirve                                                   |
| -------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | Archivo SQLite                                                    |
| `AUTH_SECRET`  | Cifra la contraseña SMTP guardada. Si lo cambias, vuelve a escribirla en Ajustes |
| `MASTER_EMAIL` | Correo de la cuenta master                                        |
| `APP_URL`      | Dirección usada en los enlaces de los correos                     |
| `ANTHROPIC_API_KEY` | Opcional. Clave de Anthropic si no se pone en Ajustes (la de Ajustes tiene prioridad) |
| `OPENAI_API_KEY` | Opcional. Clave de OpenAI si no se pone en Ajustes (la de Ajustes tiene prioridad) |

Para volver a empezar con datos limpios (**borra todas las cuentas y contraseñas**):

```bash
npm run db:reset
```

Otros comandos útiles:

| Comando             | Qué hace                                  |
| ------------------- | ----------------------------------------- |
| `npm run build`     | Compila la aplicación para producción     |
| `npm start`         | Sirve la compilación de producción        |
| `npm run typecheck` | Comprueba los tipos con TypeScript        |
| `npm run lint`      | Ejecuta ESLint                            |
| `npm run db:studio` | Abre Prisma Studio para explorar los datos |

La URL de la base de datos se lee de `.env` (`DATABASE_URL="file:./dev.db"`).

## Despliegue con Docker

La imagen arranca la app, crea la base de datos SQLite la primera vez y la guarda en un volumen, así que los datos sobreviven a reinicios y actualizaciones. No carga datos de ejemplo.

1. Copia el proyecto al servidor (sin `node_modules`, `.next` ni `prisma/dev.db`).
2. Crea la configuración:

   ```bash
   cp .env.production.example .env.production
   openssl rand -base64 32   # pega el resultado en AUTH_SECRET
   ```

   Edita `APP_PORT` (puerto del servidor, por defecto 3100) y `APP_URL` (por ejemplo `http://IP-DEL-SERVIDOR:3100`).

3. Arranca:

   ```bash
   docker compose --env-file .env.production up -d --build
   ```

4. Abre `APP_URL`, configura la cuenta master y después el correo en Ajustes.

El puerto 3000 del servidor no se toca: dentro del contenedor la app usa su propio 3000 y Docker lo publica en `APP_PORT`.

| Tarea | Comando |
| --- | --- |
| Ver registros | `docker compose --env-file .env.production logs -f` |
| Actualizar tras cambiar el código | `docker compose --env-file .env.production up -d --build` |
| Parar | `docker compose --env-file .env.production down` |
| Copia de seguridad de la base de datos | `docker compose --env-file .env.production cp driony:/app/data/driony.db ./driony-backup.db` |

No uses `down -v`: borra el volumen y con él todas las cuentas y tareas.

**HTTPS:** si pones delante un proxy con certificado (Nginx, Caddy, Traefik), usa `APP_BIND=127.0.0.1` y `APP_URL=https://tu-dominio`. Con `https` la cookie de sesión pasa a ser segura automáticamente. Con `http` funciona igual, pero sin cifrar.

## Estructura

```
prisma/
  schema.prisma        Modelos: User, Team, TeamMember, Task, Activity
  seed.ts              Datos de ejemplo en español
src/app/(auth)/        Entrar, recuperar, elegir contraseña, primer acceso
src/app/(app)/         Páginas con sesión iniciada
src/proxy.ts           Redirige a /login sin sesión y renueva la cookie
src/components/
  ui/                  Botones, insignias, tarjetas, modal, campos de formulario
  layout/              Barra lateral, avisos y cambio de tema
  auth/ settings/      Formularios de acceso, Ajustes y Mi cuenta
  dashboard/           Gráficos y listas del resumen
  tasks/ teams/ users/ Formularios, tablas y tablero
src/lib/
  queries.ts           Lectura de datos para las páginas
  actions/             Server Actions (crear, editar, eliminar, acceso, ajustes)
  auth/                Contraseñas, sesiones, enlaces y roles
  email.ts             Envío de correos y plantillas
  ai.ts                Copiloto: llamadas a Anthropic u OpenAI y formato de las propuestas
  validation.ts        Esquemas zod
  constants.ts         Estados, prioridades, roles y colores
```

## Modelo de datos

- Una **tarea** pertenece a un equipo y puede tener una persona responsable, prioridad (baja, media, alta, urgente), estado (pendiente, en progreso, en revisión, completada) y fecha límite.
- Un **equipo** tiene miembros, una persona responsable opcional y un color de identidad.
- Un **usuario** tiene rol, puesto, estado activo o inactivo y puede pertenecer a varios equipos.
- Cada cambio relevante queda registrado en **actividad**, que alimenta el resumen.

Seguridad: las contraseñas se guardan con scrypt, las sesiones y los enlaces de los correos se guardan como hash, los enlaces son de un solo uso (72 horas para activar, 2 horas para cambiar contraseña) y hay límite de intentos al entrar. Si publicas la app en internet, usa HTTPS.
