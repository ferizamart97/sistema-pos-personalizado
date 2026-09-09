# Sistema POS - Panel Administrativo (React + Vite)

Panel de administración y gestión integral para el sistema **Sistema POS**, desarrollado con **React 18**, **Vite** y **Tailwind CSS** con la identidad visual corporativa y de control de **Stitch** (*Sweet & Gift POS System*).

---

## 🌟 Módulos del Panel Administrativo

1. **Dashboard General con Alertas Proactivas:**
   - Métricas de ventas en tiempo real (hoy, semana, mes).
   - Widgets de **Alertas Urgentes** para pedidos con entrega en las próximas 72 horas y apartados por vencer o en periodo de gracia.
   - Resumen del Semáforo de Caducidad y productos más vendidos por rotación.
2. **Catálogo de Productos & Granel (`/productos`):**
   - CRUD de productos con cálculo de margen comercial y captura de fotos.
   - Pestaña de **Venta a Granel** con botón **"Abrir Bolsa(s) para Granel"** que toma las bolsas del lote más próximo a caducar (`FIFO`).
   - Pestaña de **Fracciones** (1kg, 1/2kg, 1/4kg, sueltas) y **Escalas de Mayoreo**.
3. **Gestión de Lotes y Caducidad (`/productos/lotes` y `/caducidad`):**
   - Registro de lotes por proveedor, fecha de caducidad y stock.
   - Semáforo de 4 niveles: Rojo (&lt; 30d), Naranja (30-60d), Amarillo (60-90d), Verde (90+d).
4. **Constructor de Paquetes Piñateros (`/paquetes`):**
   - Creación y edición de paquetes (20, 50 personas) seleccionando componentes de dulcería y materias primas.
   - Cálculo en vivo del **Stock Virtual** según insumos disponibles.
5. **Catálogo de Servicios (`/servicios`):**
   - Administración de servicios (Helio, Envolturas, Oblea Transfer) con modalidad de precio Fijo o Variable.
6. **Gestión de Pedidos Especiales (`/pedidos`):**
   - Tablero de pedidos con filtros por estado (*Pendientes*, *En Proceso*, *Listos*, *Entregados*, *Cancelados*).
   - Control de anticipos, devoluciones de dinero o cambios de producto en cancelaciones, y reenvío de comprobantes por WhatsApp.
7. **Sistema de Apartados (`/apartados`):**
   - Control de vigencia de 30 días naturales con anticipo mínimo $\ge 25\%$.
   - Registro de llamadas/contacto del administrador para iniciar el **periodo de 10 días de gracia**.
   - Historial de abonos parciales y liquidación.
8. **Categorías, Usuarios y Ventas:**
   - Gestión de categorías y subcategorías.
   - Control de usuarios y roles (`administrador`, `gerente`, `vendedor`).
   - Historial de tickets y reportes de ventas.

---

## 💻 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+ o Docker

```bash
# 1. Clonar repositorio
git clone https://github.com/ferizamart97/sistema-pos-personalizado.git
cd sistema-pos-personalizado/ppa001

# 2. Configurar entorno
cp .env.example .env

# 3. Instalar dependencias y ejecutar
npm install
npm run dev
```

La aplicación correrá en `http://localhost:3001`.

---

## 🛠️ Tecnologías
- **React 18**
- **Vite**
- **Tailwind CSS**
- **Axios**
- **React Router 6**
- **React Hot Toast**
