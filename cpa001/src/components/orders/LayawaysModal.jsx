import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axiosConfig';
import Modal from '../common/Modal';
import TouchButton from '../common/TouchButton';
import ImageCapture from '../common/ImageCapture';

export default function LayawaysModal({ isOpen, onClose, cartItems = [], cartTotal = 0, onClearCart }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'search'
  
  // New Layaway State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [photoUrl, setPhotoUrl] = useState('');
  const [layawayItems, setLayawayItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Category Filter & Product Selector
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Search & Pay State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('activo');
  const [layawaysList, setLayawaysList] = useState([]);
  const [selectedLayaway, setSelectedLayaway] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Success / WhatsApp Modal State
  const [successLayawayData, setSuccessLayawayData] = useState(null);
  const [actionSheetLayaway, setActionSheetLayaway] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchLayaways();
      fetchCategories();
      fetchCatalog();

      // If cart has items when opened, initialize layawayItems with cart
      if (cartItems.length > 0) {
        setLayawayItems(
          cartItems.map(it => ({
            product_id: it.product_id || it.id || null,
            product_name: it.name,
            quantity: it.quantity || 1,
            unit_price: parseFloat(it.unit_price || it.sale_price || 0)
          }))
        );
      }
    }
  }, [isOpen]);

  const fetchLayaways = async () => {
    try {
      const res = await api.get('/layaways');
      setLayawaysList(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategoriesList(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await api.get('/products?per_page=500');
      setCatalogProducts(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCatalogItem = (prod) => {
    const existing = layawayItems.find(i => i.product_id === prod.id);
    if (existing) {
      setLayawayItems(prev => prev.map(i => i.product_id === prod.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setLayawayItems(prev => [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: parseFloat(prod.sale_price || 0)
        }
      ]);
    }
    setProductSearch('');
    setIsProductPickerOpen(false);
  };

  const handleRemoveItem = (idx) => {
    setLayawayItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemQtyChange = (idx, qty) => {
    const val = Math.max(1, parseFloat(qty) || 1);
    const next = [...layawayItems];
    next[idx].quantity = val;
    setLayawayItems(next);
  };

  const computedTotal = layawayItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
  const minRequired = (computedTotal * 0.25).toFixed(2);

  // Handle New Layaway Creation
  const handleCreateLayaway = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Nombre y teléfono del cliente son requeridos');
      return;
    }

    if (layawayItems.length === 0) {
      toast.error('Debes agregar al menos 1 producto al apartado');
      return;
    }

    const depositNum = parseFloat(depositAmount) || 0;
    if (depositNum < parseFloat(minRequired)) {
      toast.error(`El anticipo mínimo requerido es del 25% ($${minRequired})`);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/layaways', {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        total_amount: computedTotal,
        initial_deposit: depositNum,
        payment_method: paymentMethod,
        photo_url: photoUrl || null,
        items: layawayItems
      });

      toast.success('¡Apartado registrado con éxito (Vigencia 30 días)!');

      setSuccessLayawayData({
        title: '¡Apartado Registrado con Éxito!',
        folio: res.data?.data?.layaway?.folio,
        customer: customerName,
        total: computedTotal,
        paid: depositNum,
        pending: Math.max(0, computedTotal - depositNum),
        whatsapp_url: res.data?.data?.whatsapp_url
      });

      if (onClearCart) onClearCart();
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setDepositAmount('');
      setPhotoUrl('');
      setLayawayItems([]);
      fetchLayaways();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al registrar apartado');
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Payment
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedLayaway) return;

    const amountNum = parseFloat(paymentAmount) || 0;
    if (amountNum <= 0) {
      toast.error('Ingresa un monto de abono válido');
      return;
    }

    try {
      setSavingPayment(true);
      const res = await api.post(`/layaways/${selectedLayaway.id}/payments`, {
        amount: amountNum,
        payment_method: 'efectivo',
        notes: 'Abono realizado en terminal POS'
      });

      toast.success('¡Abono registrado con éxito!');

      if (res.data?.data?.whatsapp_url) {
        window.open(res.data.data.whatsapp_url, '_blank');
      }

      setSelectedLayaway(null);
      setPaymentAmount('');
      fetchLayaways();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al registrar abono');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDirectWhatsApp = (layaway) => {
    const cleanPhone = layaway.customer_phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const expDate = new Date(layaway.expiration_date).toLocaleDateString();
    const text = `🎁 *${import.meta.env.VITE_APP_NAME?.toUpperCase() || 'TIENDA'} - ESTADO DE APARTADO #${layaway.folio}*\nHola ${layaway.customer_name}, le recordamos el estado de su apartado:\n📅 Vigencia Límite: ${expDate}\n💰 Total: $${layaway.total_amount}\n💵 Pagado: $${layaway.total_paid}\n🔴 *SALDO RESTANTE: $${layaway.remaining_balance}*\n¡Le esperamos en tienda! ✨`;
    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredCatalog = catalogProducts.filter(p => {
    const matchCat = !selectedCategoryFilter || p.category_id === parseInt(selectedCategoryFilter) || p.category_type === selectedCategoryFilter;
    const matchSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredLayaways = layawaysList.filter((l) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      l.customer_name.toLowerCase().includes(s) ||
      l.folio.toLowerCase().includes(s) ||
      l.customer_phone.includes(s);
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case 'activo':
        return <span className="bg-[#dcfce7] text-[#15803d] font-bold text-[10px] px-2 py-0.5 rounded-full">Activo</span>;
      case 'liquidado':
        return <span className="bg-[#eff4ff] text-[#630ed4] font-bold text-[10px] px-2 py-0.5 rounded-full">Liquidado</span>;
      case 'vencido':
        return <span className="bg-[#fee2e2] text-[#b91c1c] font-bold text-[10px] px-2 py-0.5 rounded-full">Vencido (30d)</span>;
      case 'gracia_10_dias':
        return <span className="bg-[#fef9c3] text-[#854d0e] font-bold text-[10px] px-2 py-0.5 rounded-full">Gracia (10d)</span>;
      case 'cancelado':
        return <span className="bg-gray-100 text-gray-700 font-bold text-[10px] px-2 py-0.5 rounded-full">Cancelado</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full">{st}</span>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Apartados (Layaway)" maxWidth="max-w-3xl">
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
            <span>+ Nuevo Apartado (30 Días)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('search');
              fetchLayaways();
            }}
            className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'search' ? 'bg-[#630ed4] text-white shadow-xs' : 'text-[#0b1c30] hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Abonos &amp; Historial ({layawaysList.length})</span>
          </button>
        </div>

        {/* TAB 1: NEW LAYAWAY */}
        {activeTab === 'new' && (
          <form onSubmit={handleCreateLayaway} className="space-y-3.5 pt-1">
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#ccc3d8]/40">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lucía Gómez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Teléfono (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 5544332211"
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

            {/* Category Filter & Product Selector */}
            <div className="space-y-3 bg-[#f8f9ff] p-4 rounded-2xl border border-[#ccc3d8]/40">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-black text-[#0b1c30] uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px] text-[#630ed4]">category</span>
                  <span>1. Filtrar por Categoría y Agregar Productos</span>
                </label>
                <span className="text-xs text-[#7b7487] font-bold">{layawayItems.length} producto(s) en lista</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => {
                    setSelectedCategoryFilter(e.target.value);
                    setIsProductPickerOpen(true);
                  }}
                  className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs sm:text-sm font-bold focus:outline-none"
                >
                  <option value="">Todas las Categorías</option>
                  {categoriesList.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type})
                    </option>
                  ))}
                  <option value="dulceria">Dulcería</option>
                  <option value="materias_primas">Materias Primas</option>
                  <option value="regalos">Regalos</option>
                </select>

                <div className="relative sm:col-span-2">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7b7487] text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o SKU..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsProductPickerOpen(true);
                    }}
                    onFocus={() => setIsProductPickerOpen(true)}
                    className="w-full min-h-[42px] pl-11 pr-10 bg-white border border-[#ccc3d8] rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
                  />
                  {isProductPickerOpen && (
                    <button
                      type="button"
                      onClick={() => setIsProductPickerOpen(false)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#ba1a1a] hover:bg-[#ffdad6] px-2 py-1 rounded-lg"
                    >
                      Cerrar
                    </button>
                  )}

                  {isProductPickerOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-[#630ed4]/40 rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-[#e5eeff]">
                      {filteredCatalog.length === 0 ? (
                        <div className="p-4 text-center text-xs sm:text-sm text-[#7b7487] font-medium">
                          No se encontraron productos en esta categoría o búsqueda.
                        </div>
                      ) : (
                        filteredCatalog.slice(0, 20).map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => handleAddCatalogItem(prod)}
                            className="w-full p-3 text-left hover:bg-[#eff4ff] flex items-center justify-between text-xs sm:text-sm transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[20px] text-[#630ed4] group-hover:scale-110 transition-transform">
                                add_circle
                              </span>
                              <div>
                                <span className="font-bold text-[#0b1c30]">{prod.name}</span>
                                <span className="text-xs text-[#7b7487] ml-2 font-mono">SKU: {prod.sku}</span>
                              </div>
                            </div>
                            <span className="font-black text-[#630ed4] font-mono text-sm sm:text-base">
                              ${parseFloat(prod.sale_price || 0).toFixed(2)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items List Table & Mobile Cards */}
              <div className="bg-white rounded-2xl border border-[#ccc3d8]/40 overflow-hidden mt-2">
                {layawayItems.length === 0 ? (
                  <div className="p-4 text-center text-xs sm:text-sm text-[#7b7487] font-medium">
                    No has seleccionado productos a apartar. Elige del buscador arriba.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card List (< sm) */}
                    <div className="sm:hidden divide-y divide-[#e5eeff]">
                      {layawayItems.map((it, idx) => (
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
                      <table className="w-full text-left text-xs sm:text-sm min-w-[500px]">
                        <thead className="bg-[#f8f9ff] text-xs uppercase text-[#7b7487] font-bold border-b border-[#e5eeff]">
                          <tr>
                            <th className="p-3">Producto</th>
                            <th className="p-3 text-right">P. Unitario</th>
                            <th className="p-3 text-center">Cant</th>
                            <th className="p-3 text-right">Subtotal</th>
                            <th className="p-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5eeff]">
                          {layawayItems.map((it, idx) => (
                            <tr key={idx} className="hover:bg-[#f8f9ff]">
                              <td className="p-3 font-bold text-[#0b1c30]">{it.product_name}</td>
                              <td className="p-3 text-right font-mono font-semibold">${it.unit_price.toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={it.quantity}
                                  onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                                  className="w-16 text-center border-2 border-[#ccc3d8] rounded-xl p-1.5 font-mono font-black text-sm"
                                />
                              </td>
                              <td className="p-3 text-right font-mono font-black text-[#630ed4] text-sm sm:text-base">
                                ${(it.unit_price * it.quantity).toFixed(2)}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="w-8 h-8 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] rounded-xl inline-flex items-center justify-center font-black text-base shadow-2xs transition-all"
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

            {/* Fotografía de los productos apartados */}
            <ImageCapture
              currentImageUrl={photoUrl}
              onImageSelected={(file, dataUrl) => setPhotoUrl(dataUrl || '')}
            />

            {/* Financial breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs">
              <div>
                <span className="text-[10px] text-amber-900 font-bold uppercase block">Total Mercancía</span>
                <span className="font-mono font-black text-base text-[#0b1c30]">${computedTotal.toFixed(2)}</span>
              </div>

              <div>
                <span className="text-[10px] text-amber-900 font-bold uppercase block">Anticipo Mín (25%)</span>
                <span className="font-mono font-black text-sm text-amber-800">${minRequired}</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-900 uppercase">Anticipo Pagado *</label>
                <input
                  type="number"
                  step="1"
                  required
                  min={minRequired}
                  placeholder={`Mín $${minRequired}`}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full min-h-[36px] px-2 bg-white border-2 border-amber-400 rounded-lg text-sm font-mono font-black text-green-700 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-900 uppercase">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full min-h-[36px] px-2 bg-white border border-amber-300 rounded-lg text-xs font-bold focus:outline-none"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
            </div>

            <div className="p-2.5 bg-[#fef9c3] rounded-xl border border-[#ca8a04]/30 text-[11px] text-[#854d0e]">
              ⏳ <strong>Vigencia:</strong> 30 días naturales a partir de hoy. Pasados los 30 días, se otorgan 10 días de gracia.
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
                disabled={loading || layawayItems.length === 0}
                variant="primary"
                size="md"
                icon="savings"
                className="min-h-[42px] px-6 text-xs font-bold shadow-md"
              >
                {loading ? 'Registrando...' : 'Registrar Apartado (30 Días)'}
              </TouchButton>
            </div>
          </form>
        )}

        {/* TAB 2: SEARCH & PAY EXISTING LAYAWAY */}
        {activeTab === 'search' && (
          <div className="space-y-3 pt-1">
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
                <option value="activo">Activos</option>
                <option value="liquidado">Liquidados</option>
                <option value="vencido">Vencidos (30d)</option>
                <option value="gracia_10_dias">En Gracia (10d)</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-x-auto overflow-y-auto border border-[#ccc3d8]/40 rounded-xl bg-white w-full">
              {filteredLayaways.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7b7487]">No se encontraron apartados registrados.</div>
              ) : (
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-[#f8f9ff] text-[10px] uppercase text-[#7b7487] font-semibold border-b border-[#e5eeff] sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 text-center w-12">Acción</th>
                      <th className="p-2.5">Folio / Foto</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Vigencia (30d)</th>
                      <th className="p-2.5 text-right">Total / Saldo</th>
                      <th className="p-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff]">
                    {filteredLayaways.map((lay) => (
                      <tr key={lay.id} className="hover:bg-[#eff4ff]/30">
                        {/* Columna 1: Acciones al inicio */}
                        <td className="p-2.5 text-center">
                          {/* Mobile 3 dots button */}
                          <div className="sm:hidden flex justify-center">
                            <button
                              type="button"
                              onClick={() => setActionSheetLayaway(lay)}
                              className="w-8 h-8 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] border border-[#630ed4]/30 flex items-center justify-center shadow-2xs active:scale-95 transition-all"
                              title="Acciones"
                              aria-label="Acciones"
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                          </div>

                          {/* Desktop / Tablet Buttons */}
                          <div className="hidden sm:flex items-center justify-center gap-1">
                            {parseFloat(lay.remaining_balance) > 0 && lay.status !== 'cancelado' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLayaway(lay);
                                  setPaymentAmount(lay.remaining_balance);
                                }}
                                className="min-h-[30px] px-2.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1 shadow-2xs"
                                title="Abonar a Apartado"
                              >
                                <span className="material-symbols-outlined text-[15px]">payments</span>
                                <span>Abonar</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDirectWhatsApp(lay)}
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs"
                              title="WhatsApp"
                            >
                              <span className="material-symbols-outlined text-[15px]">chat</span>
                            </button>
                          </div>
                        </td>

                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            {lay.photo_url ? (
                              <img src={lay.photo_url} alt="Foto" className="w-7 h-7 rounded object-cover border shrink-0" />
                            ) : null}
                            <span className="font-mono font-bold text-[#630ed4]">{lay.folio}</span>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-[#0b1c30]">{lay.customer_name}</div>
                          <div className="text-[10px] text-[#7b7487] font-mono">{lay.customer_phone}</div>
                        </td>
                        <td className="p-2.5 text-xs">
                          <div>{new Date(lay.expiration_date).toLocaleDateString()}</div>
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          <div className="font-bold text-[#0b1c30]">${parseFloat(lay.total_amount).toFixed(2)}</div>
                          <div className={`text-[10px] font-bold ${parseFloat(lay.remaining_balance) > 0 ? 'text-[#ba1a1a]' : 'text-green-700'}`}>
                            {parseFloat(lay.remaining_balance) > 0 ? `Resta: $${parseFloat(lay.remaining_balance).toFixed(2)}` : '✓ Liquidado'}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">{getStatusBadge(lay.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payment Subform when an existing layaway is selected */}
            {selectedLayaway && (
              <form onSubmit={handleAddPayment} className="p-4 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#0b1c30] uppercase">
                    Registrar Abono a Folio #{selectedLayaway.folio} ({selectedLayaway.customer_name})
                  </h4>
                  <button type="button" onClick={() => setSelectedLayaway(null)} className="text-xs text-[#ba1a1a] font-bold">Cancelar</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#7b7487] uppercase block">Saldo Pendiente Actual</label>
                    <span className="text-xl font-mono font-black text-[#ba1a1a]">
                      ${parseFloat(selectedLayaway.remaining_balance).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#0b1c30] uppercase">Monto a Abonar ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      max={selectedLayaway.remaining_balance}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full min-h-[40px] px-3 bg-white border-2 border-[#630ed4] rounded-xl text-base font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <TouchButton
                    type="submit"
                    disabled={savingPayment}
                    variant="success"
                    size="md"
                    icon="payments"
                    className="min-h-[40px] px-6 text-xs font-bold"
                  >
                    {savingPayment ? 'Registrando Abono...' : 'Cobrar Abono y Enviar Comprobante'}
                  </TouchButton>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={Boolean(successLayawayData)}
        onClose={() => setSuccessLayawayData(null)}
        title={successLayawayData?.title || 'Apartado Procesado'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-green-100 text-green-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">savings</span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-[#0b1c30]">Folio #{successLayawayData?.folio}</h3>
            <p className="text-xs text-[#7b7487]">Cliente: <strong>{successLayawayData?.customer}</strong></p>
          </div>

          <div className="p-3 bg-[#f8f9ff] rounded-2xl border border-[#ccc3d8]/40 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span>Total Mercancía:</span>
              <span className="font-bold">${successLayawayData?.total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Anticipo Pagado:</span>
              <span className="font-bold">${successLayawayData?.paid?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#ba1a1a] border-t border-[#ccc3d8]/30 pt-1 font-bold">
              <span>Saldo Restante:</span>
              <span>${successLayawayData?.pending?.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {successLayawayData?.whatsapp_url && (
              <a
                href={successLayawayData.whatsapp_url}
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
              onClick={() => setSuccessLayawayData(null)}
              className="w-full min-h-[40px] px-4 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-bold hover:bg-[#dce9ff]"
            >
              Cerrar y Continuar
            </button>
          </div>
        </div>
      </Modal>
      {/* Actions Modal for Mobile */}
      <Modal
        isOpen={Boolean(actionSheetLayaway)}
        onClose={() => setActionSheetLayaway(null)}
        title={actionSheetLayaway ? `Acciones: Folio #${actionSheetLayaway.folio}` : 'Acciones'}
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
                    setPaymentAmount(target.remaining_balance);
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
                  handleDirectWhatsApp(actionSheetLayaway);
                  setActionSheetLayaway(null);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold flex items-center gap-3 border border-[#25D366]/30 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </span>
                <div>
                  <div>Enviar Recordatorio WhatsApp</div>
                  <div className="text-[10px] text-[#128C7E] font-normal">Mensaje con estado y vigencia</div>
                </div>
              </button>
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
    </Modal>
  );
}
