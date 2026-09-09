import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getProductImageUrl } from '../utils/imageUrl';

const DRAFT_KEY = 'pos_admin_package_draft';
const DRAFT_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [capacity, setCapacity] = useState('20');
  const [items, setItems] = useState([]); // [{ product_id, quantity, unit, name, sale_price, purchase_price, image_url }]

  // Component Item Selector state
  const [itemSearch, setItemSearch] = useState('');
  const [itemCatFilter, setItemCatFilter] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Delete / Toggle Dialog
  const [targetPackage, setTargetPackage] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [pageSize, setPageSize] = useState(10);

  const fetchPackages = async (page = 1, limit = pageSize) => {
    try {
      setLoading(true);
      const [pkgRes, prodRes, catRes] = await Promise.all([
        api.get('/packages', { params: { page, per_page: limit } }),
        api.get('/products', { params: { per_page: 200 } }),
        api.get('/categories')
      ]);
      setPackages(pkgRes.data.data || []);
      setProductsList(prodRes.data.data || []);
      setCategories(catRes.data.data || []);
      if (pkgRes.data.pagination) {
        setPagination({
          ...pkgRes.data.pagination,
          onPerPageChange: (newLimit) => {
            setPageSize(newLimit);
            fetchPackages(1, newLimit);
          }
        });
      } else {
        setPagination(null);
      }
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar paquetes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages(currentPage);
  }, [currentPage]);

  // Draft persistence
  useEffect(() => {
    if (isModalOpen && !editingPackage && name) {
      const draft = {
        data: { name, sku, description, price, discountAmount, capacity, items },
        timestamp: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [name, sku, description, price, discountAmount, capacity, items, isModalOpen, editingPackage]);

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const checkAndLoadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < DRAFT_MAX_AGE_MS) {
          setName(data.name || '');
          setSku(data.sku || '');
          setDescription(data.description || '');
          setPrice(data.price || '');
          setDiscountAmount(data.discountAmount || '0');
          setCapacity(data.capacity || '20');
          setItems(data.items || []);
          toast.success('Borrador de paquete recuperado.', { duration: 3000 });
          return true;
        } else {
          clearDraft();
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  // Dynamic calculations
  const totalRegularPrice = items.reduce((sum, it) => sum + (parseFloat(it.sale_price || 0) * (parseFloat(it.quantity) || 1)), 0);
  const totalCostPrice = items.reduce((sum, it) => sum + (parseFloat(it.purchase_price || 0) * (parseFloat(it.quantity) || 1)), 0);
  const finalPackagePrice = parseFloat(price) || (totalRegularPrice > 0 ? Math.max(0, totalRegularPrice - (parseFloat(discountAmount) || 0)) : 0);
  const packageProfit = finalPackagePrice - totalCostPrice;
  const packageMarginPercent = finalPackagePrice > 0 ? ((packageProfit / finalPackagePrice) * 100).toFixed(1) : '0';

  const handleNameChange = (val) => {
    setName(val);
    if (!editingPackage && (!sku || sku.startsWith('PAQ-'))) {
      const clean = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'COMBO';
      setSku(`PAQ-${clean}-${Math.floor(Math.random() * 899 + 100)}`);
    }
  };

  const handleDiscountChange = (discVal) => {
    setDiscountAmount(discVal);
    const disc = parseFloat(discVal) || 0;
    const calcPrice = Math.max(0, totalRegularPrice - disc).toFixed(2);
    setPrice(calcPrice);
  };

  const handlePriceChange = (priceVal) => {
    setPrice(priceVal);
    const p = parseFloat(priceVal) || 0;
    const calcDisc = Math.max(0, totalRegularPrice - p).toFixed(2);
    setDiscountAmount(calcDisc);
  };

  const handleOpenModal = (pkg = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setName(pkg.name);
      setSku(pkg.sku);
      setDescription(pkg.description || '');
      setPrice(String(pkg.price));
      setCapacity(String(pkg.capacity_people || 20));
      
      const mappedItems = pkg.items ? pkg.items.map(i => {
        const found = productsList.find(p => p.id === i.product_id);
        return {
          product_id: i.product_id,
          name: i.product_name || found?.name || `Producto #${i.product_id}`,
          quantity: i.quantity,
          unit: i.unit || found?.unit || 'pza',
          sale_price: found?.sale_price || i.sale_price || 0,
          purchase_price: found?.purchase_price || i.purchase_price || 0,
          image_url: found?.image_url || ''
        };
      }) : [];
      setItems(mappedItems);
    } else {
      setEditingPackage(null);
      setName('');
      setSku('');
      setDescription('');
      setPrice('');
      setDiscountAmount('0');
      setCapacity('20');
      setItems([]);
      checkAndLoadDraft();
    }
    setIsModalOpen(true);
  };

  // Add item to package
  const handleAddProductToPackage = (prod) => {
    setItems(prev => [
      ...prev,
      {
        product_id: prod.id,
        name: prod.name,
        quantity: 1,
        unit: prod.unit || 'pza',
        sale_price: parseFloat(prod.sale_price || 0),
        purchase_price: parseFloat(prod.purchase_price || 0),
        image_url: prod.image_url || ''
      }
    ]);
    setItemSearch('');
    setIsProductPickerOpen(false);
  };

  const handleRemoveItemRow = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemQtyChange = (idx, qty) => {
    const next = [...items];
    next[idx].quantity = Math.max(0.1, parseFloat(qty) || 1);
    setItems(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !sku || !price) {
      toast.error('Nombre, SKU y Precio son requeridos');
      return;
    }
    if (items.length === 0) {
      toast.error('Debes agregar al menos 1 producto componente al paquete');
      return;
    }

    if (parseFloat(price) < totalCostPrice) {
      toast.error(`El precio final del paquete ($${parseFloat(price).toFixed(2)}) no puede ser menor al costo total de sus componentes ($${totalCostPrice.toFixed(2)})`);
      return;
    }

    try {
      const payload = {
        name,
        sku,
        description,
        price: parseFloat(price),
        capacity_people: parseInt(capacity, 10),
        items: items.map(i => ({
          product_id: parseInt(i.product_id, 10),
          quantity: parseFloat(i.quantity) || 1,
          unit: i.unit || 'pza'
        }))
      };

      if (editingPackage) {
        await api.put(`/packages/${editingPackage.id}`, payload);
        toast.success('Paquete actualizado con éxito');
      } else {
        await api.post('/packages', payload);
        toast.success('Paquete registrado con éxito');
        clearDraft();
      }

      setIsModalOpen(false);
      fetchPackages(currentPage);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar paquete');
    }
  };

  const handleToggleActive = async (pkg) => {
    try {
      await api.patch(`/packages/${pkg.id}/toggle`);
      toast.success(`Paquete ${pkg.is_active ? 'deshabilitado' : 'activado'}`);
      setIsConfirmOpen(false);
      setTargetPackage(null);
      fetchPackages(currentPage);
    } catch (err) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleHardDelete = async (pkg) => {
    try {
      await api.delete(`/packages/${pkg.id}`);
      toast.success('Paquete eliminado permanentemente');
      setIsConfirmOpen(false);
      setTargetPackage(null);
      fetchPackages(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar paquete');
    }
  };

  // Filter products available for selection (exclude already selected)
  const availableProducts = productsList.filter(p => {
    const isAlreadySelected = items.some(it => it.product_id === p.id);
    if (isAlreadySelected) return false;
    const matchesSearch = !itemSearch || p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.sku.toLowerCase().includes(itemSearch.toLowerCase());
    const matchesCat = !itemCatFilter || String(p.category_id) === String(itemCatFilter) || p.category_type === itemCatFilter;
    return matchesSearch && matchesCat;
  });

  const columns = [
    {
      header: 'Acciones',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenModal(item)}
            className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] flex items-center justify-center active:scale-95 shadow-xs transition-all"
            title="Editar paquete"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetPackage(item);
              setIsConfirmOpen(true);
            }}
            className="w-9 h-9 rounded-xl bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] flex items-center justify-center active:scale-95 shadow-xs transition-all"
            title="Eliminar o deshabilitar"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      )
    },
    {
      header: 'Paquete / Combo',
      render: (item) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0b1c30] text-sm sm:text-base">{item.name}</span>
            {!item.is_active && (
              <span className="bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold px-2 py-0.5 rounded-lg">Inactivo</span>
            )}
          </div>
          <div className="text-xs text-[#7b7487] font-mono">SKU: {item.sku}</div>
        </div>
      )
    },
    {
      header: 'Capacidad',
      render: (item) => (
        <span className="bg-[#ffeedd] text-[#ea580c] font-bold text-xs sm:text-sm px-3 py-1 rounded-xl whitespace-nowrap inline-flex items-center">
          {item.capacity_people} {item.capacity_people === 1 ? 'Persona' : 'Personas'}
        </span>
      )
    },
    {
      header: 'Precio Venta',
      render: (item) => (
        <span className="font-mono font-black text-base text-[#ea580c]">
          ${parseFloat(item.price).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Stock Virtual Disp.',
      render: (item) => (
        <span className={`font-mono font-black text-sm sm:text-base px-3 py-1 rounded-xl ${
          item.virtual_stock > 5 ? 'bg-[#dcfce7] text-[#15803d]' : item.virtual_stock > 0 ? 'bg-[#fef9c3] text-[#854d0e]' : 'bg-[#ffdad6] text-[#ba1a1a]'
        }`}>
          {item.virtual_stock || 0} packs
        </span>
      )
    },
    {
      header: 'Componentes',
      render: (item) => (
        <span className="text-sm font-semibold text-[#7b7487]">
          {item.items?.length || 0} productos
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0b1c30] tracking-tight">
            Paquetes y Combos Piñateros
          </h2>
          <p className="text-xs text-[#7b7487]">
            Kits armados para fiestas con cálculo de ganancia, deducción por FIFO y stock virtual
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="min-h-[44px] px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 shadow-md self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Crear Nuevo Paquete</span>
        </button>
      </div>

      {/* Table with Pagination */}
      <DataTable
        columns={columns}
        data={packages}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setCurrentPage(p)}
        emptyMessage="No hay paquetes piñateros registrados."
      />

      {/* Modal Crear / Editar Paquete Amplio y Estructurado */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPackage ? `Editar Paquete: ${editingPackage.name}` : 'Crear Nuevo Paquete Piñatero'}
        maxWidth="max-w-5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#f8f9ff] p-4 rounded-2xl border border-[#ccc3d8]/40">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre del Paquete *</label>
              <input
                type="text"
                required
                placeholder="Ej: Paquete Fiesta Infantil 20 Personas"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">SKU (Auto) *</label>
                <input
                  type="text"
                  required
                  placeholder="PAQ-PIN-20P"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Capacidad</label>
                <select
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="10">10 Personas</option>
                  <option value="20">20 Personas</option>
                  <option value="30">30 Personas</option>
                  <option value="50">50 Personas</option>
                  <option value="100">100 Personas</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Descripción / Observaciones</label>
              <textarea
                rows={2}
                placeholder="Detalle de lo que incluye el paquete..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
              ></textarea>
            </div>
          </div>

          {/* Component Items Builder with Search and Category Filter */}
          <div className="space-y-3 bg-[#f8f9ff] p-4 rounded-2xl border border-[#ccc3d8]/40">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#0b1c30] uppercase">1. Productos Componentes del Paquete</h4>
                <p className="text-[11px] text-[#7b7487]">Busca y agrega los productos que componen el combo</p>
              </div>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7487] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar producto para agregar..."
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setIsProductPickerOpen(true);
                  }}
                  onFocus={() => setIsProductPickerOpen(true)}
                  className="w-full min-h-[40px] pl-9 pr-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                />

                {/* Autocomplete Dropdown */}
                {isProductPickerOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#ccc3d8] rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#e5eeff]">
                    {availableProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#7b7487]">No hay productos disponibles</div>
                    ) : (
                      availableProducts.slice(0, 15).map(prod => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddProductToPackage(prod)}
                          className="w-full p-2.5 text-left hover:bg-[#eff4ff] flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#eff4ff] flex items-center justify-center overflow-hidden shrink-0 border border-[#ccc3d8]/40">
                              {prod.image_url ? (
                                <img src={getProductImageUrl(prod.image_url)} alt={prod.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-[14px] text-[#630ed4]">inventory_2</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-[#0b1c30]">{prod.name}</div>
                              <div className="text-[10px] text-[#7b7487] font-mono">SKU: {prod.sku} • Stock: {prod.total_stock || 0}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#ea580c]">${parseFloat(prod.sale_price || 0).toFixed(2)}</span>
                            <div className="text-[10px] text-[#7b7487]">Costo: ${parseFloat(prod.purchase_price || 0).toFixed(2)}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <select
                  value={itemCatFilter}
                  onChange={(e) => setItemCatFilter(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="">Todas las Categorías</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Added Items */}
            <div className="border border-[#ccc3d8]/40 rounded-xl bg-white overflow-hidden max-h-56 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#7b7487]">
                  No has agregado productos al paquete todavía. Usa el buscador arriba.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9ff] text-[11px] uppercase text-[#7b7487] font-semibold border-b border-[#e5eeff]">
                    <tr>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">Precio Regular</th>
                      <th className="px-3 py-2">Costo</th>
                      <th className="px-3 py-2 text-center">Cantidad</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      <th className="px-3 py-2 text-right">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff]">
                    {items.map((row, idx) => {
                      const itemSale = parseFloat(row.sale_price || 0);
                      const itemCost = parseFloat(row.purchase_price || 0);
                      const itemQty = parseFloat(row.quantity || 1);
                      return (
                        <tr key={row.product_id || idx} className="hover:bg-[#eff4ff]/40">
                          <td className="px-3 py-2 font-bold text-[#0b1c30]">
                            {row.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-[#7b7487]">
                            ${itemSale.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 font-mono text-[#7b7487]">
                            ${itemCost.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                              className="w-16 min-h-[32px] px-1 text-center bg-[#f8f9ff] border border-[#ccc3d8] rounded-lg font-mono font-bold text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-[#ea580c] text-right">
                            ${(itemSale * itemQty).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="w-6 h-6 bg-[#ffdad6] text-[#ba1a1a] rounded inline-flex items-center justify-center active:scale-90"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Interactive Profit & Discount Calculation Table */}
          {items.length > 0 && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">calculate</span>
                <span>2. Descuento, Precio Final y Ganancia Neta del Paquete</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-amber-200">
                  <span className="text-[#7b7487]">Suma Precios Regulares:</span>
                  <div className="text-base font-black font-mono text-[#0b1c30] mt-0.5">
                    ${totalRegularPrice.toFixed(2)}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200">
                  <span className="text-[#7b7487]">Costo Total Componentes:</span>
                  <div className="text-base font-black font-mono text-[#7b7487] mt-0.5">
                    ${totalCostPrice.toFixed(2)}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200">
                  <label className="text-[#ea580c] font-bold block">Descuento Paquete ($):</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    className="w-full min-h-[34px] px-2 bg-amber-50/50 border border-amber-300 rounded-lg text-sm font-mono font-bold text-[#ea580c] mt-0.5"
                  />
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200">
                  <label className="text-[#15803d] font-bold block">Precio Final Paquete ($):</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full min-h-[34px] px-2 bg-emerald-50 border border-emerald-300 rounded-lg text-base font-mono font-black text-[#15803d] mt-0.5"
                  />
                </div>
              </div>

              {/* Net Profit Indicator */}
              <div className="p-3 bg-white rounded-xl border border-amber-300 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#15803d]">trending_up</span>
                  <span className="font-bold text-[#0b1c30]">Ganancia Neta por Paquete:</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className={`text-base font-black ${packageProfit >= 0 ? 'text-[#15803d]' : 'text-[#ba1a1a]'}`}>
                    ${packageProfit.toFixed(2)}
                  </span>
                  <span className="bg-[#dcfce7] text-[#15803d] font-bold px-2 py-0.5 rounded">
                    Margen: {packageMarginPercent}%
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-6 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold shadow-md active:scale-95"
            >
              {editingPackage ? 'Guardar Cambios' : 'Registrar Paquete'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetPackage(null);
        }}
        title="Gestionar Estado o Eliminación de Paquete"
        itemName={targetPackage?.name || 'este paquete'}
        isActive={Boolean(targetPackage?.is_active)}
        onToggleActive={() => handleToggleActive(targetPackage)}
        onHardDelete={() => handleHardDelete(targetPackage)}
      />
    </div>
  );
}

