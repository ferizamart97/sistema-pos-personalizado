import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Ticket Modal & Action State
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Send Channels State
  const [activeChannel, setActiveChannel] = useState(null); // 'whatsapp', 'email' or null
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingChannel, setSendingChannel] = useState(false);

  const fetchSales = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, per_page: 15 };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await api.get('/sales', { params });
      setSales(response.data.data || []);
      setPagination(response.data.pagination || null);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(currentPage);
  }, [dateFrom, dateTo]);

  const handleOpenTicketModal = async (sale) => {
    setSelectedSale(sale);
    setIsTicketModalOpen(true);
    setActiveChannel(null);
    setWhatsappPhone(sale.customer_phone || '');
    setEmailAddress(sale.customer_email || '');

    try {
      setLoadingDetail(true);
      const res = await api.get(`/sales/${sale.id}`);
      setSaleDetails(res.data.data.details || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalle del ticket');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const getPdfUrl = () => {
    if (!selectedSale) return '';
    if (api.defaults.baseURL && api.defaults.baseURL.startsWith('http')) {
      return `${api.defaults.baseURL}/tickets/${selectedSale.id}/pdf`;
    }
    return `${window.location.origin}/api/tickets/${selectedSale.id}/pdf`;
  };

  const handleDownloadPdf = () => {
    if (!selectedSale) return;
    window.open(getPdfUrl(), '_blank');
  };

  const handleShareNativePdf = async () => {
    if (!selectedSale) return;
    try {
      setSendingChannel(true);
      const response = await fetch(getPdfUrl());
      if (!response.ok) throw new Error('No se pudo descargar el PDF');
      
      const blob = await response.blob();
      const file = new File([blob], `Ticket_${selectedSale.ticket_number || selectedSale.id}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ticket de Compra #${selectedSale.ticket_number}`,
          text: `Comprobante oficial de compra en la tienda`
        });
        toast.success('¡Ticket compartido exitosamente!');
        return;
      } else {
        setActiveChannel('whatsapp');
      }
    } catch (err) {
      console.warn('Native share cancelled or failed:', err);
      setActiveChannel('whatsapp');
    } finally {
      setSendingChannel(false);
    }
  };

  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    if (!whatsappPhone.trim()) {
      toast.error('Ingresa un número de WhatsApp (10 dígitos)');
      return;
    }

    try {
      setSendingChannel(true);
      const res = await api.post(`/tickets/${selectedSale.id}/send`, {
        channel: 'whatsapp',
        recipient: whatsappPhone
      });

      toast.success('¡Comprobante en PDF preparado para WhatsApp!');
      if (res.data?.data?.whatsapp_url) {
        window.open(res.data.data.whatsapp_url, '_blank');
      }
      setActiveChannel(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al enviar por WhatsApp');
    } finally {
      setSendingChannel(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailAddress.trim()) {
      toast.error('Ingresa un correo electrónico válido');
      return;
    }

    try {
      setSendingChannel(true);
      await api.post(`/tickets/${selectedSale.id}/send`, {
        channel: 'email',
        recipient: emailAddress
      });

      toast.success(`¡Ticket en PDF enviado a ${emailAddress}!`);
      setActiveChannel(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al enviar por correo');
    } finally {
      setSendingChannel(false);
    }
  };

  const setPresetDate = (type) => {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (type === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  const columns = [
    {
      header: 'Acciones',
      render: (s) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenTicketModal(s)}
            className="min-h-[40px] px-3.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="Ver e Imprimir / Enviar Ticket"
          >
            <span className="material-symbols-outlined text-[19px]">receipt_long</span>
            <span>Ticket</span>
          </button>
        </div>
      )
    },
    {
      header: 'Ticket #',
      render: (s) => (
        <span className="font-mono font-bold text-sm sm:text-base text-[#630ed4]">#{s.ticket_number}</span>
      )
    },
    {
      header: 'Fecha / Hora',
      render: (s) => (
        <span className="text-xs sm:text-sm text-[#0b1c30] font-mono">
          {new Date(s.created_at).toLocaleString('es-MX', {
            dateStyle: 'short',
            timeStyle: 'short'
          })}
        </span>
      )
    },
    {
      header: 'Vendedor',
      render: (s) => (
        <span className="text-sm font-semibold text-[#0b1c30]">{s.seller_name || 'Caja'}</span>
      )
    },
    {
      header: 'Método Pago',
      render: (s) => (
        <span className="text-xs sm:text-sm uppercase font-bold px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#0b1c30]">
          {s.payment_method}
        </span>
      )
    },
    {
      header: 'Total Cobrado',
      render: (s) => (
        <div>
          <span className="text-base sm:text-lg font-black text-[#0b1c30] font-mono">
            ${parseFloat(s.total || 0).toFixed(2)}
          </span>
          {parseFloat(s.discount || 0) > 0 && (
            <div className="text-xs text-[#ba1a1a] font-mono">Desc: -${parseFloat(s.discount).toFixed(2)}</div>
          )}
        </div>
      )
    }
  ];

  const saleDateFormatted = selectedSale?.created_at
    ? new Date(selectedSale.created_at).toLocaleString('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0b1c30] tracking-tight">Historial de Ventas y Tickets</h2>
          <p className="text-xs text-[#7b7487]">
            Registro de transacciones, tickets térmicos oficiales y envío por canales digitales
          </p>
        </div>
      </div>

      {/* Date Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#ccc3d8]/40 shadow-xs">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setPresetDate('today')}
            className="px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] rounded-lg font-bold text-xs active:scale-95"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setPresetDate('week')}
            className="px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] rounded-lg font-bold text-xs active:scale-95"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => setPresetDate('month')}
            className="px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] rounded-lg font-bold text-xs active:scale-95"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => setPresetDate('all')}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-bold text-xs active:scale-95"
          >
            Todos
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#7b7487]">Desde:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="min-h-[38px] px-2 bg-[#f8f9ff] border border-[#ccc3d8] rounded-lg text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#7b7487]">Hasta:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="min-h-[38px] px-2 bg-[#f8f9ff] border border-[#ccc3d8] rounded-lg text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Sales DataTable */}
      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchSales(p)}
      />

      {/* Modal Ticket Térmico con las 3 Opciones de Envío */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title={`Comprobante de Venta #${selectedSale?.ticket_number || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* LADO IZQUIERDO: VISTA DEL TICKET TÉRMICO (Impresión Exclusiva) */}
            <div className="bg-[#f8f9ff] p-3 rounded-2xl border border-[#ccc3d8]/40 flex justify-center">
              {loadingDetail ? (
                <div className="p-12 text-center text-xs text-[#7b7487]">
                  <span className="material-symbols-outlined text-[32px] text-[#630ed4] animate-spin">progress_activity</span>
                  <p className="mt-2">Cargando ticket...</p>
                </div>
              ) : (
                <div
                  id="ticket-print-area"
                  className="w-full max-w-[280px] bg-white p-4 rounded-xl shadow-md border border-[#ccc3d8]/60 font-mono text-[11px] text-[#0b1c30] select-text"
                >
                  {/* Store Header */}
                  <div className="text-center pb-2.5 border-b border-dashed border-neutral-300">
                    <h3 className="text-sm font-black uppercase tracking-tight">{import.meta.env.VITE_APP_NAME?.toUpperCase() || "MI TIENDA"}</h3>
                    <p className="text-[9.5px] text-neutral-600">Av. Principal #123, Col. Centro</p>
                    <p className="text-[9.5px] text-neutral-600">Tel: 55-1234-5678</p>
                  </div>

                  {/* Metadata */}
                  <div className="py-2 space-y-0.5 border-b border-dashed border-neutral-300 text-[10px]">
                    <div className="flex justify-between font-bold text-[#630ed4]">
                      <span>Ticket:</span>
                      <span>#{selectedSale?.ticket_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Fecha:</span>
                      <span>{saleDateFormatted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Atendió:</span>
                      <span>{selectedSale?.seller_name || 'Caja'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Pago:</span>
                      <span className="uppercase font-semibold">{selectedSale?.payment_method}</span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="py-2 border-b border-dashed border-neutral-300">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-neutral-300 text-neutral-500 uppercase">
                          <th className="text-left pb-1">Cant/Prod</th>
                          <th className="text-right pb-1">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {saleDetails.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1 pr-1">
                              <strong>{it.quantity}x</strong> {it.product_name}
                              <div className="text-[9px] text-neutral-500">${parseFloat(it.unit_price).toFixed(2)} c/u</div>
                            </td>
                            <td className="text-right align-top py-1 font-bold">
                              ${parseFloat(it.subtotal).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="py-2 space-y-1 border-b border-dashed border-neutral-300 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${parseFloat(selectedSale?.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {parseFloat(selectedSale?.discount || 0) > 0 && (
                      <div className="flex justify-between text-[#ba1a1a]">
                        <span>Descuento:</span>
                        <span>-${parseFloat(selectedSale?.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-black pt-1 border-t border-neutral-200 text-[#0b1c30]">
                      <span>TOTAL:</span>
                      <span className="text-[#630ed4]">${parseFloat(selectedSale?.total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 text-center text-[9px] text-neutral-600 space-y-1">
                    <p className="font-bold">¡Gracias por su compra!</p>
                    <div className="pt-1 flex flex-col items-center opacity-80">
                      <div className="h-5 w-36 flex items-center justify-center gap-[2px] bg-neutral-100 px-1 py-0.5 rounded">
                        {[2,1,3,1,2,3,1,2,4,1,3,2,1,3,1].map((w, i) => (
                          <div key={i} className="h-full bg-black" style={{ width: `${w * 1.5}px` }}></div>
                        ))}
                      </div>
                      <span className="text-[8px] font-mono mt-0.5">{selectedSale?.ticket_number}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LADO DERECHO: LAS 3 OPCIONES DE ENVÍO E IMPRESIÓN */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0b1c30] uppercase">Opciones del Comprobante</h4>

              {/* Las 3 opciones principales */}
              <div className="grid grid-cols-1 gap-2">
                {/* 1. Imprimir Ticket */}
                <button
                  type="button"
                  onClick={handlePrintTicket}
                  className="w-full min-h-[46px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-bold flex items-center gap-3 border border-[#ccc3d8]/40 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#630ed4] text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">print</span>
                  </span>
                  <div className="text-left">
                    <div className="text-[#0b1c30]">1. Imprimir Ticket Térmico</div>
                    <span className="text-[10px] text-[#7b7487] font-normal">Solo el formato de ticket de 80mm</span>
                  </div>
                </button>

                {/* 2. Enviar por WhatsApp */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share && navigator.canShare) {
                      handleShareNativePdf();
                    } else {
                      setActiveChannel(activeChannel === 'whatsapp' ? null : 'whatsapp');
                    }
                  }}
                  className={`w-full min-h-[46px] px-4 rounded-xl text-xs font-bold flex items-center gap-3 border shadow-2xs active:scale-95 transition-all cursor-pointer ${
                    activeChannel === 'whatsapp'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] border-[#ccc3d8]/40'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    activeChannel === 'whatsapp' ? 'bg-white text-emerald-600' : 'bg-emerald-600 text-white'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                  </span>
                  <div className="text-left">
                    <div>2. Enviar Ticket PDF por WhatsApp</div>
                    <span className={`text-[10px] font-normal ${activeChannel === 'whatsapp' ? 'text-emerald-100' : 'text-[#7b7487]'}`}>
                      Documento PDF oficial y comprobante
                    </span>
                  </div>
                </button>

                {/* 3. Enviar por Correo */}
                <button
                  type="button"
                  onClick={() => setActiveChannel(activeChannel === 'email' ? null : 'email')}
                  className={`w-full min-h-[46px] px-4 rounded-xl text-xs font-bold flex items-center gap-3 border shadow-2xs active:scale-95 transition-all cursor-pointer ${
                    activeChannel === 'email'
                      ? 'bg-[#630ed4] text-white border-[#7c3aed]'
                      : 'bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] border-[#ccc3d8]/40'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    activeChannel === 'email' ? 'bg-white text-[#630ed4]' : 'bg-[#630ed4] text-white'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </span>
                  <div className="text-left">
                    <div>3. Enviar por Correo Electrónico</div>
                    <span className={`text-[10px] font-normal ${activeChannel === 'email' ? 'text-purple-100' : 'text-[#7b7487]'}`}>
                      Adjunta el PDF del ticket generado
                    </span>
                  </div>
                </button>

                {/* Descargar PDF Directo */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="w-full min-h-[42px] px-4 rounded-xl bg-white hover:bg-[#eff4ff] text-[#0284c7] text-xs font-bold flex items-center gap-2 border border-[#0284c7]/40 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  <span>Descargar Archivo PDF del Ticket</span>
                </button>
              </div>

              {/* Formulario WhatsApp */}
              {activeChannel === 'whatsapp' && (
                <form onSubmit={handleSendWhatsApp} className="p-3 bg-white rounded-xl border-2 border-emerald-500 shadow-md space-y-2 animate-in fade-in">
                  <label className="text-[11px] font-bold text-emerald-700 uppercase block">
                    Teléfono del Cliente (WhatsApp) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      required
                      autoFocus
                      placeholder="Ej: 5512345678"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className="flex-1 min-h-[38px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingChannel}
                      className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                    >
                      {sendingChannel ? '...' : 'Enviar'}
                    </button>
                  </div>
                </form>
              )}

              {/* Formulario Email */}
              {activeChannel === 'email' && (
                <form onSubmit={handleSendEmail} className="p-3 bg-white rounded-xl border-2 border-[#630ed4] shadow-md space-y-2 animate-in fade-in">
                  <label className="text-[11px] font-bold text-[#630ed4] uppercase block">
                    Correo del Cliente *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="cliente@correo.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="flex-1 min-h-[38px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingChannel}
                      className="px-4 bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                    >
                      {sendingChannel ? '...' : 'Enviar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(false)}
              className="min-h-[40px] px-6 bg-[#f8f9ff] hover:bg-[#e5eeff] text-[#0b1c30] rounded-xl text-xs font-bold border border-[#ccc3d8]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
