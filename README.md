# CRM Pro 2.0

Sistema CRM completo y production-ready construido con React + Node.js + SQLite. Gestión de contactos, empresas, negocios, tareas, actividades, notas, chat en tiempo real, webhooks, 2FA y mucho más.

![Stack](https://img.shields.io/badge/Frontend-React_18_+_Vite-61dafb?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/Backend-Node.js_+_Express-339933?style=flat-square&logo=node.js)
![Stack](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite)
![Stack](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=flat-square&logo=socket.io)

---

## Módulos y funcionalidades

### Core CRM

| Módulo | Funcionalidades |
|--------|----------------|
| **Contactos** | CRUD completo · búsqueda y filtros avanzados (estado, origen, empresa, responsable, tag) · tags · paginación · exportación CSV · importación CSV · acciones masivas (eliminar, reasignar) · detección y fusión de duplicados · vista detalle con tabs (negocios, actividades, tareas, notas, historial) |
| **Empresas** | CRUD completo · filtros · tags · exportación/importación CSV · acciones masivas · fusión de duplicados · vista detalle con tabs (contactos, negocios, actividades, notas, historial) |
| **Pipeline de Negocios** | Kanban con drag & drop · vista lista con tabla · etapas configurables · filtros avanzados (responsable, tag, valor, fecha cierre) · health score · probabilidad · acciones masivas (eliminar, cambiar etapa) · modo selección en kanban · exportación CSV · vista detalle (actividades, tareas, notas, historial) |
| **Tareas** | Vista lista + Kanban por estado · filtros (estado, prioridad) · prioridades (baja, media, alta, urgente) · fechas límite · indicador de vencidas |
| **Actividades** | Vista lista + Calendario mensual · tipos (llamada, email, reunión, demo, seguimiento, otro) · filtros · vinculación a contacto/empresa/negocio |
| **Notas** | Por contacto, empresa y negocio · permisos de edición por propietario |

### Dashboard

- Métricas en tiempo real: contactos, empresas, negocios activos/ganados, ingresos, pipeline, tareas pendientes/vencidas, actividades del mes
- Gráfico de barras: negocios por mes (creados vs cerrados)
- Gráfico de pie: pipeline por etapa
- Top 5 negocios activos por valor
- Actividades recientes
- Tareas vencidas
- **Exportar PDF** con `window.print()` + CSS de impresión optimizado

### Búsqueda global (`Ctrl+K`)

Busca en tiempo real en: contactos, empresas, negocios, tareas, actividades y **notas** (contenido). Navegación con teclado, highlight de texto.

### Chat en tiempo real

- Conversaciones directas y grupales
- Respuestas a mensajes
- Indicadores de escritura
- Confirmaciones de lectura (doble ✓)
- Notificaciones toast al recibir mensaje
- Badge de no leídos en sidebar

### Notificaciones

- **In-app**: campana en topbar con tareas vencidas y que vencen hoy
- **Browser**: notificaciones del sistema operativo para tareas vencidas (con permiso)
- Chat: toast interactivos con preview del mensaje

---

## Seguridad y autenticación

| Feature | Detalle |
|---------|---------|
| **JWT** | Access token (15 min) + Refresh token (7 días) con rotación automática |
| **2FA / TOTP** | Google Authenticator / Authy · QR code en perfil · activar/desactivar con verificación · flujo de login de 2 pasos |
| **Rate limiting** | Auth: 15 req/15min · API: 500 req/15min · Password reset: 5 req/hora |
| **CORS** | Whitelist explícita por origen en todos los entornos |
| **bcrypt** | 12 rounds para contraseñas |
| **Audit log** | Registro de todas las acciones (crear, editar, eliminar, fusionar) con IP, usuario y diff de cambios |
| **Password reset** | Token de 1 hora, invalidación de todos los refresh tokens al resetear, envío por email (SMTP configurable) |

---

## Integraciones y automatización

### Webhooks outbound

Dispara peticiones HTTP a sistemas externos en 11 eventos:

| Categoría | Eventos |
|-----------|---------|
| Contactos | `contact.created` · `contact.updated` · `contact.deleted` |
| Empresas | `company.created` · `company.updated` · `company.deleted` |
| Negocios | `deal.created` · `deal.updated` · `deal.stage_changed` · `deal.won` · `deal.lost` |
| Tareas | `task.created` · `task.completed` |

- Firma HMAC-SHA256 (secret configurable)
- Log de entregas con status HTTP y errores
- Toggle activo/inactivo por webhook
- Envío de test desde el panel
- Compatible con Zapier, n8n, Make, Slack, etc.

### Email (SMTP)

Configurable con cualquier proveedor (Gmail, Resend, Brevo, Mailgun). En desarrollo hace `console.log` del enlace.

---

## Administración (rol admin)

| Sección | Funcionalidades |
|---------|----------------|
| **Usuarios** | CRUD · activar/desactivar · cambio de rol · reset de contraseña |
| **Pipeline** | Crear/editar/eliminar etapas · colores · probabilidad · orden · activar/desactivar |
| **Webhooks** | CRUD · log de entregas · test · toggle |
| **Audit log** | Historial completo filtrable por entidad, usuario y acción |

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js 18+, Express 4 |
| Base de datos | SQLite via `@libsql/client` |
| Tiempo real | Socket.IO 4 |
| Autenticación | JWT + bcryptjs + otplib (2FA) |
| Email | nodemailer |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Gráficas | Recharts |
| Notificaciones | react-hot-toast + Web Notifications API |

---

## Requisitos previos

- **Node.js** v18 o superior
- **npm** v9 o superior

---

## Instalación

### 1. Clonar e instalar

```bash
git clone https://github.com/TU_USUARIO/CRM-2.0.git
cd CRM-2.0
npm run install:all
```

### 2. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env`:

```env
PORT=3000
DB_PATH=./crm.db

# Genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=tu_secreto_aqui
JWT_REFRESH_SECRET=otro_secreto_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
FRONTEND_URL=http://localhost:5173

# SMTP para emails (dejar vacío para usar console.log en dev)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="CRM Pro <noreply@tudominio.com>"
```

### 3. Cargar datos de ejemplo

```bash
npm run seed
```

Crea la base de datos y carga datos de prueba. Credenciales por defecto:

| Campo | Valor |
|-------|-------|
| Email | `admin@crm.com` |
| Contraseña | `password123` |

### 4. Iniciar en desarrollo

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Backend + frontend en paralelo |
| `npm run dev:backend` | Solo backend (nodemon) |
| `npm run dev:frontend` | Solo frontend (Vite) |
| `npm run seed` | Recrea DB y carga datos de prueba |
| `npm run install:all` | Instala todas las dependencias |
| `cd frontend && npm run build` | Build de producción |

---

## Estructura del proyecto

```
CRM-2.0/
├── backend/
│   ├── db/
│   │   ├── database.js        # Conexión SQLite
│   │   ├── migrations.js      # Esquema + seeds de etapas pipeline
│   │   └── seed.js            # Datos de ejemplo
│   ├── middleware/
│   │   ├── auth.js            # JWT verify + requireAdmin
│   │   ├── rateLimiter.js     # Express rate-limit
│   │   ├── demoGuard.js       # Bloquea mutaciones en modo demo
│   │   └── validate.js        # express-validator wrapper
│   ├── routes/
│   │   ├── auth.js            # Login, register, refresh, 2FA, reset password
│   │   ├── users.js           # CRUD usuarios + /directory
│   │   ├── contacts.js        # CRUD + merge + bulk + import + find-duplicates
│   │   ├── companies.js       # CRUD + merge + bulk + import
│   │   ├── deals.js           # CRUD + bulk + etapas dinámicas
│   │   ├── tasks.js           # CRUD
│   │   ├── activities.js      # CRUD
│   │   ├── notes.js           # CRUD
│   │   ├── chat.js            # REST del chat
│   │   ├── search.js          # Búsqueda global (6 entidades)
│   │   ├── dashboard.js       # Métricas y gráficas
│   │   ├── audit.js           # Audit log
│   │   ├── pipeline.js        # Etapas pipeline CRUD
│   │   ├── totp.js            # 2FA setup/enable/disable/verify
│   │   └── webhooks.js        # Webhook configs + deliveries
│   ├── utils/
│   │   ├── audit.js           # logAudit + diffEntities
│   │   ├── email.js           # nodemailer wrapper
│   │   ├── response.js        # Helpers HTTP response
│   │   └── webhook.js         # Trigger webhooks async
│   └── server.js              # Express + Socket.IO entry point
│
└── frontend/
    └── src/
        ├── api/               # Clientes axios por módulo
        ├── components/
        │   ├── layout/        # AppShell, Sidebar, TopBar, NotificationBell
        │   └── ui/            # Modal, Avatar, GlobalSearch, CsvImportModal, etc.
        ├── context/           # AuthContext, ChatContext
        ├── hooks/
        │   ├── usePipelineStages.js   # Stages dinámicas con cache
        │   └── useTaskNotifications.js
        ├── pages/             # 20+ páginas
        └── utils/             # formatters, export, constants, dealHealth
```

---

## Variables de entorno — referencia

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `PORT` | Puerto del servidor | `3000` |
| `DB_PATH` | Ruta al archivo SQLite | `./crm.db` |
| `JWT_SECRET` | Secreto access tokens | — (requerido) |
| `JWT_REFRESH_SECRET` | Secreto refresh tokens | — (requerido) |
| `JWT_EXPIRES_IN` | Expiración access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración refresh token | `7d` |
| `ALLOWED_ORIGINS` | CORS whitelist (coma separada) | `http://localhost:5173` |
| `FRONTEND_URL` | URL para links en emails | `http://localhost:5173` |
| `SMTP_HOST` | Servidor SMTP | — (vacío = console.log) |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Usuario SMTP | — |
| `SMTP_PASS` | Contraseña SMTP | — |
| `SMTP_FROM` | Dirección remitente | — |

---

## Despliegue en producción

### Build del frontend

```bash
cd frontend && npm run build
```

El servidor Express sirve automáticamente `backend/public/` como archivos estáticos. Copia `frontend/dist/` a `backend/public/`.

### Process manager

```bash
npm install -g pm2
cd backend && pm2 start server.js --name crm-backend
pm2 save && pm2 startup
```

### Variables críticas para producción

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://tudominio.com
FRONTEND_URL=https://tudominio.com
JWT_SECRET=<64 bytes hex aleatorio>
JWT_REFRESH_SECRET=<64 bytes hex aleatorio>
```

---

## Licencia

MIT
