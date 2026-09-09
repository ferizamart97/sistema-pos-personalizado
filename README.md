# 🏪 Sistema POS Personalizado

Sistema de Punto de Venta (POS) completo, modular y personalizable. Desarrollado por **SomosIM / ferizamart97**.

---

## 🧱 Arquitectura

```
sistema-pos-personalizado/
├── apa001/          # API Backend — PHP 8.2 + PDO + PostgreSQL
├── ppa001/          # Panel Administrativo — React 18 + Vite + Tailwind
├── cpa001/          # Terminal de Caja (POS Vendedor) — React 18 + PWA
├── compose.yml      # Producción con Traefik (SSL automático)
├── compose.dev.yml  # Desarrollo local con hot-reload
└── .env.example     # Plantilla de variables de entorno
```

---

## ✨ Módulos del Sistema

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/` | Métricas en tiempo real + alertas proactivas |
| Productos | `/productos` | CRUD + granel + fracciones + mayoreo |
| Lotes & Caducidad | `/productos/lotes` | Control de inventario FIFO con semáforo |
| Paquetes | `/paquetes` | Constructor de combos con stock virtual |
| Servicios | `/servicios` | Catálogo precio fijo o variable |
| Pedidos | `/pedidos` | Tablero kanban + WhatsApp |
| Apartados | `/apartados` | Control de vigencia + abonos |
| Categorías | `/categorias` | Gestión de categorías y subcategorías |
| Usuarios | `/usuarios` | Roles: Administrador, Gerente, Vendedor |
| Ventas | `/ventas` | Historial + reportes + exportación |

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Docker + Docker Compose v2
- Git

### 1. Clonar
```bash
git clone https://github.com/ferizamart97/sistema-pos-personalizado.git
cd sistema-pos-personalizado
```

### 2. Configurar entorno
```bash
cp .env.example .env
# Editar .env con los datos de tu negocio
```

### 3. Levantar en desarrollo
```bash
docker compose -f compose.dev.yml up -d
```

| Servicio | URL Local |
|----------|-----------|
| Panel Admin | http://localhost:3001 |
| Caja POS | http://localhost:3000 |
| API Backend | http://localhost:8080 |
| pgAdmin | http://localhost:5050 |
| MailHog | http://localhost:8025 |

---

## 🌐 Producción

El `compose.yml` está configurado con **Traefik** para SSL automático via Let's Encrypt. Expone:

| URL | Servicio |
|-----|---------|
| `https://pos.somosin.mx` | Panel Admin |
| `https://pos.ferizamart97.dev` | Panel Admin |
| `https://caja.somosin.mx` | Terminal de Caja |
| `https://api-pos.somosin.mx` | API REST |

### Deploy manual
```bash
git pull origin main
docker compose -f compose.yml up -d --build
```

---

## ⚙️ Variables de Entorno Clave

| Variable | Descripción |
|----------|-------------|
| `BUSINESS_NAME` | Nombre del negocio (aparece en tickets y UI) |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credenciales PostgreSQL |
| `JWT_SECRET` | Clave para tokens de sesión (mín. 32 chars) |
| `MAIL_FROM_ADDRESS` | Remitente de correos del sistema |
| `WHATSAPP_API_KEY` | API para envío de notificaciones |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | PHP 8.2 · Apache · PDO · Composer |
| Base de datos | PostgreSQL 16 |
| Panel Admin | React 18 · Vite · TailwindCSS · React Router 6 |
| Caja POS | React 18 · Vite · PWA (Service Worker) |
| PDF Tickets | DomPDF |
| Email | PHPMailer |
| Contenedores | Docker + Traefik |
| CI/CD | GitHub Actions → SSH deploy |

---

## 📌 Personalización Rápida

Para adaptar el sistema a un nuevo cliente, solo cambia en `.env`:
```bash
BUSINESS_NAME=Nombre del Negocio
MAIL_FROM_NAME=Nombre del Negocio
```
El nombre aparecerá automáticamente en el encabezado del sistema, tickets PDF y mensajes de WhatsApp.

---

*Desarrollado por SomosIM — [somosin.mx](https://somosin.mx)*
