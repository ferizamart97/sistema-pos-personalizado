import React from 'react';

export default function TicketPreview({ sale, details = [], businessInfo }) {
  if (!sale) return null;

  const info = businessInfo || {
    name: import.meta.env.VITE_APP_NAME?.toUpperCase() || 'MI TIENDA',
    address: 'Av. Principal #123, Col. Centro',
    phone: '55-1234-5678',
    footer: '¡Gracias por su preferencia!'
  };

  const saleDate = sale.created_at
    ? new Date(sale.created_at).toLocaleString('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    : new Date().toLocaleString('es-MX');

  const subtotal = parseFloat(sale.subtotal || 0).toFixed(2);
  const discount = parseFloat(sale.discount || 0);
  const total = parseFloat(sale.total || 0).toFixed(2);

  return (
    <div
      id="ticket-print-area"
      className="w-full max-w-[320px] mx-auto bg-white p-5 rounded-2xl shadow-xl border border-[#ccc3d8]/60 font-mono text-xs text-[#0b1c30] select-text relative"
    >
      {/* Jagged / receipt aesthetic header */}
      <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-neutral-300">
        <div className="inline-block px-2.5 py-0.5 bg-[#eff4ff] text-[#630ed4] rounded-md font-sans text-[10px] font-black uppercase tracking-wider mb-1">
          Comprobante de Venta
        </div>
        <h2 className="text-base font-black tracking-tight uppercase">{info.name}</h2>
        <p className="text-[10px] text-neutral-600">{info.address}</p>
        <p className="text-[10px] text-neutral-600">Tel: {info.phone}</p>
      </div>

      {/* Sale Metadata */}
      <div className="py-2.5 space-y-1 border-b border-dashed border-neutral-300 text-[11px]">
        <div className="flex justify-between">
          <span className="font-bold">Ticket:</span>
          <span className="font-bold text-[#630ed4]">#{sale.ticket_number || 'T-001'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Fecha:</span>
          <span>{saleDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Atendió:</span>
          <span>{sale.seller_name || 'Caja 1'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Forma de Pago:</span>
          <span className="uppercase font-semibold">{sale.payment_method || 'Efectivo'}</span>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="py-2.5 border-b border-dashed border-neutral-300">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-neutral-300 text-neutral-600 text-[10px] uppercase">
              <th className="text-left pb-1 font-bold">Cant. / Producto</th>
              <th className="text-right pb-1 font-bold">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {details.map((item, index) => {
              const unitPrice = parseFloat(item.unit_price || 0).toFixed(2);
              const itemSubtotal = parseFloat(item.subtotal || item.unit_price * item.quantity || 0).toFixed(2);
              return (
                <tr key={index} className="py-1">
                  <td className="py-1.5 pr-2">
                    <div className="font-bold text-[#0b1c30]">
                      {item.quantity}x {item.product_name}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      ${unitPrice} c/u
                    </div>
                  </td>
                  <td className="text-right align-top py-1.5 font-bold text-[#0b1c30]">
                    ${itemSubtotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Breakdown */}
      <div className="py-2.5 space-y-1.5 border-b-2 border-dashed border-neutral-300 text-[11px]">
        <div className="flex justify-between text-neutral-600">
          <span>Subtotal:</span>
          <span>${subtotal}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-[#ba1a1a] font-semibold">
            <span>Descuento Aplicado:</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-black pt-1.5 border-t border-neutral-200 text-[#0b1c30]">
          <span>TOTAL A PAGAR:</span>
          <span className="text-[#630ed4] text-base">${total}</span>
        </div>
      </div>

      {/* Footer & Barcode Simulation */}
      <div className="pt-3 text-center space-y-2 text-[10px] text-neutral-600">
        <p className="font-bold text-neutral-800">{info.footer}</p>
        <p className="text-[9px]">Conserve este ticket como comprobante oficial de su compra.</p>

        {/* Barcode representation */}
        <div className="pt-1 flex flex-col items-center justify-center opacity-85">
          <div className="h-7 w-48 flex items-center justify-center gap-[2px] bg-neutral-100 px-2 py-1 rounded">
            {[3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,3,1,2,4,2,1,3,2,1].map((w, i) => (
              <div
                key={i}
                className="h-full bg-black"
                style={{ width: `${w * 1.5}px` }}
              ></div>
            ))}
          </div>
          <span className="text-[9px] font-mono tracking-widest mt-0.5">{sale.ticket_number || 'T-001'}</span>
        </div>
      </div>
    </div>
  );
}
