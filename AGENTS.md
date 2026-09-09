# AGENTS.md — Reglas para Asistentes de IA

## Propósito del Proyecto
Sistema POS personalizable para pequeños y medianos negocios. Monorepo con 3 componentes: API PHP, Panel Admin React, Terminal de Caja React PWA.

## Estructura del Monorepo
- `apa001/` → Backend PHP 8.2 puro (sin framework, PDO, patrón MVC manual)
- `ppa001/` → Frontend Panel Admin (React 18 + Vite + TailwindCSS)
- `cpa001/` → Frontend Caja POS (React 18 + Vite + PWA)

## Reglas de Desarrollo

### General
1. **NUNCA hardcodear** nombres de clientes, emails, contraseñas o URLs en el código.
2. Toda configuración de negocio va en variables de entorno (`.env`).
3. La variable `BUSINESS_NAME` / `VITE_APP_NAME` controla el nombre que aparece en UI, tickets y notificaciones.
4. El `.env` NUNCA se sube al repositorio (está en `.gitignore`).

### Backend (apa001/)
- PHP 8.2 sin framework. Rutas en `routes/api.php`.
- Patrón: `Controller → Model → Database (PDO Singleton)`.
- Toda respuesta JSON via `helpers/Response.php`.
- Credenciales siempre de `getenv()`, sin fallbacks hardcodeados para producción.
- Migraciones en `database/migrations/` con nombre numerado `NN_descripcion.sql`.

### Frontend Panel (ppa001/)
- React 18 funcional con hooks.
- Estado global de auth en `context/AuthContext.jsx`.
- Llamadas HTTP en `api/axiosConfig.js` (base URL desde `VITE_API_URL`).
- Nombre del negocio desde `import.meta.env.VITE_APP_NAME`.

### Frontend Caja (cpa001/)
- React 18 PWA. Service Worker en `public/sw.js`.
- Optimizado para touch: botones mínimo 44px.
- Sin navegación compleja — flujo lineal: Login → POS → Ticket.

### Docker
- `compose.dev.yml` → desarrollo local con hot-reload y herramientas (pgAdmin, MailHog).
- `compose.yml` → producción con Traefik, sin puertos expuestos directamente.

### CI/CD
- Push a `main` → GitHub Actions → SSH deploy en VPS.
- Secretos requeridos: `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`, `VPS_PORT`.

## Prohibiciones
- No instalar frameworks PHP (Laravel, Slim, etc.) sin VoBo del equipo.
- No cambiar la estructura de carpetas sin actualizar CONTEXT.md.
- No subir datos reales de clientes al repositorio (ni en seeds de prueba).
