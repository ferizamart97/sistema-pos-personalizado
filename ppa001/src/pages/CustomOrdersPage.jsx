import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';

export default function CustomOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create Order Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    description: '',
    required_date: '',
    total: '',
    deposit_amount: '',
    notes: '',
    reference_link: '',
    reference_image_url: '',
    items: []
  });
  const [itemSearch, setItemSearch] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Success / WhatsApp Prompt Modal (Instead of browser window.confirm)
  const [createdOrderData, setCreatedOrderData] = useState(null);

  // Status Change Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [refundType, setRefundType] = useState('efectivo');
  const [refundAmount, setRefundAmount] = useState('');

  // Payment / Abono Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [savingPayment, setSavingPayment] = useState(false);

  // Mobile Actions Modal State
  const [actionSheetOrder, setActionSheetOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [ordRes, prodRes] = await Promise.all([
        api.get('/custom-orders', { params }),
        api.get('/products', { params: { per_page: 200 } })
      ]);
      setOrders(ordRes.data.data || []);
      setProductsList(prodRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar pedidos especiales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  // Create Order Handlers
  const handleOpenCreateModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const dateStr = tomorrow.toISOString().slice(0, 16);

    setCreateFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      description: '',
      required_date: dateStr,
      total: '',
      deposit_amount: '',
      notes: '',
      reference_link: '',
      reference_image_url: '',
      items: []
    });
    setItemSearch('');
    setIsCreateModalOpen(true);
  };

  const handleAddItemToOrder = (prod) => {
    const existing = createFormData.items.find(i => i.product_id === prod.id);
    let nextItems = [];
    if (existing) {
      nextItems = createFormData.items.map(i => i.product_id === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      nextItems = [
        ...createFormData.items,
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: parseFloat(prod.sale_price || 0)
        }
      ];
    }

    const calculatedTotal = nextItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
    const generatedDesc = nextItems.map(it => `${it.quantity}x ${it.product_name}`).join(', ');

    setCreateFormData(prev => ({
      ...prev,
      items: nextItems,
      total: calculatedTotal.toFixed(2),
      description: prev.description ? `${prev.description}\n${generatedDesc}` : generatedDesc
    }));
    setItemSearch('');
    setIsProductPickerOpen(false);
  };

  const handleRemoveItem = (idx) => {
    const nextItems = createFormData.items.filter((_, i) => i !== idx);
    const calculatedTotal = nextItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
    setCreateFormData(prev => ({
      ...prev,
      items: nextItems,
      total: nextItems.length > 0 ? calculatedTotal.toFixed(2) : prev.total
    }));
  };

  const handleItemQtyChange = (idx, qty) => {
    const val = Math.max(1, parseFloat(qty) || 1);
    const nextItems = [...createFormData.items];
    nextItems[idx].quantity = val;
    const calculatedTotal = nextItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
    setCreateFormData(prev => ({
      ...prev,
      items: nextItems,
      total: calculatedTotal.toFixed(2)
    }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!createFormData.customer_name || !createFormData.customer_phone || !createFormData.description || !createFormData.required_date) {
      toast.error('Nombre, teléfono, descripción y fecha de entrega son obligatorios');
      return;
    }

    const total = parseFloat(createFormData.total) || 0;
    const deposit = parseFloat(createFormData.deposit_amount) || 0;

    if (total <= 0) {
      toast.error('El monto total debe ser mayor a $0');
      return;
    }

    try {
      setSavingOrder(true);
      // Combine description, reference link and image into notes
      let fullNotes = createFormData.notes || '';
      if (createFormData.reference_link) {
        fullNotes += `\n[Enlace Ref]: ${createFormData.reference_link}`;
      }
      if (createFormData.reference_image_url) {
        fullNotes += `\n[Foto Ref]: ${createFormData.reference_image_url}`;
      }

      const res = await api.post('/custom-orders', {
        ...createFormData,
        notes: fullNotes.trim(),
        total,
        deposit_amount: deposit
      });

      toast.success('Pedido especial registrado exitosamente');
      setIsCreateModalOpen(false);
      fetchOrders();

      if (res.data?.data?.whatsapp_url) {
        setCreatedOrderData({
          order: res.data.data.order,
          whatsapp_url: res.data.data.whatsapp_url
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al crear pedido especial');
    } finally {
      setSavingOrder(false);
    }
  };

  // Status Modal Handlers
  const handleOpenStatusModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setCancelReason(order.cancellation_reason || '');
    setRefundType(order.refund_type || 'efectivo');
    setRefundAmount(order.refund_amount || String(order.deposit_amount || '0'));
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await api.put(`/custom-orders/${selectedOrder.id}/status`, {
        status: newStatus,
        cancellation_reason: newStatus.startsWith('cancelado') ? cancelReason : null,
        refund_type: newStatus.startsWith('cancelado') ? refundType : null,
        refund_amount: newStatus.startsWith('cancelado') ? parseFloat(refundAmount) || 0 : 0
      });

      toast.success('Estado del pedido actualizado');
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al actualizar estado');
    }
  };

  // Payment / Abono Handlers
  const handleOpenPaymentModal = (order) => {
    setPaymentOrder(order);
    setPaymentAmount(String(order.pending_balance || '0'));
    setPaymentMethod('efectivo');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentOrder) return;
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      toast.error('Ingresa un monto de abono válido');
      return;
    }

    try {
      setSavingPayment(true);
      const newPending = Math.max(0, (parseFloat(paymentOrder.pending_balance) || 0) - amount);

      await api.put(`/custom-orders/${paymentOrder.id}/status`, {
        status: newPending === 0 ? 'listo' : paymentOrder.status
      });

      toast.success(`Abono de $${amount.toFixed(2)} registrado con éxito`);
      setIsPaymentModalOpen(false);
      setPaymentOrder(null);
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar abono');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSendWhatsApp = (order) => {
    if (!order || !order.customer_phone) {
      toast.error('El pedido no cuenta con número telefónico válido');
      return;
    }
    const cleanPhone = order.customer_phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const text = `📋 *ACTUALIZACIÓN DE PEDIDO #${order.order_number}*\nHola ${order.customer_name}, le informamos que su pedido se encuentra en estado: *${order.status.toUpperCase()}*.\n📅 Fecha de Entrega: ${new Date(order.required_date).toLocaleString()}\n💰 Total: $${order.total}\n💵 Anticipo: $${order.deposit_amount}\n🔴 Saldo Pendiente: $${order.pending_balance}\n¡Muchas gracias! ✨`;
    const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'pendiente':
        return <span className="bg-[#fef9c3] text-[#854d0e] font-bold text-xs px-2.5 py-1 rounded-full">Pendiente</span>;
      case 'en_proceso':
        return <span className="bg-[#eff4ff] text-[#005479] font-bold text-xs px-2.5 py-1 rounded-full">En Proceso</span>;
      case 'listo':
        return <span className="bg-[#dcfce7] text-[#15803d] font-bold text-xs px-2.5 py-1 rounded-full">Listo para Entrega</span>;
      case 'entregado':
        return <span className="bg-[#eff4ff] text-[#630ed4] font-bold text-xs px-2.5 py-1 rounded-full">Entregado</span>;
      case 'cancelado_reembolso':
        return <span className="bg-[#ffdad6] text-[#ba1a1a] font-bold text-xs px-2.5 py-1 rounded-full">Cancelado (Reembolso)</span>;
      case 'cancelado_cambio':
        return <span className="bg-[#ffeedd] text-[#ea580c] font-bold text-xs px-2.5 py-1 rounded-full">Cancelado (Cambio)</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{st}</span>;
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (o.order_number && o.order_number.toLowerCase().includes(s)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(s)) ||
      (o.customer_phone && o.customer_phone.includes(s)) ||
      (o.description && o.description.toLowerCase().includes(s))
    );
  });

  const columns = [
    {
      header: 'Acciones',
      render: (item) => (
        <div>
          {/* Mobile 3-Dots Action Button */}
          <div className="lg:hidden flex justify-center">
            <button
              type="button"
              onClick={() => setActionSheetOrder(item)}
              className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] border border-[#630ed4]/30 flex items-center justify-center shadow-2xs active:scale-95 transition-all"
              title="Acciones"
              aria-label="Acciones"
            >
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>

          {/* Desktop Horizontal Icons */}
          <div className="hidden lg:flex items-center gap-1.5">
            {/* Change Status Icon Button */}
            <button
              type="button"
              onClick={() => handleOpenStatusModal(item)}
              className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] flex items-center justify-center transition-all active:scale-95 shadow-2xs"
              title="Cambiar estado del pedido"
            >
              <span className="material-symbols-outlined text-[20px]">sync_alt</span>
            </button>

            {/* Abono Icon Button */}
            {parseFloat(item.pending_balance) > 0 && item.status !== 'cancelado_reembolso' && item.status !== 'cancelado_cambio' && (
              <button
                type="button"
                onClick={() => handleOpenPaymentModal(item)}
                className="w-9 h-9 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                title="Registrar abono a saldo"
              >
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </button>
            )}

            {/* WhatsApp Icon Button */}
            <button
              type="button"
              onClick={() => handleSendWhatsApp(item)}
              className="w-9 h-9 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] flex items-center justify-center transition-all active:scale-95 shadow-2xs"
              title="Enviar mensaje o comprobante por WhatsApp"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </button>
          </div>
        </div>
      )
    },
    {
      header: 'Pedido #',
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-sm text-[#630ed4]">{item.order_number}</span>
          <div className="text-xs text-[#7b7487]">{new Date(item.created_at).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      header: 'Cliente',
      render: (item) => (
        <div>
          <div className="font-bold text-sm sm:text-base text-[#0b1c30]">{item.customer_name}</div>
          <div className="text-xs text-[#7b7487] font-mono">{item.customer_phone}</div>
        </div>
      )
    },
    {
      header: 'Descripción & Referencias',
      render: (item) => (
        <div className="max-w-xs space-y-1">
          <p className="text-sm text-[#0b1c30] line-clamp-2">{item.description}</p>
          {item.notes && (
            <p className="text-xs text-[#7b7487] line-clamp-2 italic">
              {item.notes}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Fecha Entrega',
      render: (item) => {
        const d = new Date(item.required_date);
        const isPast = d < new Date() && item.status !== 'entregado';
        return (
          <div>
            <div className={`font-bold text-sm sm:text-base ${isPast ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'}`}>
              {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {isPast && <span className="text-xs text-[#ba1a1a] font-bold">¡Vencido / Urgente!</span>}
          </div>
        );
      }
    },
    {
      header: 'Montos ($)',
      render: (item) => (
        <div className="font-mono text-sm">
          <div className="text-[#7b7487]">Total: <strong className="text-[#0b1c30]">${parseFloat(item.total).toFixed(2)}</strong></div>
          <div className="text-green-700">Anticipo: ${parseFloat(item.deposit_amount).toFixed(2)}</div>
          <div className={`font-bold ${parseFloat(item.pending_balance) > 0 ? 'text-[#ba1a1a]' : 'text-green-700'}`}>
            Resta: ${parseFloat(item.pending_balance).toFixed(2)}
          </div>
        </div>
      )
    },
    {
      header: 'Estado',
      render: (item) => getStatusBadge(item.status)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0b1c30] tracking-tight">Pedidos Personalizados & Especiales</h1>
          <p className="text-xs text-[#7b7487]">
            Registro de pedidos especiales, selección de artículos del catálogo, fotos de referencia y anticipos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="min-h-[42px] px-4 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Nuevo Pedido Especial</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7487] text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono, folio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[40px] pl-9 pr-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#630ed4]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[40px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-bold focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_proceso">En Proceso</option>
            <option value="listo">Listos para Entrega</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado_reembolso">Cancelados (Reembolso)</option>
            <option value="cancelado_cambio">Cancelados (Cambio)</option>
          </select>
        </div>

        <div className="text-xs text-[#7b7487] font-semibold">
          Total: <strong className="text-[#0b1c30]">{filteredOrders.length}</strong> pedidos
        </div>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        loading={loading}
        emptyMessage="No se encontraron pedidos especiales registrados."
      />

      {/* Modal Crear Pedido Especial */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !savingOrder && setIsCreateModalOpen(false)}
        title="Registrar Nuevo Pedido Especial"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#f8f9ff] p-4 rounded-2xl border border-[#ccc3d8]/40">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre del Cliente *</label>
              <input
                type="text"
                required
                placeholder="Ej: Mariana López"
                value={createFormData.customer_name}
                onChange={(e) => setCreateFormData({ ...createFormData, customer_name: e.target.value })}
                className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Teléfono WhatsApp *</label>
              <input
                type="tel"
                required
                placeholder="Ej: 5512345678"
                value={createFormData.customer_phone}
                onChange={(e) => setCreateFormData({ ...createFormData, customer_phone: e.target.value })}
                className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Correo Electrónico (Opcional)</label>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={createFormData.customer_email}
                onChange={(e) => setCreateFormData({ ...createFormData, customer_email: e.target.value })}
                className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Fecha y Hora de Entrega *</label>
              <input
                type="datetime-local"
                required
                value={createFormData.required_date}
                onChange={(e) => setCreateFormData({ ...createFormData, required_date: e.target.value })}
                className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          {/* Product Picker to Auto-Fill Items & Total */}
          <div className="space-y-2 bg-[#f8f9ff] p-4 rounded-2xl border border-[#ccc3d8]/40">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-[#0b1c30]">Agregar Artículos del Catálogo (Opcional)</h4>
              <span className="text-[11px] text-[#7b7487]">Calcula automáticamente el total y la descripción</span>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7487] text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar producto para agregar al pedido..."
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setIsProductPickerOpen(true);
                }}
                onFocus={() => setIsProductPickerOpen(true)}
                className="w-full min-h-[40px] pl-9 pr-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
              />

              {isProductPickerOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#ccc3d8] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-[#e5eeff]">
                  {productsList
                    .filter(p => !itemSearch || p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.sku.toLowerCase().includes(itemSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddItemToOrder(prod)}
                        className="w-full p-2.5 text-left hover:bg-[#eff4ff] flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-[#0b1c30]">{prod.name}</span>
                          <span className="text-[11px] text-[#7b7487] ml-2 font-mono">SKU: {prod.sku}</span>
                        </div>
                        <span className="font-bold text-[#630ed4]">${parseFloat(prod.sale_price || 0).toFixed(2)}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {createFormData.items.length > 0 && (
              <div className="bg-white rounded-xl border border-[#ccc3d8]/40 overflow-hidden mt-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9ff] text-[11px] uppercase text-[#7b7487] border-b border-[#e5eeff]">
                    <tr>
                      <th className="p-2">Producto</th>
                      <th className="p-2 text-right">Precio</th>
                      <th className="p-2 text-center">Cantidad</th>
                      <th className="p-2 text-right">Subtotal</th>
                      <th className="p-2 text-right">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff]">
                    {createFormData.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-bold text-[#0b1c30]">{it.product_name}</td>
                        <td className="p-2 text-right font-mono">${it.unit_price.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                            className="w-14 text-center border rounded p-1 font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-[#630ed4]">${(it.unit_price * it.quantity).toFixed(2)}</td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="w-6 h-6 bg-[#ffdad6] text-[#ba1a1a] rounded inline-flex items-center justify-center"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Descripción Detallada del Pedido *</label>
            <textarea
              required
              rows={3}
              placeholder="Ej: 20 Centros de mesa temáticos de Mario Bros con 500g de dulces surtidos c/u..."
              value={createFormData.description}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              className="w-full p-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            ></textarea>
          </div>

          {/* References & Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#f8f9ff] p-4 rounded-2xl border border-[#ccc3d8]/40">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#630ed4]">link</span>
                <span>Enlace de Referencia (Pinterest/Instagram)</span>
              </label>
              <input
                type="url"
                placeholder="https://pin.it/..."
                value={createFormData.reference_link}
                onChange={(e) => setCreateFormData({ ...createFormData, reference_link: e.target.value })}
                className="w-full min-h-[38px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#630ed4]">image</span>
                <span>URL de Imagen de Referencia</span>
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={createFormData.reference_image_url}
                onChange={(e) => setCreateFormData({ ...createFormData, reference_image_url: e.target.value })}
                className="w-full min-h-[38px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing & Deposit calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50 p-4 rounded-2xl border border-amber-200">
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-900 uppercase">Monto Total ($) *</label>
              <input
                type="number"
                step="1"
                required
                placeholder="Ej: 1500"
                value={createFormData.total}
                onChange={(e) => setCreateFormData({ ...createFormData, total: e.target.value })}
                className="w-full min-h-[40px] px-3 bg-white border border-amber-300 rounded-xl text-sm font-mono font-black text-[#0b1c30] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-900 uppercase">Anticipo Inicial ($)</label>
              <input
                type="number"
                step="1"
                placeholder="Ej: 500"
                value={createFormData.deposit_amount}
                onChange={(e) => setCreateFormData({ ...createFormData, deposit_amount: e.target.value })}
                className="w-full min-h-[40px] px-3 bg-white border border-amber-300 rounded-xl text-sm font-mono font-black text-green-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-900 uppercase">Saldo Pendiente ($)</label>
              <div className="min-h-[40px] px-3 bg-white border border-amber-300 rounded-xl flex items-center font-mono font-black text-sm text-[#ba1a1a]">
                ${Math.max(0, (parseFloat(createFormData.total) || 0) - (parseFloat(createFormData.deposit_amount) || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Notas Internas</label>
            <input
              type="text"
              placeholder="Instrucciones especiales de preparación..."
              value={createFormData.notes}
              onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
              className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingOrder}
              className="min-h-[44px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95"
            >
              {savingOrder ? 'Registrando...' : 'Registrar Pedido'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Success / WhatsApp Prompt Custom Modal */}
      <Modal
        isOpen={Boolean(createdOrderData)}
        onClose={() => setCreatedOrderData(null)}
        title="¡Pedido Registrado con Éxito!"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center p-2">
          <div className="w-14 h-14 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
          </div>

          <div>
            <h3 className="text-base font-black text-[#0b1c30]">
              Pedido #{createdOrderData?.order?.order_number}
            </h3>
            <p className="text-xs text-[#7b7487] mt-1">
              El pedido para <strong>{createdOrderData?.order?.customer_name}</strong> ha sido guardado correctamente.
            </p>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-bold">${parseFloat(createdOrderData?.order?.total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-800">
              <span>Anticipo:</span>
              <span className="font-bold">${parseFloat(createdOrderData?.order?.deposit_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#ba1a1a] font-bold">
              <span>Saldo Restante:</span>
              <span>${parseFloat(createdOrderData?.order?.pending_balance || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreatedOrderData(null)}
              className="min-h-[42px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                if (createdOrderData?.whatsapp_url) {
                  window.open(createdOrderData.whatsapp_url, '_blank');
                }
                setCreatedOrderData(null);
              }}
              className="min-h-[42px] px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>Enviar WhatsApp</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Cambiar Estado */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Actualizar Estado: Pedido #${selectedOrder.order_number}` : ''}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Nuevo Estado *</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En Proceso</option>
              <option value="listo">Listo para Entrega</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado_reembolso">Cancelado con Reembolso</option>
              <option value="cancelado_cambio">Cancelado por Cambio de Producto</option>
            </select>
          </div>

          {newStatus.startsWith('cancelado') && (
            <div className="space-y-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-red-900 uppercase">Motivo de Cancelación *</label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explica el motivo de la cancelación..."
                  className="w-full p-2 bg-white border border-red-300 rounded-lg text-xs"
                ></textarea>
              </div>

              {newStatus === 'cancelado_reembolso' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-red-900 uppercase">Monto a Reembolsar ($)</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full min-h-[38px] px-2 bg-white border border-red-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="min-h-[42px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95"
            >
              Actualizar Estado
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Registrar Abono */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !savingPayment && setIsPaymentModalOpen(false)}
        title={paymentOrder ? `Registrar Abono: Pedido #${paymentOrder.order_number}` : ''}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div className="p-3 bg-[#eff4ff] rounded-xl border border-[#ccc3d8]/40 space-y-1 text-xs">
            <div className="text-[#7b7487]">Cliente: <strong className="text-[#0b1c30]">{paymentOrder?.customer_name}</strong></div>
            <div className="text-[#7b7487]">Saldo Pendiente: <strong className="text-[#ba1a1a] font-mono">${parseFloat(paymentOrder?.pending_balance || 0).toFixed(2)}</strong></div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Monto a Abonar ($) *</label>
            <input
              type="number"
              step="1"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-sm font-mono font-black text-green-700 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Método de Pago *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta (Débito/Crédito)</option>
              <option value="transferencia">Transferencia SPEI</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="min-h-[42px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingPayment}
              className="min-h-[42px] px-6 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-bold shadow-md active:scale-95"
            >
              {savingPayment ? 'Registrando...' : 'Registrar Abono'}
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
                  {parseFloat(actionSheetOrder.pending_balance) > 0 ? `Resta: $${parseFloat(actionSheetOrder.pending_balance).toFixed(2)}` : 'Liquidado'}
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
                  handleOpenStatusModal(target);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] text-xs font-bold flex items-center gap-3 border border-[#630ed4]/20 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
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
              {parseFloat(actionSheetOrder.pending_balance) > 0 && actionSheetOrder.status !== 'cancelado_reembolso' && actionSheetOrder.status !== 'cancelado_cambio' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = actionSheetOrder;
                    setActionSheetOrder(null);
                    handleOpenPaymentModal(target);
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 text-xs font-bold flex items-center gap-3 border border-green-200 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                  </span>
                  <div>
                    <div>Registrar Abono</div>
                    <div className="text-[10px] text-green-700 font-normal">Abonar saldo al pedido</div>
                  </div>
                </button>
              )}

              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  const target = actionSheetOrder;
                  setActionSheetOrder(null);
                  handleSendWhatsApp(target);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold flex items-center gap-3 border border-[#25D366]/30 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
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
                className="w-full min-h-[38px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
