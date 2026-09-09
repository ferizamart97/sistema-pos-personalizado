# 🏪 Sistema POS Personalizado

Sistema de Punto de Venta (POS) completo, modular y personalizable. Desarrollado por **ferizamart97**.

---

## 🧱 Arquitectura del Monorepo

```
sistema-pos-personalizado/
├── apa001/          # API Backend — PHP 8.2 + PDO + PostgreSQL
├── ppa001/          # Panel Administrativo — React 18 + Vite + Tailwind
├── cpa001/          # Terminal de Caja (POS Touch / Vendedor) — React 18 + PWA
├── compose.yml      # Producción con Traefik (SSL automático)
├── compose.dev.yml  # Desarrollo local con hot-reload
└── .env.example     # Plantilla de variables de entorno
```

---

## ✨ Módulos del Sistema

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/` | Métricas en tiempo real + alertas proactivas |
| Productos | `/productos` | Catálogo comercial + granel + fracciones + mayoreo |
| Lotes & Caducidad | `/productos/lotes` | Control de inventario FIFO con semáforo de 4 niveles |
| Paquetes | `/paquetes` | Constructor de combos/paquetes con cálculo de stock virtual |
| Servicios | `/servicios` | Catálogo de servicios con precio fijo o variable |
| Pedidos | `/pedidos` | Gestión de pedidos especiales con anticipos y WhatsApp |
| Apartados | `/apartados` | Control de apartados, abonos y periodo de gracia |
| Categorías | `/categorias` | Gestión de categorías y subcategorías |
| Usuarios | `/usuarios` | Roles: Administrador, Gerente, Vendedor |
| Ventas | `/ventas` | Historial de tickets, reimpresión PDF y reportes |

---

## 🚀 Inicio Rápido en Desarrollo Local

### Prerrequisitos
- Docker + Docker Compose v2
- Git

### 1. Clonar el repositorio
```bash
git clone https://github.com/ferizamart97/sistema-pos-personalizado.git
cd sistema-pos-personalizado
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Configurar los valores deseados en .env
```

### 3. Levantar contenedores
```bash
docker compose -f compose.dev.yml up -d
```

| Servicio | URL Local |
|----------|-----------|
| **Panel Administrativo** | http://localhost:3001 |
| **Terminal de Caja (POS)** | http://localhost:3000 |
| **API REST Backend** | http://localhost:8080 |
| **pgAdmin 4** | http://localhost:5050 |
| **MailHog (Webmail)** | http://localhost:8025 |

### 🔑 Credenciales de Prueba (Demo)
- **Administrador:** `admin@demo.com` / `password` (o `admin123`)
- **Gerente:** `gerente@demo.com` / `password`
- **Vendedor:** `vendedor1@demo.com` / `password`

---

## 🌐 Producción

Configurado para despliegue con **Docker Compose** y **Traefik** con certificados SSL automáticos de Let's Encrypt:

| Componente | Subdominio |
|------------|------------|
| **Panel Administrativo** | `https://admin-pos.ferizamart97.dev` |
| **Terminal de Caja POS** | `https://pos.ferizamart97.dev` |
| **API REST Backend** | `https://api-pos.ferizamart97.dev` |

### Despliegue en Producción
```bash
git pull origin main
docker compose -f compose.yml up -d --build
```

---

## ⚙️ Variables de Entorno Clave

| Variable | Descripción |
|----------|-------------|
| `BUSINESS_NAME` | Nombre del negocio (se refleja dinámicamente en tickets y branding) |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credenciales de PostgreSQL |
| `JWT_SECRET` | Clave secreta para tokens JWT |
| `MAIL_FROM_ADDRESS` | Correo remitente para envío de tickets |
| `WHATSAPP_API_KEY` | Clave de API para notificaciones por WhatsApp |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | PHP 8.2 · Apache mod_rewrite · PDO · Composer |
| Base de Datos | PostgreSQL 16 |
| Panel Admin | React 18 · Vite · Tailwind CSS · React Router 6 |
| Caja POS | React 18 · Vite · Tailwind CSS · PWA (Service Worker) |
| PDF Tickets | DomPDF (80mm térmico) |
| Email | PHPMailer |
| Contenedores | Docker + Traefik Reverse Proxy (SSL Let's Encrypt) |
| CI/CD | GitHub Actions (SSH Deploy) |

---

*Desarrollado por [ferizamart97](https://github.com/ferizamart97)*
