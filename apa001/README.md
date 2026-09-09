# Sistema POS - Backend RESTful API

API RESTful robusta desarrollada en **PHP 8.2** con arquitectura orientada a servicios y base de datos **PostgreSQL 16** para el sistema de punto de venta (POS) **Ferizamart** (Dulcería, Materias Primas, Regalos, Granel, Paquetes Piñateros, Servicios, Pedidos y Apartados).

---

## 🌟 Características Principales

1. **Gestión de Catálogo Multi-Categoría:**
   - Dulcería (`dulceria`), Materias Primas (`materias_primas`) y Regalos (`regalos`).
   - Soporte de subcategorías, códigos de barras, SKU y fotos de producto.
2. **Control de Lotes y Caducidad FIFO:**
   - Asignación de lotes con fecha de caducidad.
   - Algoritmo **FIFO (First In, First Out)** para deducción automática del lote más próximo a caducar.
   - Semáforo de riesgo de caducidad (Rojo &lt; 30d, Naranja 30-60d, Amarillo 60-90d, Verde 90+d).
3. **Venta a Granel y Conversión de Bolsas:**
   - Deducción por peso o pesaje exacto (`bulk_stock`).
   - Apertura automática o manual de bolsas selladas (`open-bulk`) tomando del lote más próximo a vencer.
4. **Fraccionamiento y Precios de Mayoreo:**
   - Configuración de porciones estándar (1 Kilo, 1/2 Kilo, 1/4 Kilo, Pieza Suelta).
   - Escalas de mayoreo automáticas por volumen ($\ge N$ piezas).
5. **Paquetes y Combos Piñateros:**
   - Packs de fiesta (20, 50 personas) con cálculo de **Stock Virtual** en tiempo real y deducción multi-componente por FIFO.
6. **Catálogo de Servicios:**
   - Servicios en tienda (Helio, Envolturas, Obleas/Transfer) con modalidad de precio fijo y variable ingresado al momento.
7. **Pedidos Especiales y Sistema de Apartados (Layaway):**
   - **Pedidos Especiales:** Obleas transfer, anticipos, fecha y hora requerida, cancelaciones con reembolso/cambio.
   - **Apartados:** Anticipo mínimo del 25%, vigencia de 30 días naturales, abonos semanales, periodo de 10 días de gracia y notificaciones automáticas por WhatsApp / Email.
8. **Seguridad y Roles:**
   - Autenticación JWT (`firebase/php-jwt`).
   - Roles: `administrador`, `gerente`, `vendedor`.
   - Eliminación condicionada: deshabilitación lógica (`is_active = false`) o hard delete según permisos.

---

## 🚀 Despliegue con Docker

### Prerrequisitos
- [Docker](https://www.docker.com/) & Docker Compose

### Pasos de Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/ferizamart97/sistema-pos-personalizado.git
cd sistema-pos-personalizado/apa001
```

2. Copiar archivo de entorno:
```bash
cp .env.example .env
```

3. Iniciar contenedores:
```bash
docker compose up -d --build
```

4. La API estará disponible en `http://localhost:8080` (Healthcheck: `GET /api/health`).

---

## 📚 Endpoints Principales

### 🔐 Autenticación
- `POST /api/auth/login`: Iniciar sesión (retorna token JWT y rol).
- `GET /api/auth/me`: Obtener datos del usuario autenticado.

### 🍬 Productos, Granel & Mayoreo
- `GET /api/products`: Listar productos con filtros y paginación.
- `POST /api/products`: Crear nuevo producto con margen de ganancia.
- `POST /api/products/{id}/open-bulk`: Abrir bolsas para stock a granel (FIFO).
- `GET /api/products/{id}/fractions` | `POST /api/products/{id}/fractions`: Fracciones de precio.
- `GET /api/products/{id}/wholesale-tiers` | `POST /api/products/{id}/wholesale-tiers`: Escalas de mayoreo.

### 📦 Paquetes Piñateros & Servicios
- `GET /api/packages` | `POST /api/packages`: CRUD de paquetes piñateros con stock virtual.
- `GET /api/services` | `POST /api/services`: CRUD de servicios de precio fijo/variable.

### 📋 Pedidos & Apartados
- `GET /api/custom-orders` | `POST /api/custom-orders`: Pedidos especiales con anticipos.
- `PUT /api/custom-orders/{id}/status`: Cambiar estado / Registrar cancelación y reembolso.
- `GET /api/layaways` | `POST /api/layaways`: Registrar apartado con anticipo $\ge 25\%$.
- `POST /api/layaways/{id}/payments`: Registrar abono semanal con ticket WhatsApp.
- `PATCH /api/layaways/{id}/contact`: Registrar contacto de admin e iniciar 10 días de gracia.

### 🛒 Ventas & Dashboard
- `POST /api/sales`: Procesar venta mixta (productos, granel, paquetes, servicios).
- `GET /api/dashboard/stats`: Métricas en vivo y alertas proactivas (pedidos 72h y apartados en gracia).

---

## 🛠️ Tecnologías
- **PHP 8.2** (FPM & Apache/Nginx)
- **PostgreSQL 16**
- **Composer** (JWT, DomPDF, Twilio SDK, PHPMailer)
- **Docker**
