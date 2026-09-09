# Sistema POS - Terminal Vendedor Touch (React + Vite)

Terminal de punto de venta táctil diseñada específicamente para tabletas y pantallas touch en caja, desarrollada con **React 18**, **Vite** y **Tailwind CSS** siguiendo las pautas de diseño y la paleta cromática de **Stitch** (*Sweet & Gift POS System*).

---

## 🎨 Experiencia de Usuario & Diseño Stitch

- **Paleta Cromática por Categoría:**
  - 🍬 **Dulcería:** `#630ed4` (Vibrant Purple)
  - 🧪 **Materias Primas:** `#005479` (Sky / Slate Blue)
  - 🎁 **Regalos:** `#a43073` (Warm Pink / Rose)
  - 📦 **Paquetes Piñateros:** `#ea580c` (Fiesta Orange)
  - 🎈 **Servicios en Tienda:** `#0284c7` (Service Blue)
- **Ergonomía Táctil:**
  - Botones y zonas interactivas de $\ge 48\text{px}$ (`touch-target-min`).
  - Teclados numéricos en pantalla para pesaje exacto y montos variables.
  - Steppers de alta precisión (+/- táctiles) para evitar errores de digitación en turnos rápidos.

---

## 🚀 Funcionalidades Integradas

1. **Venta a Granel y Báscula:**
   - Botones rápidos de fracciones (*1 Kilo*, *1/2 Kilo*, *1/4 Kilo*, *Pieza Suelta*).
   - Teclado numérico táctil para ingresar el pesaje exacto de báscula (ej. `0.350 kg`).
2. **Paquetes Piñateros:**
   - Selección rápida de combos (20, 50 personas) con visualización en tiempo real del **Stock Virtual**.
3. **Servicios con Precio Dinámico:**
   - Cobro de servicios (Helio, Envolturas, Oblea Transfer) con teclado para ingresar el costo acordado.
4. **Módulo de Pedidos Especiales:**
   - Formulario touch para registrar pedidos con anticipo/garantía y envío directo a WhatsApp.
5. **Módulo de Apartados & Abonos:**
   - Creación de apartados con anticipo mínimo del 25% (30 días de vigencia).
   - Buscador para cobrar abonos semanales generando tickets con saldo restante acumulado y envío a WhatsApp.
6. **Cobro Rápido:**
   - Métodos de pago: Efectivo, Tarjeta, Transferencia.
   - Calculadora de cambio y emisión de ticket digital.

---

## 💻 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+ o Docker

```bash
# 1. Clonar repositorio
git clone https://github.com/ferizamart97/sistema-pos-personalizado.git
cd sistema-pos-personalizado/cpa001

# 2. Configurar entorno
cp .env.example .env

# 3. Instalar dependencias y ejecutar
npm install
npm run dev
```

La aplicación correrá en `http://localhost:3000`.

---

## 🛠️ Tecnologías
- **React 18**
- **Vite**
- **Tailwind CSS**
- **Axios**
- **React Router 6**
- **React Hot Toast**
