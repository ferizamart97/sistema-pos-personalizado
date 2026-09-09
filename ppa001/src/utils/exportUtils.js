/**
 * Utilidad para exportación y plantilla de Catálogo de Productos a Excel (CSV/XLSX) y Word (DOC)
 */

export function exportProductsToCSV(products, filename = 'catalogo_productos.csv') {
  if (!products || products.length === 0) return;

  const headers = [
    'SKU',
    'Producto',
    'Categoría',
    'Tipo',
    'Precio Compra',
    'Margen',
    'Precio Venta',
    'Granel Habilitado',
    'Precio Granel',
    'Stock Actual',
    'Stock Mínimo',
    'Estado'
  ];

  const rows = products.map(p => [
    `"${(p.sku || '').replace(/"/g, '""')}"`,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.subcategory_name || p.category_name || '').replace(/"/g, '""')}"`,
    `"${(p.category_type || '').replace(/"/g, '""')}"`,
    parseFloat(p.purchase_price || 0).toFixed(2),
    `${p.margin_value || 0}${p.margin_type === 'percentage' ? '%' : '$'}`,
    parseFloat(p.sale_price || 0).toFixed(2),
    p.is_bulk_enabled ? 'SÍ' : 'NO',
    p.is_bulk_enabled ? parseFloat(p.bulk_price || 0).toFixed(2) : 'N/A',
    parseFloat(p.total_stock || 0).toFixed(2),
    parseFloat(p.min_stock || 0).toFixed(2),
    p.is_active ? 'Activo' : 'Inactivo'
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportProductsToWord(products, reportTitle = 'Catálogo de Productos', filename = 'catalogo_productos.doc') {
  if (!products || products.length === 0) return;

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.sale_price || 0) * parseFloat(p.total_stock || 0)), 0);

  let tableRows = '';
  products.forEach((p, idx) => {
    tableRows += `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9ff'};">
        <td style="padding: 8px; border: 1px solid #ccc; font-family: monospace; font-weight: bold;">${p.sku || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${p.name}</td>
        <td style="padding: 8px; border: 1px solid #ccc;">${p.subcategory_name || p.category_name || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">$${parseFloat(p.purchase_price || 0).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: right; font-weight: bold; color: #630ed4;">$${parseFloat(p.sale_price || 0).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${parseFloat(p.total_stock || 0).toFixed(0)} ${p.unit || 'pza'}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${p.is_bulk_enabled ? 'SÍ' : 'NO'}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${p.is_active ? '<span style="color:green;font-weight:bold;">Activo</span>' : '<span style="color:red;">Inactivo</span>'}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; color: #0b1c30; padding: 20px; }
          h1 { color: #630ed4; margin-bottom: 2px; }
          h2 { color: #7b7487; font-size: 14px; margin-top: 0; font-weight: normal; }
          .summary { background: #eff4ff; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
          th { background-color: #0b1c30; color: #ffffff; padding: 10px 8px; border: 1px solid #0b1c30; text-align: left; }
          td { border: 1px solid #dce9ff; }
        </style>
      </head>
      <body>
        <h1>Panel Admin</h1>
        <h2>${reportTitle} — Generado el: ${dateStr}</h2>
        
        <div class="summary">
          <strong>Resumen del Reporte:</strong> Total de Productos: <strong>${products.length}</strong> | Valor Estimado Inventario: <strong>$${totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
        </div>

        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th style="text-align: right;">Costo</th>
              <th style="text-align: right;">Precio Venta</th>
              <th style="text-align: center;">Stock</th>
              <th style="text-align: center;">Granel</th>
              <th style="text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <p style="margin-top: 30px; font-size: 11px; color: #7b7487; text-align: center;">
          Documento oficial generado desde el Sistema de Control
        </p>
      </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const SAMPLE_BULK_PRODUCTS_GRANEL = [
  {
    sku: 'DUL-GOM-001',
    name: 'Gomitas Panditas Ricolino (A Granel)',
    subcategory_name: 'Gomitas',
    purchase_price: 45.00,
    margin_type: 'percentage',
    margin_value: 35,
    initial_stock: 50,
    min_stock: 10,
    is_bulk_enabled: true,
    unit: 'kg',
    expiration_days: 180,
    barcode: '7501234567890'
  },
  {
    sku: 'DUL-MOR-002',
    name: 'Gomitas Moritas Silvestres (A Granel)',
    subcategory_name: 'Gomitas',
    purchase_price: 40.00,
    margin_type: 'percentage',
    margin_value: 40,
    initial_stock: 35,
    min_stock: 8,
    is_bulk_enabled: true,
    unit: 'kg',
    expiration_days: 180,
    barcode: '7501234567891'
  },
  {
    sku: 'MAT-CHO-003',
    name: 'Almendra con Chocolate Confitada (A Granel)',
    subcategory_name: 'Chocolates',
    purchase_price: 110.00,
    margin_type: 'percentage',
    margin_value: 30,
    initial_stock: 25,
    min_stock: 5,
    is_bulk_enabled: true,
    unit: 'kg',
    expiration_days: 240,
    barcode: ''
  }
];

export const SAMPLE_BULK_PRODUCTS_PIEZAS = [
  {
    sku: 'MAT-BOL-001',
    name: 'Bolsa de Celofán 15x25cm (Paq. 1000 pz)',
    subcategory_name: 'Bolsas y Empaques',
    purchase_price: 180.00,
    margin_type: 'percentage',
    margin_value: 40,
    initial_stock: 30,
    min_stock: 5,
    is_bulk_enabled: false,
    unit: 'pza',
    expiration_days: 730,
    barcode: '7509876543210'
  },
  {
    sku: 'MAT-VAS-002',
    name: 'Vaso Térmico #8 con Tapa (Paq. 50 pz)',
    subcategory_name: 'Desechables',
    purchase_price: 48.00,
    margin_type: 'percentage',
    margin_value: 35,
    initial_stock: 40,
    min_stock: 10,
    is_bulk_enabled: false,
    unit: 'pza',
    expiration_days: 730,
    barcode: '7509876543211'
  },
  {
    sku: 'REG-GLO-003',
    name: 'Globo Metálico Número 40 Pulgadas Dorado',
    subcategory_name: 'Globos Helio',
    purchase_price: 15.00,
    margin_type: 'fixed',
    margin_value: 25,
    initial_stock: 80,
    min_stock: 15,
    is_bulk_enabled: false,
    unit: 'pza',
    expiration_days: 1095,
    barcode: ''
  },
  {
    sku: 'DUL-MAZ-004',
    name: 'Caja Mazapán De La Rosa Original (30 pz)',
    subcategory_name: 'Mazapanes',
    purchase_price: 125.00,
    margin_type: 'percentage',
    margin_value: 28,
    initial_stock: 20,
    min_stock: 4,
    is_bulk_enabled: false,
    unit: 'pza',
    expiration_days: 365,
    barcode: '7501000123456'
  }
];

/** Descargar plantilla oficial Excel (.xls) compatible con Google Sheets, Excel móvil, iPad y PC */
export function downloadProductBulkTemplateExcel() {
  const allSamples = [...SAMPLE_BULK_PRODUCTS_GRANEL, ...SAMPLE_BULK_PRODUCTS_PIEZAS];

  let sampleRowsHtml = '';
  allSamples.forEach((item, idx) => {
    const salePrice = item.margin_type === 'percentage'
      ? (item.purchase_price * (1 + (item.margin_value / 100))).toFixed(2)
      : (item.purchase_price + item.margin_value).toFixed(2);

    const isGranel = item.is_bulk_enabled ? 'SI' : 'NO';
    const bg = item.is_bulk_enabled ? '#f0fdf4' : (idx % 2 === 0 ? '#ffffff' : '#f8f9ff');

    sampleRowsHtml += `
      <tr style="background-color: ${bg};">
        <td style="font-family: monospace; font-weight: bold; border: 1px solid #ccc; padding: 6px 10px;">${item.sku}</td>
        <td style="font-weight: bold; border: 1px solid #ccc; padding: 6px 10px;">${item.name}</td>
        <td style="border: 1px solid #ccc; padding: 6px 10px;">${item.subcategory_name}</td>
        <td style="text-align: right; border: 1px solid #ccc; padding: 6px 10px;">${item.purchase_price.toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #ccc; padding: 6px 10px;">${item.margin_type}</td>
        <td style="text-align: right; border: 1px solid #ccc; padding: 6px 10px;">${item.margin_value}</td>
        <td style="text-align: right; font-weight: bold; color: #15803d; border: 1px solid #ccc; padding: 6px 10px;">${salePrice}</td>
        <td style="text-align: center; border: 1px solid #ccc; padding: 6px 10px;">${item.initial_stock}</td>
        <td style="text-align: center; border: 1px solid #ccc; padding: 6px 10px;">${item.min_stock}</td>
        <td style="text-align: center; font-weight: bold; border: 1px solid #ccc; padding: 6px 10px; color: ${item.is_bulk_enabled ? '#15803d' : '#4b5563'};">${isGranel}</td>
        <td style="text-align: center; font-weight: bold; border: 1px solid #ccc; padding: 6px 10px;">${item.unit}</td>
        <td style="text-align: center; border: 1px solid #ccc; padding: 6px 10px;">${item.expiration_days}</td>
        <td style="border: 1px solid #ccc; padding: 6px 10px; mso-number-format:'\\@';">${item.barcode || ''}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Plantilla_Productos</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; }
          th { background-color: #15803d; color: #ffffff; font-weight: bold; padding: 10px 8px; border: 1px solid #166534; text-align: left; }
          td { border: 1px solid #e2e8f0; font-size: 12px; }
          .instructions { background-color: #f0fdf4; border: 2px solid #86efac; padding: 15px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; color: #14532d; }
          .legend { margin-top: 10px; font-size: 11px; color: #4b5563; }
        </style>
      </head>
      <body>
        <div class="instructions">
          <h2 style="margin: 0 0 6px 0; color: #15803d;">Plantilla Oficial de Carga Masiva</h2>
          <p style="margin: 0 0 8px 0;"><strong>Instrucciones:</strong> Llena o copia tus productos en las filas inferiores. Los campos con (*) son obligatorios.</p>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>es_granel:</strong> Coloca <strong>SI</strong> para productos vendidos a granel (por peso/kilo) o <strong>NO</strong> para productos empaquetados/piezas.</li>
            <li><strong>unidad:</strong> Coloca <strong>kg</strong> para granel o <strong>pza</strong> para cajas, paquetes (ej. 25, 50, 100, 1000 pz) y piezas unitarias.</li>
            <li><strong>tipo_margen:</strong> Escribe <strong>percentage</strong> (porcentaje) o <strong>fixed</strong> (monto fijo).</li>
          </ul>
        </div>

        <table>
          <thead>
            <tr>
              <th>sku (*)</th>
              <th>nombre (*)</th>
              <th>subcategoria</th>
              <th>precio_compra (*)</th>
              <th>tipo_margen</th>
              <th>valor_margen</th>
              <th>precio_venta (Ref)</th>
              <th>stock_inicial</th>
              <th>stock_minimo</th>
              <th>es_granel</th>
              <th>unidad</th>
              <th>dias_caducidad</th>
              <th>codigo_barras</th>
            </tr>
          </thead>
          <tbody>
            ${sampleRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'plantilla_carga_masiva_productos.xls');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Descargar plantilla oficial en formato CSV */
export function downloadProductBulkTemplateCSV() {
  const headers = [
    'sku',
    'nombre',
    'subcategoria',
    'precio_compra',
    'tipo_margen',
    'valor_margen',
    'stock_inicial',
    'stock_minimo',
    'es_granel',
    'unidad',
    'dias_caducidad',
    'codigo_barras'
  ];

  const allSamples = [...SAMPLE_BULK_PRODUCTS_GRANEL, ...SAMPLE_BULK_PRODUCTS_PIEZAS];
  const sampleRows = allSamples.map(item => [
    `"${item.sku}"`,
    `"${item.name.replace(/"/g, '""')}"`,
    `"${item.subcategory_name}"`,
    item.purchase_price.toFixed(2),
    item.margin_type,
    item.margin_value,
    item.initial_stock,
    item.min_stock,
    item.is_bulk_enabled ? 'SI' : 'NO',
    item.unit,
    item.expiration_days,
    `"${item.barcode || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'plantilla_carga_masiva_productos.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Descargar plantilla oficial por defecto (Excel) */
export function downloadProductBulkTemplate() {
  downloadProductBulkTemplateExcel();
}

