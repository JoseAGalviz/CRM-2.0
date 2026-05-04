# CRM Pro 2.0

Sistema CRM completo desarrollado con React + Node.js. Gestión de contactos, empresas, negocios, tareas, actividades, notas y chat en tiempo real.

![Stack](https://img.shields.io/badge/Frontend-React_+_Vite-61dafb?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/Backend-Node.js_+_Express-339933?style=flat-square&logo=node.js)
![Stack](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite)
![Stack](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=flat-square&logo=socket.io)

---

## Características

- **Dashboard** — Métricas en tiempo real, gráficos de negocios por mes y por etapa
- **Contactos** — CRUD completo con búsqueda, paginación y exportación a CSV
- **Empresas** — Gestión con historial de negocios y contactos asociados
- **Pipeline de Negocios** — Kanban con drag & drop, health score y probabilidad de cierre
- **Tareas** — Filtros por estado/prioridad, notificaciones del navegador para vencimientos
- **Actividades** — Registro de llamadas, reuniones, emails y más
- **Notas** — Notas vinculadas a contactos y negocios
- **Chat en tiempo real** — Mensajes directos y grupales, respuestas, indicadores de escritura, confirmaciones de lectura, notificaciones toast
- **Búsqueda global** — Busca contactos, empresas y negocios desde cualquier página (`Ctrl+K`)
- **Exportación CSV** — Descarga de datos en formato compatible con Excel (UTF-8 BOM)
- **100% responsive** — Funciona en móvil, tablet y desktop

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express.js |
| Base de datos | SQLite (via `better-sqlite3`) |
| Tiempo real | Socket.IO |
| Autenticación | JWT (access 15min + refresh 7d) |
| UI extras | Recharts, dnd-kit, react-hot-toast |

---

## Requisitos previos

- **Node.js** v18 o superior — [descargar](https://nodejs.org)
- **npm** v9 o superior (incluido con Node.js)
- **Git** — [descargar](https://git-scm.com)

---

## Instalación y puesta en marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/CRM-2.0.git
cd CRM-2.0
```

### 2. Instalar dependencias

```bash
npm run install:all
```

Instala las dependencias del backend y del frontend en un solo comando.

### 3. Configurar variables de entorno del backend

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y completa los valores:

```env
PORT=3000
DB_PATH=./crm.db
JWT_SECRET=cambia_esto_por_una_cadena_aleatoria_larga
JWT_REFRESH_SECRET=cambia_esto_por_otra_cadena_aleatoria_larga
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

> **Importante:** Genera secretos seguros con:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 4. Crear la base de datos y cargar datos de ejemplo

```bash
npm run seed
```

Crea el archivo `crm.db`, ejecuta las migraciones y carga datos de ejemplo incluyendo un usuario administrador:

| Campo | Valor |
|---|---|
| Email | `admin@crm.com` |
| Contraseña | `password123` |

### 5. Iniciar en modo desarrollo

```bash
npm run dev
```

Arranca backend (puerto 3000) y frontend (puerto 5173) en paralelo.

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api

---

## Acceso desde otros dispositivos en la red local

El backend acepta conexiones desde cualquier IP privada (192.168.x.x, 10.x.x.x, etc.) sin configuración adicional.

Para acceder desde un móvil u otro dispositivo:

1. Obtén la IP local de tu computadora:
   ```bash
   # Linux/macOS
   ip addr | grep "192.168"
   # Windows
   ipconfig
   ```

2. En el dispositivo remoto abre: `http://TU_IP_LOCAL:5173`

---

## Scripts disponibles

### Raíz del proyecto

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia backend + frontend en desarrollo |
| `npm run dev:backend` | Solo el backend con nodemon |
| `npm run dev:frontend` | Solo el frontend con Vite |
| `npm run seed` | Recrea la base de datos y carga datos de prueba |
| `npm run install:all` | Instala dependencias de backend y frontend |

### Desde `frontend/`

| Comando | Descripción |
|---|---|
| `npm run build` | Compila el frontend para producción |
| `npm run preview` | Previsualiza el build de producción |

---

## Estructura del proyecto

```
CRM-2.0/
├── backend/
│   ├── db/
│   │   ├── database.js       # Conexión SQLite
│   │   ├── migrations.js     # Esquema de tablas
│   │   └── seed.js           # Datos de ejemplo
│   ├── middleware/
│   │   └── auth.js           # Verificación JWT
│   ├── routes/
│   │   ├── auth.js
│   │   ├── contacts.js
│   │   ├── companies.js
│   │   ├── deals.js
│   │   ├── tasks.js
│   │   ├── activities.js
│   │   ├── notes.js
│   │   ├── chat.js
│   │   ├── search.js
│   │   └── users.js
│   ├── utils/
│   ├── server.js             # Entry point + Socket.IO
│   └── .env                  # Variables de entorno (NO subir a git)
│
└── frontend/
    ├── src/
    │   ├── api/              # Clientes HTTP (axios)
    │   ├── components/       # Componentes reutilizables
    │   ├── context/          # Auth y Chat context
    │   ├── hooks/            # Custom hooks
    │   ├── pages/            # Vistas principales
    │   └── utils/            # Helpers (formatters, export, etc.)
    ├── index.html
    └── vite.config.js
```

---

## Variables de entorno — referencia completa

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor Express | `3000` |
| `DB_PATH` | Ruta al archivo SQLite | `./crm.db` |
| `JWT_SECRET` | Secreto para firmar access tokens | cadena hex de 64 bytes |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens | cadena hex de 64 bytes |
| `JWT_EXPIRES_IN` | Expiración del access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración del refresh token | `7d` |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS | `http://localhost:5173` |

---

## Subir a GitHub

### Primera vez (repositorio nuevo)

```bash
# Dentro de la carpeta del proyecto
git init
git add .
git commit -m "feat: initial commit - CRM Pro 2.0"

# Crea el repositorio en GitHub (github.com → New repository), luego:
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

### Actualizaciones posteriores

```bash
git add .
git commit -m "descripción del cambio"
git push
```

### Archivos que NO se suben (ya en .gitignore)

| Archivo | Motivo |
|---|---|
| `backend/.env` | Contiene secretos JWT |
| `backend/crm.db` | Base de datos local con datos reales |
| `node_modules/` | Se regenera con `npm install` |
| `dist/` | Se regenera con `npm run build` |

> Crea el archivo plantilla antes de subir al repo:
> ```bash
> cp backend/.env backend/.env.example
> # Luego abre .env.example y borra los valores secretos (deja solo las claves vacías)
> ```

---

## Despliegue en producción (básico)

1. Compila el frontend:
   ```bash
   cd frontend && npm run build
   ```

2. Configura Nginx o Express para servir `frontend/dist/` como archivos estáticos.

3. En el servidor, usa un process manager:
   ```bash
   npm install -g pm2
   cd backend && pm2 start server.js --name crm-backend
   pm2 save
   pm2 startup
   ```

4. Ajusta `ALLOWED_ORIGINS` en `.env` con el dominio real de tu frontend.

---

## Licencia

MIT
