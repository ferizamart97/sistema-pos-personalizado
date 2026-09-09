import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ImageCapture from '../components/common/ImageCapture';

export default function LayawaysPage() {
  const [layaways, setLayaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Products & Categories for Item Selector
  const [productsList, setProductsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Create Layaway Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    initial_deposit: '',
    payment_method: 'efectivo',
    photo_url: '',
    items: []
  });
  const [savingLayaway, setSavingLayaway] = useState(false);

  // Success / WhatsApp Custom Modal (No browser window.confirm)
  const [successLayawayData, setSuccessLayawayData] = useState(null);

  // Selected Layaway for Payments / Details
  const [selectedLayaway, setSelectedLayaway] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [contactNotes, setContactNotes] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Cancel Confirm Dialog
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Mobile Actions Modal State
  const [actionSheetLayaway, setActionSheetLayaway] = useState(null);

  const fetchLayaways = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [layRes, prodRes, catRes] = await Promise.all([
        api.get('/layaways', { params }),
        api.get('/products', { params: { per_page: 300 } }),
        api.get('/categories')
      ]);
      setLayaways(layRes.data.data || []);
      setProductsList(prodRes.data.data || []);
      setCategoriesList(catRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar apartados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayaways();
  }, [statusFilter]);

  // Create Layaway Handlers
  const handleOpenCreateModal = () => {
    setCreateFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      initial_deposit: '',
      payment_method: 'efectivo',
      items: []
    });
    setSelectedCategoryFilter('');
    setItemSearch('');
    setIsCreateModalOpen(true);
  };

  const handleAddItemToLayaway = (prod) => {
    const existing = createFormData.items.find(i => i.product_id === prod.id);
    if (existing) {
      setCreateFormData(prev => ({
        ...prev,
        items: prev.items.map(i => i.product_id === prod.id ? { ...i, quantity: i.quantity + 1 } : i)
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            product_id: prod.id,
            product_name: prod.name,
            quantity: 1,
            unit_price: parseFloat(prod.sale_price || 0)
          }
        ]
      }));
    }
    setItemSearch('');
    setIsProductPickerOpen(false);
  };

  const handleRemoveItem = (idx) => {
    setCreateFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleItemQtyChange = (idx, qty) => {
    const val = Math.max(1, parseFloat(qty) || 1);
    const next = [...createFormData.items];
    next[idx].quantity = val;
    setCreateFormData(prev => ({ ...prev, items: next }));
  };

  const totalLayawayAmount = createFormData.items.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
  const minRequiredDeposit = (totalLayawayAmount * 0.25);

  const handleCreateLayaway = async (e) => {
    e.preventDefault();
    if (!createFormData.customer_name.trim() || !createFormData.customer_phone.trim()) {
      toast.error('Nombre y teléfono del cliente son requeridos');
      return;
    }
    if (createFormData.items.length === 0) {
      toast.error('Debes agregar al menos 1 producto al apartado');
      return;
    }

    const deposit = parseFloat(createFormData.initial_deposit) || 0;
    if (deposit < minRequiredDeposit) {
      toast.error(`El anticipo mínimo requerido es del 25% ($${minRequiredDeposit.toFixed(2)})`);
      return;
    }

    try {
      setSavingLayaway(true);
      const payload = {
        customer_name: createFormData.customer_name,
        customer_phone: createFormData.customer_phone,
        customer_email: createFormData.customer_email,
        total_amount: totalLayawayAmount,
        initial_deposit: deposit,
        payment_method: createFormData.payment_method,
        photo_url: createFormData.photo_url || null,
        items: createFormData.items
      };

      const res = await api.post('/layaways', payload);
      toast.success('Apartado registrado exitosamente con 30 días de vigencia');
      setIsCreateModalOpen(false);
      fetchLayaways();

      if (res.data?.data?.whatsapp_url) {
        setSuccessLayawayData({
          title: '¡Apartado Registrado con Éxito!',
          folio: res.data.data.layaway?.folio,
          customer: res.data.data.layaway?.customer_name,
          total: totalLayawayAmount,
          paid: deposit,
          pending: Math.max(0, totalLayawayAmount - deposit),
          whatsapp_url: res.data.data.whatsapp_url
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al crear apartado');
    } finally {
      setSavingLayaway(false);
    }
  };

  // Payment / Abono Handlers
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedLayaway) return;

    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      toast.error('Ingresa un monto de abono válido');
      return;
    }

    try {
      setSavingPayment(true);
      const res = await api.post(`/layaways/${selectedLayaway.id}/payments`, {
        amount,
        payment_method: paymentMethod,
        notes: 'Abono registrado desde panel administrativo'
      });

      toast.success('Abono registrado con éxito');

      const waUrl = res.data?.data?.whatsapp_url;
      const curLayaway = selectedLayaway;
      setPaymentAmount('');
      setSelectedLayaway(null);
      fetchLayaways();

      if (waUrl) {
        setSuccessLayawayData({
          title: '¡Abono Registrado!',
          folio: curLayaway.folio,
          customer: curLayaway.customer_name,
          total: parseFloat(curLayaway.total_amount || 0),
          paid: parseFloat(curLayaway.total_paid || 0) + amount,
          pending: Math.max(0, parseFloat(curLayaway.remaining_balance || 0) - amount),
          whatsapp_url: waUrl
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al registrar abono');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleMarkContacted = async (e) => {
    e.preventDefault();
    if (!selectedLayaway) return;

    try {
      await api.patch(`/layaways/${selectedLayaway.id}/contact`, {
        notes: contactNotes || 'Se contactó al cliente para recordar liquidación de apartado.'
      });

      toast.success('Contacto registrado. Se activó el periodo de 10 días de gracia.');
      setIsContactModalOpen(false);
      setSelectedLayaway(null);
      fetchLayaways();
    } catch (err) {
      toast.error('Error al registrar contacto');
    }
  };

  const handleOpenCancelConfirm = (layaway) => {
    setCancelTarget(layaway);
    setIsCancelConfirmOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    try {
      await api.put(`/layaways/${cancelTarget.id}/cancel`, {
        notes: 'Cancelado por decisión del administrador tras vencimiento de plazo.'
      });
      toast.success('Apartado cancelado y mercancía liberada al inventario.');
      setIsCancelConfirmOpen(false);
      setCancelTarget(null);
      fetchLayaways();
    } catch (err) {
      toast.error('Error al cancelar apartado');
    }
  };

  const handleSendWhatsAppReminder = (layaway) => {
    const cleanPhone = layaway.customer_phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const text = `📦 *ESTADO DE APARTADO #${layaway.folio}*\nHola ${layaway.customer_name}, le recordamos el estado de su apartado:\n📅 Fecha Límite: ${new Date(layaway.expiration_date).toLocaleDateString()}\n💰 Total: $${layaway.total_amount}\n💵 Pagado: $${layaway.total_paid}\n🔴 *SALDO RESTANTE: $${layaway.remaining_balance}*\n¡Le esperamos en tienda! ✨`;
    const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'activo':
        return <span className="bg-[#dcfce7] text-[#15803d] font-bold text-xs px-2.5 py-1 rounded-full">Activo (En Vigencia)</span>;
      case 'liquidado':
        return <span className="bg-[#eff4ff] text-[#630ed4] font-bold text-xs px-2.5 py-1 rounded-full">Liquidado / Listo</span>;
      case 'vencido':
        return <span className="bg-[#fee2e2] text-[#b91c1c] font-bold text-xs px-2.5 py-1 rounded-full">Vencido (30 Días)</span>;
      case 'gracia_10_dias':
        return <span className="bg-[#fef9c3] text-[#854d0e] font-bold text-xs px-2.5 py-1 rounded-full">Periodo de Gracia (10d)</span>;
      case 'cancelado':
        return <span className="bg-gray-100 text-gray-700 font-bold text-xs px-2.5 py-1 rounded-full">Cancelado</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{st}</span>;
    }
  };

  const filteredLayaways = layaways.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (l.folio && l.folio.toLowerCase().includes(s)) ||
      (l.customer_name && l.customer_name.toLowerCase().includes(s)) ||
      (l.customer_phone && l.customer_phone.includes(s))
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
              onClick={() => setActionSheetLayaway(item)}
              className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] border border-[#630ed4]/30 flex items-center justify-center shadow-2xs active:scale-95 transition-all"
              title="Acciones"
              aria-label="Acciones"
            >
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>

          {/* Desktop Horizontal Icons */}
          <div className="hidden lg:flex items-center gap-1.5">
            {/* Abono Icon Button */}
            {parseFloat(item.remaining_balance) > 0 && item.status !== 'cancelado' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLayaway(item);
                  setPaymentAmount(String(item.remaining_balance));
                  setPaymentMethod('efectivo');
                }}
                className="w-9 h-9 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                title="Registrar abono semanal o liquidación"
              >
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </button>
            )}

            {/* Contact Grace Period Icon Button */}
            {item.status === 'vencido' && !item.admin_contacted && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLayaway(item);
                  setIsContactModalOpen(true);
                }}
                className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                title="Registrar llamada de contacto (10d gracia)"
              >
                <span className="material-symbols-outlined text-[20px]">phone_in_talk</span>
              </button>
            )}

            {/* Cancel Icon Button */}
            {item.status !== 'cancelado' && item.status !== 'liquidado' && (
              <button
                type="button"
                onClick={() => handleOpenCancelConfirm(item)}
                className="w-9 h-9 rounded-xl bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                title="Cancelar y liberar stock"
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span>
              </button>
            )}

            {/* WhatsApp Icon Button */}
            <button
              type="button"
              onClick={() => handleSendWhatsAppReminder(item)}
              className="w-9 h-9 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] flex items-center justify-center transition-all active:scale-95 shadow-2xs"
              title="Enviar recordatorio WhatsApp"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </button>
          </div>
        </div>
      )
    },
    {
      header: 'Folio',
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-sm text-[#630ed4]">{item.folio}</span>
          <div className="text-xs text-[#7b7487]">{new Date(item.created_at).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      header: 'Cliente / Foto',
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt="Foto apartado"
              className="w-11 h-11 rounded-xl object-cover border border-[#ccc3d8]/60 shadow-2xs shrink-0 cursor-pointer hover:scale-110 transition-transform"
              onClick={() => setSelectedLayaway(item)}
              title="Ver foto del apartado"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-[#eff4ff] text-[#630ed4] flex items-center justify-center font-bold text-xs shrink-0">
              <span className="material-symbols-outlined text-[22px]">savings</span>
            </div>
          )}
          <div>
            <div className="font-bold text-sm sm:text-base text-[#0b1c30]">{item.customer_name}</div>
            <div className="text-xs text-[#7b7487] font-mono">{item.customer_phone}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Artículos',
      render: (item) => (
        <div className="text-xs sm:text-sm text-[#0b1c30] max-w-xs">
          {item.items && item.items.length > 0 ? (
            item.items.map((it, idx) => (
              <div key={idx} className="truncate">
                • {it.quantity}x {it.product_name}
              </div>
            ))
          ) : (
            <span className="text-[#7b7487] italic">Sin detalle</span>
          )}
        </div>
      )
    },
    {
      header: 'Vigencia (30d)',
      render: (item) => {
        const exp = new Date(item.expiration_date);
        const isExpired = exp < new Date() && item.status !== 'liquidado';
        return (
          <div>
            <div className={`font-bold text-sm sm:text-base ${isExpired ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'}`}>
              {exp.toLocaleDateString()}
            </div>
            {isExpired && (
              <div className="text-xs text-[#ba1a1a] font-bold">
                Gracia: {new Date(item.grace_period_end_date).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Finanzas ($)',
      render: (item) => (
        <div className="font-mono text-sm">
          <div className="text-[#7b7487]">Total: <strong className="text-[#0b1c30]">${parseFloat(item.total_amount).toFixed(2)}</strong></div>
          <div className="text-green-700">Abonado: ${parseFloat(item.total_paid).toFixed(2)}</div>
          <div className={`font-bold ${parseFloat(item.remaining_balance) > 0 ? 'text-[#ba1a1a]' : 'text-green-700'}`}>
            Resta: ${parseFloat(item.remaining_balance).toFixed(2)}
          </div>
        </div>
      )
    },
    {
      header: 'Estado',
      render: (item) => getStatusBadge(item.status)
    }
  ];

  const filteredPickerProducts = productsList.filter(p => {
    const matchCat = !selectedCategoryFilter || String(p.category_id) === String(selectedCategoryFilter) || String(p.category_type) === String(selectedCategoryFilter);
    const matchSearch = !itemSearch || p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.sku.toLowerCase().includes(itemSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0b1c30] tracking-tight">Sistema de Apartados (30 Días)</h1>
          <p className="text-xs text-[#7b7487]">
            Control de anticipos (mín. 25%), abonos periódicos, liquidaciones y periodo de gracia de 10 días
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="min-h-[42px] px-4 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Nuevo Apartado</span>
          </button>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-[26px] text-blue-700 shrink-0">payments</span>
          <div>
            <div className="font-bold text-xs text-blue-900">Anticipo Mínimo: 25%</div>
            <p className="text-[11px] text-blue-800">El cliente reserva su producto con una cuarta parte del valor</p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-[26px] text-amber-700 shrink-0">calendar_month</span>
          <div>
            <div className="font-bold text-xs text-amber-900">Vigencia: 1 Mes (30 días)</div>
            <p className="text-[11px] text-amber-800">Abonos periódicos hasta liquidar el saldo</p>
          </div>
        </div>

        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-[26px] text-purple-700 shrink-0">alarm</span>
          <div>
            <div className="font-bold text-xs text-purple-900">Gracia: 10 Días Adicionales</div>
            <p className="text-[11px] text-purple-800">Periodo para contacto y recuperación antes de cancelar</p>
          </div>
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
            <option value="activo">Activos</option>
            <option value="liquidado">Liquidados</option>
            <option value="vencido">Vencidos (30d)</option>
            <option value="gracia_10_dias">En Periodo de Gracia (10d)</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>

        <div className="text-xs text-[#7b7487] font-semibold">
          Total: <strong className="text-[#0b1c30]">{filteredLayaways.length}</strong> apartados
        </div>
      </div>

      {/* Layaways Table */}
      <DataTable
        columns={columns}
        data={filteredLayaways}
        loading={loading}
        emptyMessage="No se encontraron apartados registrados."
      />

      {/* Modal Crear Nuevo Apartado */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !savingLayaway && setIsCreateModalOpen(false)}
        title="Crear Nuevo Apartado (Vigencia 30 Días)"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateLayaway} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f8f9ff] p-4 rounded-2xl border border-[#ccc3d8]/40">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre del Cliente *</label>
              <input
                type="text"
                required
                placeholder="Ej: Laura Gómez"
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
                placeholder="Ej: 5598765432"
                value={createFormData.customer_phone}
                onChange={(e) => setCreateFormData({ ...createFormData, customer_phone: e.target.value })}
                className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Correo Electrónico</label>
              <input
                type="email"
                placeholder="Opcional"
                value={createFormData.customer_email}
                onChange={(e) => setCreateFormData({ ...createFormData, customer_email: e.target.value })}
                className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Product Selector with Category Selection First */}
          <div className="space-y-3 bg-[#f8f9ff] p-4 rounded-2xl border border-[#ccc3d8]/40">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-[#0b1c30]">1. Filtrar Categoría y Seleccionar Producto</h4>
              <span className="text-[11px] text-[#7b7487]">Busca por categoría para facilitar la selección</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Category selector */}
              <div>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="">Todas las Categorías</option>
                  {categoriesList.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Product search input */}
              <div className="sm:col-span-2 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7487] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o SKU..."
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setIsProductPickerOpen(true);
                  }}
                  onFocus={() => setIsProductPickerOpen(true)}
                  className="w-full min-h-[40px] pl-9 pr-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                />

                {isProductPickerOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#ccc3d8] rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-[#e5eeff]">
                    {filteredPickerProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#7b7487]">No se encontraron productos en esta categoría</div>
                    ) : (
                      filteredPickerProducts.slice(0, 15).map(prod => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddItemToLayaway(prod)}
                          className="w-full p-2.5 text-left hover:bg-[#eff4ff] flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-[#0b1c30]">{prod.name}</span>
                            <span className="text-[11px] text-[#7b7487] ml-2 font-mono">SKU: {prod.sku}</span>
                          </div>
                          <span className="font-bold text-[#630ed4]">${parseFloat(prod.sale_price || 0).toFixed(2)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Added Items List */}
            <div className="bg-white rounded-xl border border-[#ccc3d8]/40 overflow-hidden mt-2">
              {createFormData.items.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#7b7487]">No has agregado artículos al apartado todavía.</div>
              ) : (
                <>
                  {/* Mobile Card List (< sm) */}
                  <div className="sm:hidden divide-y divide-[#e5eeff]">
                    {createFormData.items.map((it, idx) => (
                      <div key={idx} className="p-3 bg-white hover:bg-[#f8f9ff] space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-[#0b1c30]">{it.product_name}</div>
                            <div className="text-[11px] text-[#7b7487] font-mono">${it.unit_price.toFixed(2)} c/u</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="w-7 h-7 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] rounded-lg inline-flex items-center justify-center font-bold text-sm shrink-0 active:scale-90 shadow-2xs"
                            title="Quitar producto"
                          >
                            ×
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#f1f5f9]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#7b7487] uppercase font-bold">Cant:</span>
                            <div className="flex items-center bg-[#f8f9ff] border border-[#ccc3d8] rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleItemQtyChange(idx, Math.max(1, it.quantity - 1))}
                                className="w-7 h-7 flex items-center justify-center text-[#0b1c30] hover:bg-[#eff4ff] font-bold text-base active:bg-[#dce9ff]"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                                className="w-10 text-center font-mono font-black text-xs bg-transparent focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleItemQtyChange(idx, it.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center text-[#0b1c30] hover:bg-[#eff4ff] font-bold text-base active:bg-[#dce9ff]"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-[10px] text-[#7b7487] block uppercase font-bold">Subtotal</span>
                            <span className="font-black text-[#630ed4] text-sm">${(it.unit_price * it.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet & Desktop Table (>= sm) */}
                  <div className="hidden sm:block overflow-x-auto w-full">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="bg-[#f8f9ff] text-[11px] uppercase text-[#7b7487] border-b border-[#e5eeff]">
                        <tr>
                          <th className="p-2">Producto</th>
                          <th className="p-2 text-right">Precio Unitario</th>
                          <th className="p-2 text-center">Cantidad</th>
                          <th className="p-2 text-right">Subtotal</th>
                          <th className="p-2 text-right">Acción</th>
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
                                className="w-6 h-6 bg-[#ffdad6] text-[#ba1a1a] rounded inline-flex items-center justify-center hover:bg-[#ffb4ab]"
                                title="Quitar producto"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Fotografía de los Productos Apartados */}
          <ImageCapture
            currentImageUrl={createFormData.photo_url}
            onImageSelected={(file, dataUrl) => {
              setCreateFormData(prev => ({
                ...prev,
                photo_url: dataUrl || ''
              }));
            }}
          />

          {/* Pricing & 25% Deposit calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-amber-50 p-4 rounded-2xl border border-amber-200">
            <div className="space-y-1">
              <span className="text-[11px] text-amber-900 font-bold uppercase">Total a Pagar:</span>
              <div className="font-mono font-black text-base text-[#0b1c30]">${totalLayawayAmount.toFixed(2)}</div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-amber-900 font-bold uppercase">Anticipo Mínimo (25%):</span>
              <div className="font-mono font-black text-sm text-amber-800">${minRequiredDeposit.toFixed(2)}</div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-900 uppercase">Anticipo Pagado ($) *</label>
              <input
                type="number"
                step="1"
                required
                placeholder={`Mín $${minRequiredDeposit.toFixed(2)}`}
                value={createFormData.initial_deposit}
                onChange={(e) => setCreateFormData({ ...createFormData, initial_deposit: e.target.value })}
                className="w-full min-h-[38px] px-2 bg-white border border-amber-300 rounded-lg text-sm font-mono font-black text-green-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-900 uppercase">Método de Pago</label>
              <select
                value={createFormData.payment_method}
                onChange={(e) => setCreateFormData({ ...createFormData, payment_method: e.target.value })}
                className="w-full min-h-[38px] px-2 bg-white border border-amber-300 rounded-lg text-xs font-bold focus:outline-none"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
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
              disabled={savingLayaway || createFormData.items.length === 0}
              className="min-h-[44px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-50"
            >
              {savingLayaway ? 'Registrando...' : 'Registrar Apartado (30 Días)'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Success / WhatsApp Custom Modal */}
      <Modal
        isOpen={Boolean(successLayawayData)}
        onClose={() => setSuccessLayawayData(null)}
        title={successLayawayData?.title || 'Apartado Procesado'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center p-2">
          <div className="w-14 h-14 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
          </div>

          <div>
            <h3 className="text-base font-black text-[#0b1c30]">
              Apartado #{successLayawayData?.folio}
            </h3>
            <p className="text-xs text-[#7b7487] mt-1">
              Cliente: <strong>{successLayawayData?.customer}</strong>
            </p>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-bold">${parseFloat(successLayawayData?.total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-800">
              <span>Abonado Total:</span>
              <span className="font-bold">${parseFloat(successLayawayData?.paid || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#ba1a1a] font-bold">
              <span>Saldo Restante:</span>
              <span>${parseFloat(successLayawayData?.pending || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSuccessLayawayData(null)}
              className="min-h-[42px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                if (successLayawayData?.whatsapp_url) {
                  window.open(successLayawayData.whatsapp_url, '_blank');
                }
                setSuccessLayawayData(null);
              }}
              className="min-h-[42px] px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>Enviar WhatsApp</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Registrar Abono */}
      <Modal
        isOpen={Boolean(selectedLayaway) && !isContactModalOpen}
        onClose={() => setSelectedLayaway(null)}
        title={selectedLayaway ? `Registrar Abono: Apartado #${selectedLayaway.folio}` : ''}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div className="p-3 bg-[#eff4ff] rounded-xl border border-[#ccc3d8]/40 space-y-1 text-xs">
            <div className="text-[#7b7487]">Cliente: <strong className="text-[#0b1c30]">{selectedLayaway?.customer_name}</strong></div>
            <div className="text-[#7b7487]">Total del Apartado: <strong className="text-[#0b1c30] font-mono">${parseFloat(selectedLayaway?.total_amount || 0).toFixed(2)}</strong></div>
            <div className="text-[#7b7487]">Total Abonado: <strong className="text-green-700 font-mono">${parseFloat(selectedLayaway?.total_paid || 0).toFixed(2)}</strong></div>
            <div className="text-[#7b7487]">Saldo Pendiente: <strong className="text-[#ba1a1a] font-mono">${parseFloat(selectedLayaway?.remaining_balance || 0).toFixed(2)}</strong></div>
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
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setSelectedLayaway(null)}
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

      {/* Modal Contactar Cliente (Periodo de Gracia) */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={selectedLayaway ? `Registrar Contacto: Apartado #${selectedLayaway.folio}` : ''}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleMarkContacted} className="space-y-4">
          <p className="text-xs text-[#7b7487]">
            Registra el contacto telefónico realizado al cliente para otorgar los <strong>10 días adicionales de gracia</strong> antes de la cancelación definitiva.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Notas de la Llamada / Acuerdo *</label>
            <textarea
              required
              rows={3}
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="Ej: Cliente informa que pasará a liquidar este sábado..."
              className="w-full p-2.5 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsContactModalOpen(false)}
              className="min-h-[42px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95"
            >
              Activar Periodo de Gracia
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Acciones en Móvil */}
      <Modal
        isOpen={Boolean(actionSheetLayaway)}
        onClose={() => setActionSheetLayaway(null)}
        title={actionSheetLayaway ? `Acciones: Apartado #${actionSheetLayaway.folio}` : 'Acciones'}
        maxWidth="max-w-sm"
      >
        {actionSheetLayaway && (
          <div className="space-y-3">
            <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#ccc3d8]/40 text-xs space-y-1">
              <div className="font-bold text-sm text-[#0b1c30]">{actionSheetLayaway.customer_name}</div>
              <div className="text-[#7b7487] font-mono">{actionSheetLayaway.customer_phone}</div>
              <div className="flex items-center justify-between pt-1 border-t border-[#e5eeff]">
                <span>Total: <strong className="font-mono">${parseFloat(actionSheetLayaway.total_amount).toFixed(2)}</strong></span>
                <span className={parseFloat(actionSheetLayaway.remaining_balance) > 0 ? 'text-[#ba1a1a] font-bold font-mono' : 'text-green-700 font-bold font-mono'}>
                  {parseFloat(actionSheetLayaway.remaining_balance) > 0 ? `Resta: $${parseFloat(actionSheetLayaway.remaining_balance).toFixed(2)}` : 'Liquidado'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {/* Abono action */}
              {parseFloat(actionSheetLayaway.remaining_balance) > 0 && actionSheetLayaway.status !== 'cancelado' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = actionSheetLayaway;
                    setActionSheetLayaway(null);
                    setSelectedLayaway(target);
                    setPaymentAmount(String(target.remaining_balance));
                    setPaymentMethod('efectivo');
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 text-xs font-bold flex items-center gap-3 border border-green-200 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                  </span>
                  <div>
                    <div>Registrar Abono / Liquidar</div>
                    <div className="text-[10px] text-green-700 font-normal">Abonar al saldo restante</div>
                  </div>
                </button>
              )}

              {/* WhatsApp reminder */}
              <button
                type="button"
                onClick={() => {
                  handleSendWhatsAppReminder(actionSheetLayaway);
                  setActionSheetLayaway(null);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold flex items-center gap-3 border border-[#25D366]/30 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </span>
                <div>
                  <div>Enviar Recordatorio WhatsApp</div>
                  <div className="text-[10px] text-[#128C7E] font-normal">Mensaje con estado y fechas</div>
                </div>
              </button>

              {/* Grace period contact if expired */}
              {actionSheetLayaway.status === 'vencido' && !actionSheetLayaway.admin_contacted && (
                <button
                  type="button"
                  onClick={() => {
                    const target = actionSheetLayaway;
                    setActionSheetLayaway(null);
                    setSelectedLayaway(target);
                    setIsContactModalOpen(true);
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-3 border border-amber-200 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
                  </span>
                  <div>
                    <div>Registrar Llamada (10d Gracia)</div>
                    <div className="text-[10px] text-amber-800 font-normal">Activar periodo de gracia</div>
                  </div>
                </button>
              )}

              {/* Cancel layaway */}
              {actionSheetLayaway.status !== 'cancelado' && actionSheetLayaway.status !== 'liquidado' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = actionSheetLayaway;
                    setActionSheetLayaway(null);
                    handleOpenCancelConfirm(target);
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#ffdad6]/50 hover:bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold flex items-center gap-3 border border-[#ba1a1a]/20 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#ba1a1a] text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                  </span>
                  <div>
                    <div>Cancelar y Liberar Stock</div>
                    <div className="text-[10px] text-[#ba1a1a] font-normal">Devolver producto al inventario</div>
                  </div>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-[#e5eeff]">
              <button
                type="button"
                onClick={() => setActionSheetLayaway(null)}
                className="w-full min-h-[38px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirm Dialog Component (Clean UI) */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancelar Apartado"
        message={`¿Estás seguro de cancelar el apartado ${cancelTarget?.folio} de "${cancelTarget?.customer_name}"? Esta acción liberará la mercancía al inventario de forma inmediata.`}
        confirmText="Sí, Cancelar Apartado"
        confirmVariant="danger"
      />
    </div>
  );
}
