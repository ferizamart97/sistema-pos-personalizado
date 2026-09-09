import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axiosConfig';
import Modal from '../common/Modal';
import TouchButton from '../common/TouchButton';

export default function SpecialOrdersModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'list'
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Catalog products for auto-calculation
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [description, setDescription] = useState('');
  const [referenceLink, setReferenceLink] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [total, setTotal] = useState('');
  const [deposit, setDeposit] = useState('');

  // Success Modal State (Replaces browser alert)
  const [successOrderData, setSuccessOrderData] = useState(null);

  // Payment Modal State
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Status Change Modal State
  const [statusTarget, setStatusTarget] = useState(null);
  const [newStatus, setNewStatus] = useState('pendiente');
  const [savingStatus, setSavingStatus] = useState(false);

  // Mobile Actions Modal State
  const [actionSheetOrder, setActionSheetOrder] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
      fetchCatalog();
    }
  }, [isOpen]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/custom-orders');
      setOrders(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await api.get('/products?per_page=100');
      setCatalogProducts(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Product Selection Handlers
  const handleAddCatalogItem = (prod) => {
    const nextItems = [...selectedItems, { ...prod, qty: 1 }];
    setSelectedItems(nextItems);

    const calcTotal = nextItems.reduce((sum, it) => sum + (parseFloat(it.sale_price || 0) * (it.qty || 1)), 0);
    setTotal(calcTotal.toFixed(2));
    setDeposit((calcTotal * 0.5).toFixed(2));

    const itemNames = nextItems.map(it => `${it.qty}x ${it.name}`).join(', ');
    setDescription(prev => prev ? `${prev} + ${prod.name}` : `Pedido: ${itemNames}`);

    setProductSearch('');
    setIsProductPickerOpen(false);
  };

  const handleRemoveCatalogItem = (idx) => {
    const nextItems = selectedItems.filter((_, i) => i !== idx);
    setSelectedItems(nextItems);
    const calcTotal = nextItems.reduce((sum, it) => sum + (parseFloat(it.sale_price || 0) * (it.qty || 1)), 0);
    setTotal(calcTotal > 0 ? calcTotal.toFixed(2) : '');
    setDeposit(calcTotal > 0 ? (calcTotal * 0.5).toFixed(2) : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !description || !requiredDate) {
      toast.error('Completa los campos obligatorios (*)');
      return;
    }

    const totalNum = parseFloat(total) || 0;
    const depositNum = parseFloat(deposit) || 0;

    try {
      setLoading(true);
      const res = await api.post('/custom-orders', {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        description,
        reference_link: referenceLink || null,
        reference_image_url: referenceImageUrl || null,
        required_date: requiredDate,
        total: totalNum,
        deposit_amount: depositNum
      });

      toast.success('¡Pedido especial registrado exitosamente!');

      setSuccessOrderData({
        order_number: res.data?.data?.order?.order_number,
        customer_name: customerName,
        total: totalNum,
        deposit: depositNum,
        pending: Math.max(0, totalNum - depositNum),
        whatsapp_url: res.data?.data?.whatsapp_url
      });

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setDescription('');
      setReferenceLink('');
      setReferenceImageUrl('');
      setRequiredDate('');
      setTotal('');
      setDeposit('');
      setSelectedItems([]);
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al registrar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentTarget) return;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    try {
      setSavingPayment(true);
      const res = await api.post(`/custom-orders/${paymentTarget.id}/payments`, {
        amount: amt,
        payment_method: 'efectivo',
        notes: 'Abono realizado en caja'
      });

      toast.success('Abono registrado con éxito');
      setPaymentTarget(null);
      setPaymentAmount('');
      fetchOrders();

      if (res.data?.data?.whatsapp_url) {
        window.open(res.data.data.whatsapp_url, '_blank');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar abono');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!statusTarget) return;

    try {
      setSavingStatus(true);
      await api.put(`/custom-orders/${statusTarget.id}/status`, {
        status: newStatus
      });

      toast.success('Estado del pedido actualizado');
      setStatusTarget(null);
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar estado');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDirectWhatsApp = (ord) => {
    const cleanPhone = ord.customer_phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const reqDate = new Date(ord.required_date).toLocaleString();
    const text = `🎨 *${import.meta.env.VITE_APP_NAME?.toUpperCase() || 'TIENDA'} - PEDIDO ESPECIAL #${ord.order_number}*\nHola ${ord.customer_name}, le compartimos los detalles de su pedido:\n📅 Entrega: ${reqDate}\n📝 Descripción: ${ord.description}\n💰 Total: $${ord.total}\n💵 Anticipo: $${ord.deposit_amount}\n🔴 *SALDO PENDIENTE: $${ord.pending_balance}*\nℹ️ Estado: ${ord.status.toUpperCase()}\n¡Muchas gracias por su preferencia! ✨`;
    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredOrders = orders.filter((ord) => {
    const matchSearch =
      ord.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customer_phone?.includes(searchTerm);
    const matchStatus = !statusFilter || ord.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case 'pendiente':
        return <span className="bg-[#fef9c3] text-[#854d0e] font-bold text-[10px] px-2 py-0.5 rounded-full">Pendiente</span>;
      case 'en_proceso':
        return <span className="bg-[#eff4ff] text-[#005479] font-bold text-[10px] px-2 py-0.5 rounded-full">En Proceso</span>;
      case 'completado':
        return <span className="bg-[#dcfce7] text-[#15803d] font-bold text-[10px] px-2 py-0.5 rounded-full">Listo / Completado</span>;
      case 'entregado':
        return <span className="bg-[#eff4ff] text-[#630ed4] font-bold text-[10px] px-2 py-0.5 rounded-full">Entregado</span>;
      case 'cancelado':
        return <span className="bg-[#fee2e2] text-[#b91c1c] font-bold text-[10px] px-2 py-0.5 rounded-full">Cancelado</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full">{st}</span>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Pedidos Especiales" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Tab Toggle */}
        <div className="flex bg-[#eff4ff] p-1 rounded-xl border border-[#ccc3d8]/40">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'new' ? 'bg-[#630ed4] text-white shadow-xs' : 'text-[#0b1c30] hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Registrar Nuevo Pedido</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              fetchOrders();
            }}
            className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'list' ? 'bg-[#630ed4] text-white shadow-xs' : 'text-[#0b1c30] hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">list_alt</span>
            <span>Ver Pedidos ({orders.length})</span>
          </button>
        </div>

        {/* TAB 1: NEW SPECIAL ORDER */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Customer info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#ccc3d8]/40">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: María Elena Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Teléfono WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 5512345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Opcional"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Product Picker */}
            <div className="space-y-2 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#ccc3d8]/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0b1c30] uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#630ed4]">inventory_2</span>
                  <span>Seleccionar Producto del Catálogo (Opcional)</span>
                </label>
                <span className="text-[11px] text-[#7b7487]">Calcula el monto automáticamente</span>
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7487] text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar producto o servicio para agregar..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setIsProductPickerOpen(true);
                      }}
                      onFocus={() => setIsProductPickerOpen(true)}
                      className="w-full min-h-[38px] pl-9 pr-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#630ed4]"
                    />
                  </div>
                </div>

                {isProductPickerOpen && productSearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#ccc3d8] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-[#e5eeff]">
                    {catalogProducts
                      .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()))
                      .slice(0, 10)
                      .map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddCatalogItem(prod)}
                          className="w-full p-2.5 text-left hover:bg-[#eff4ff] flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-[#0b1c30]">{prod.name}</span>
                            <span className="text-[11px] text-[#7b7487] ml-2 font-mono">SKU: {prod.sku}</span>
                          </div>
                          <span className="font-bold text-[#630ed4] font-mono">${parseFloat(prod.sale_price || 0).toFixed(2)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedItems.map((it, idx) => (
                    <span key={idx} className="bg-white border border-[#ccc3d8] text-[#0b1c30] text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                      <span>{it.name} (${parseFloat(it.sale_price).toFixed(2)})</span>
                      <button type="button" onClick={() => handleRemoveCatalogItem(idx)} className="text-[#ba1a1a] hover:bg-red-50 rounded-full w-4 h-4 inline-flex items-center justify-center">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description & Reference Links */}
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Descripción del Trabajo Especial *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ej: Oblea comestible tamaño carta diseño Paw Patrol con nombre Mateo - 4 Años"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#7b7487] uppercase">Enlace de Referencia (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://pinterest.com/pin/..."
                    value={referenceLink}
                    onChange={(e) => setReferenceLink(e.target.value)}
                    className="w-full min-h-[38px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#7b7487] uppercase">URL Imagen de Referencia (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://imgur.com/..."
                    value={referenceImageUrl}
                    onChange={(e) => setReferenceImageUrl(e.target.value)}
                    className="w-full min-h-[38px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Financial and Date details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#eff4ff] p-3.5 rounded-2xl border border-[#ccc3d8]/40">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Fecha y Hora Entrega *</label>
                <input
                  type="datetime-local"
                  required
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Costo Total ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="w-full min-h-[38px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-sm font-mono font-black text-[#0b1c30] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Anticipo / Garantía ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="w-full min-h-[38px] px-3 bg-white border-2 border-[#630ed4] rounded-xl text-sm font-mono font-black text-green-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-[#4a4455] flex items-center justify-between">
              <span>Saldo Restante a liquidar al entregar:</span>
              <span className="font-black font-mono text-base text-[#ba1a1a]">
                ${Math.max(0, (parseFloat(total) || 0) - (parseFloat(deposit) || 0)).toFixed(2)}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#e5eeff]">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
              >
                Cancelar
              </button>
              <TouchButton
                type="submit"
                disabled={loading}
                variant="primary"
                size="md"
                icon="send_and_archive"
                className="min-h-[42px] px-6 text-xs font-bold shadow-md"
              >
                {loading ? 'Registrando...' : 'Registrar Pedido'}
              </TouchButton>
            </div>
          </form>
        )}

        {/* TAB 2: LIST ORDERS */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7487] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar por cliente, folio o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full min-h-[38px] pl-9 pr-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-[38px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="">Todos los Estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="en_proceso">En Proceso</option>
                <option value="completado">Listos</option>
                <option value="entregado">Entregados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            <div className="max-h-80 overflow-y-auto border border-[#ccc3d8]/40 rounded-xl bg-white">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7b7487]">No se encontraron pedidos registrados.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9ff] text-[10px] uppercase text-[#7b7487] font-semibold border-b border-[#e5eeff] sticky top-0">
                    <tr>
                      <th className="p-2.5 text-center">Acciones</th>
                      <th className="p-2.5">Folio</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Descripción / Entrega</th>
                      <th className="p-2.5 text-right">Total / Saldo</th>
                      <th className="p-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff]">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#eff4ff]/30">
                        <td className="p-2.5 text-center">
                          {/* Mobile 3-Dots Action Button */}
                          <div className="sm:hidden flex justify-center">
                            <button
                              type="button"
                              onClick={() => setActionSheetOrder(ord)}
                              className="w-8 h-8 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] border border-[#630ed4]/30 flex items-center justify-center shadow-2xs active:scale-95 transition-all"
                              title="Acciones"
                              aria-label="Acciones"
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                          </div>

                          {/* Desktop Horizontal Icons */}
                          <div className="hidden sm:flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setStatusTarget(ord);
                                setNewStatus(ord.status);
                              }}
                              className="w-7 h-7 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] flex items-center justify-center transition-all shadow-2xs"
                              title="Cambiar Estado"
                            >
                              <span className="material-symbols-outlined text-[15px]">sync_alt</span>
                            </button>
                            {parseFloat(ord.pending_balance) > 0 && ord.status !== 'cancelado' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentTarget(ord);
                                  setPaymentAmount(ord.pending_balance);
                                }}
                                className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 flex items-center justify-center transition-all shadow-2xs"
                                title="Abonar a Saldo"
                              >
                                <span className="material-symbols-outlined text-[15px]">payments</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDirectWhatsApp(ord)}
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-all shadow-2xs"
                              title="Enviar por WhatsApp"
                            >
                              <span className="material-symbols-outlined text-[15px]">chat</span>
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[#630ed4]">{ord.order_number}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-[#0b1c30]">{ord.customer_name}</div>
                          <div className="text-[10px] text-[#7b7487] font-mono">{ord.customer_phone}</div>
                        </td>
                        <td className="p-2.5 max-w-[180px]">
                          <div className="line-clamp-1 font-medium text-[#0b1c30]">{ord.description}</div>
                          <div className="text-[10px] text-[#630ed4] font-bold">
                            📅 {new Date(ord.required_date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          <div className="font-bold text-[#0b1c30]">${parseFloat(ord.total).toFixed(2)}</div>
                          <div className={`text-[10px] font-bold ${parseFloat(ord.pending_balance) > 0 ? 'text-[#ba1a1a]' : 'text-green-700'}`}>
                            {parseFloat(ord.pending_balance) > 0 ? `Resta: $${parseFloat(ord.pending_balance).toFixed(2)}` : '✓ Liquidado'}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">{getStatusBadge(ord.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Success / WhatsApp Modal (No browser alert) */}
      <Modal
        isOpen={Boolean(successOrderData)}
        onClose={() => setSuccessOrderData(null)}
        title="¡Pedido Especial Registrado con Éxito!"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-green-100 text-green-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-[#0b1c30]">Folio #{successOrderData?.order_number}</h3>
            <p className="text-xs text-[#7b7487]">Cliente: <strong>{successOrderData?.customer_name}</strong></p>
          </div>

          <div className="p-3 bg-[#f8f9ff] rounded-2xl border border-[#ccc3d8]/40 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span>Total Pedido:</span>
              <span className="font-bold">${successOrderData?.total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Anticipo Recibido:</span>
              <span className="font-bold">${successOrderData?.deposit?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#ba1a1a] border-t border-[#ccc3d8]/30 pt-1 font-bold">
              <span>Saldo Pendiente:</span>
              <span>${successOrderData?.pending?.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {successOrderData?.whatsapp_url && (
              <a
                href={successOrderData.whatsapp_url}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>Enviar Comprobante por WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setSuccessOrderData(null)}
              className="w-full min-h-[40px] px-4 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-bold hover:bg-[#dce9ff]"
            >
              Cerrar y Continuar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Registrar Abono */}
      <Modal
        isOpen={Boolean(paymentTarget)}
        onClose={() => setPaymentTarget(null)}
        title={`Abonar al Pedido #${paymentTarget?.order_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#ccc3d8]/40 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Cliente:</span>
              <strong className="text-[#0b1c30]">{paymentTarget?.customer_name}</strong>
            </div>
            <div className="flex justify-between text-[#ba1a1a]">
              <span>Saldo Pendiente:</span>
              <strong className="font-mono text-sm">${parseFloat(paymentTarget?.pending_balance || 0).toFixed(2)}</strong>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Monto del Abono ($) *</label>
            <input
              type="number"
              step="0.01"
              required
              max={paymentTarget?.pending_balance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full min-h-[42px] px-3 bg-white border-2 border-[#630ed4] rounded-xl text-base font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setPaymentTarget(null)}
              className="min-h-[40px] px-4 rounded-xl border border-[#ccc3d8] text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingPayment}
              className="min-h-[40px] px-5 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md"
            >
              {savingPayment ? 'Registrando...' : 'Confirmar Abono'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cambiar Estado */}
      <Modal
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        title={`Cambiar Estado: #${statusTarget?.order_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Nuevo Estado del Pedido</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En Proceso de Elaboración</option>
              <option value="completado">Listo para Entrega</option>
              <option value="entregado">Entregado al Cliente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setStatusTarget(null)}
              className="min-h-[40px] px-4 rounded-xl border border-[#ccc3d8] text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingStatus}
              className="min-h-[40px] px-5 rounded-xl bg-[#630ed4] text-white text-xs font-bold shadow-md"
            >
              {savingStatus ? 'Guardando...' : 'Actualizar Estado'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Acciones en Móvil */}
      <Modal
        isOpen={Boolean(actionSheetOrder)}
        onClose={() => setActionSheetOrder(null)}
        title={actionSheetOrder ? `Acciones: Pedido #${actionSheetOrder.order_number}` : 'Acciones'}
        maxWidth="max-w-sm"
      >
        {actionSheetOrder && (
          <div className="space-y-3">
            <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#ccc3d8]/40 text-xs space-y-1">
              <div className="font-bold text-sm text-[#0b1c30]">{actionSheetOrder.customer_name}</div>
              <div className="text-[#7b7487] font-mono">{actionSheetOrder.customer_phone}</div>
              <div className="flex items-center justify-between pt-1 border-t border-[#e5eeff]">
                <span>Total: <strong className="font-mono">${parseFloat(actionSheetOrder.total).toFixed(2)}</strong></span>
                <span className={parseFloat(actionSheetOrder.pending_balance) > 0 ? 'text-[#ba1a1a] font-bold font-mono' : 'text-green-700 font-bold font-mono'}>
                  {parseFloat(actionSheetOrder.pending_balance) > 0 ? `Resta: $${parseFloat(actionSheetOrder.pending_balance).toFixed(2)}` : '✓ Liquidado'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {/* Cambiar Estado */}
              <button
                type="button"
                onClick={() => {
                  const target = actionSheetOrder;
                  setActionSheetOrder(null);
                  setStatusTarget(target);
                  setNewStatus(target.status);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] text-xs font-bold flex items-center gap-3 border border-[#630ed4]/20 shadow-2xs active:scale-95 transition-all text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-[#630ed4] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                </span>
                <div>
                  <div>Cambiar Estado</div>
                  <div className="text-[10px] text-[#7b7487] font-normal">Pendiente, proceso, listo o entregado</div>
                </div>
              </button>

              {/* Registrar Abono */}
              {parseFloat(actionSheetOrder.pending_balance) > 0 && actionSheetOrder.status !== 'cancelado' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = actionSheetOrder;
                    setActionSheetOrder(null);
                    setPaymentTarget(target);
                    setPaymentAmount(target.pending_balance);
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 text-xs font-bold flex items-center gap-3 border border-green-200 shadow-2xs active:scale-95 transition-all text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                  </span>
                  <div>
                    <div>Registrar Abono</div>
                    <div className="text-[10px] text-green-700 font-normal">Abonar saldo pendiente al pedido</div>
                  </div>
                </button>
              )}

              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  const target = actionSheetOrder;
                  setActionSheetOrder(null);
                  handleDirectWhatsApp(target);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold flex items-center gap-3 border border-[#25D366]/30 shadow-2xs active:scale-95 transition-all text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </span>
                <div>
                  <div>Enviar WhatsApp</div>
                  <div className="text-[10px] text-[#128C7E] font-normal">Comprobante y actualización</div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-[#e5eeff]">
              <button
                type="button"
                onClick={() => setActionSheetOrder(null)}
                className="w-full min-h-[38px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  );
}
