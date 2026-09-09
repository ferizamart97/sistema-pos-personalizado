import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ExpirationSemaphore from '../components/common/ExpirationSemaphore';
import { getProductImageUrl } from '../utils/imageUrl';

export default function BatchesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialProductId = searchParams.get('product_id') || '';

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // New/Edit Batch Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({
    batch_number: '',
    quantity: '50',
    expiration_date: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Delete / Toggle Dialog
  const [targetBatch, setTargetBatch] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchProductsList = async (searchTerm = '') => {
    try {
      setSearching(true);
      const res = await api.get('/products', { params: { search: searchTerm, per_page: 50 } });
      const list = res.data.data || [];
      setSearchResults(list);
      if (!selectedProductId && list.length > 0 && !searchTerm) {
        setSelectedProductId(String(list[0].id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const fetchProductBatches = async (productId) => {
    if (!productId) return;
    try {
      setLoading(true);
      const [prodRes, batchRes] = await Promise.all([
        api.get(`/products/${productId}`),
        api.get(`/products/${productId}/batches`)
      ]);
      setSelectedProduct(prodRes.data.data);
      setBatches(batchRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar lotes del producto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else {
      fetchProductsList();
    }
  }, [initialProductId]);

  useEffect(() => {
    if (selectedProductId) {
      fetchProductBatches(selectedProductId);
    }
  }, [selectedProductId]);

  const handleSearchChange = (val) => {
    setProductSearch(val);
    setIsSearchOpen(true);
    fetchProductsList(val);
  };

  const handleSelectProduct = (prod) => {
    setSelectedProductId(String(prod.id));
    setSelectedProduct(prod);
    setProductSearch('');
    setIsSearchOpen(false);
  };

  const handleOpenCreate = () => {
    setEditingBatch(null);
    const expDefault = new Date();
    expDefault.setDate(expDefault.getDate() + 90);

    setFormData({
      batch_number: `L-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
      quantity: '50',
      expiration_date: expDefault.toISOString().split('T')[0],
      received_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (batch) => {
    setEditingBatch(batch);
    setFormData({
      batch_number: batch.batch_number,
      quantity: String(batch.quantity),
      expiration_date: batch.expiration_date,
      received_date: batch.received_date || '',
      notes: batch.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingBatch) {
        await api.put(`/batches/${editingBatch.id}`, formData);
        toast.success('Lote actualizado');
      } else {
        await api.post(`/products/${selectedProductId}/batches`, formData);
        toast.success('Nuevo lote registrado');
      }
      setIsModalOpen(false);
      fetchProductBatches(selectedProductId);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar lote');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBatch = async () => {
    if (!targetBatch) return;
    try {
      await api.patch(`/batches/${targetBatch.id}/toggle`);
      toast.success('Estado del lote actualizado');
      fetchProductBatches(selectedProductId);
    } catch (err) {
      console.error(err);
      toast.error('Error al cambiar estado del lote');
    }
  };

  const handleHardDeleteBatch = async () => {
    if (!targetBatch) return;
    try {
      await api.delete(`/batches/${targetBatch.id}`);
      toast.success('Lote eliminado');
      fetchProductBatches(selectedProductId);
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar lote');
    }
  };

  const columns = [
    {
      header: 'Acciones',
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEdit(b)}
            className="w-9 h-9 rounded-xl bg-white border border-[#ccc3d8] flex items-center justify-center hover:bg-[#e5eeff] active:scale-95 shadow-2xs transition-all"
            title="Editar lote"
          >
            <span className="material-symbols-outlined text-[19px] text-[#630ed4]">edit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetBatch(b);
              setIsConfirmOpen(true);
            }}
            className="w-9 h-9 rounded-xl bg-[#ffdad6]/60 text-[#ba1a1a] flex items-center justify-center hover:bg-[#ffdad6] active:scale-95 shadow-2xs transition-all"
            title="Eliminar lote"
          >
            <span className="material-symbols-outlined text-[19px]">delete</span>
          </button>
        </div>
      )
    },
    {
      header: 'Lote / Identificador',
      render: (b) => (
        <div>
          <span className="font-mono font-bold text-sm sm:text-base text-[#0b1c30]">{b.batch_number}</span>
          {b.notes && <div className="text-xs text-[#7b7487]">{b.notes}</div>}
        </div>
      )
    },
    {
      header: 'Fecha Caducidad',
      render: (b) => (
        <span className="font-mono text-sm font-semibold text-[#0b1c30]">{b.expiration_date}</span>
      )
    },
    {
      header: 'Semáforo',
      render: (b) => (
        <ExpirationSemaphore
          daysRemaining={b.days_remaining}
          semaphore={b.semaphore}
          expirationDate={b.expiration_date}
          productName={selectedProduct?.name}
          batchNumber={b.batch_number}
        />
      )
    },
    {
      header: 'Stock / Cantidades',
      render: (b) => (
        <div className="text-xs sm:text-sm">
          <div>Total Inicial: <strong className="font-mono">{b.quantity}</strong></div>
          <div>Vendidos: <span className="font-mono text-[#7b7487]">{b.quantity_sold}</span></div>
          <div className="text-[#630ed4] font-bold">
            Disponible: <span className="font-mono text-sm sm:text-base">{b.stock_available} {selectedProduct?.unit || 'pza'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Fecha Recepción',
      render: (b) => (
        <span className="text-xs sm:text-sm text-[#7b7487] font-mono">{b.received_date || 'N/A'}</span>
      )
    },
    {
      header: 'Estado',
      render: (b) => (
        <span
          className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-bold ${
            b.is_active ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#ffdad6] text-[#ba1a1a]'
          }`}
        >
          {b.is_active ? 'Activo' : 'Inactivo'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0b1c30] tracking-tight">Gestión de Lotes de Producto</h2>
          <p className="text-xs text-[#7b7487]">
            Control de rotación FIFO, fechas de caducidad y stock por lote con buscador rápido
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/productos')}
            className="min-h-[44px] px-4 bg-white border border-[#ccc3d8] rounded-xl text-xs font-bold hover:bg-[#e5eeff] active:scale-95 shadow-xs"
          >
            ← Volver a Productos
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            disabled={!selectedProductId}
            className="min-h-[44px] px-5 bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Registrar Lote
          </button>
        </div>
      </div>

      {/* Interactive Product Search & Selected Card */}
      <div className="bg-white p-4 rounded-2xl border border-[#ccc3d8]/40 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Searchable Autocomplete Combobox */}
        <div className="w-full md:w-1/2 relative">
          <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
            Buscar Producto (+1000 items):
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7487] text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder={selectedProduct ? `${selectedProduct.name} (Escribe para cambiar...)` : 'Escribe nombre, SKU o código...'}
              value={productSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                setIsSearchOpen(true);
                if (searchResults.length === 0) fetchProductsList();
              }}
              className="w-full min-h-[48px] pl-10 pr-4 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            />
          </div>

          {/* Autocomplete Dropdown List */}
          {isSearchOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#ccc3d8] rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-[#e5eeff]">
              {searching ? (
                <div className="p-4 text-center text-xs text-[#7b7487]">Buscando productos...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#7b7487]">No se encontraron productos</div>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full p-3 text-left hover:bg-[#eff4ff] transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center overflow-hidden shrink-0 border border-[#ccc3d8]/40">
                        {p.image_url ? (
                          <img src={getProductImageUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[16px] text-[#630ed4]">inventory_2</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-[#0b1c30]">{p.name}</div>
                        <div className="text-[10px] text-[#7b7487] font-mono">SKU: {p.sku}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-[#630ed4]">${p.sale_price}</span>
                      <div className="text-[10px] text-[#7b7487] font-mono">Stock: {p.total_stock || 0} {p.unit}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Product Banner */}
        {selectedProduct && (
          <div className="flex items-center gap-4 bg-[#eff4ff] p-3.5 rounded-xl border border-[#ccc3d8]/40 w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-[#ccc3d8]/40 shadow-2xs">
              {selectedProduct.image_url ? (
                <img 
                  src={getProductImageUrl(selectedProduct.image_url)} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="material-symbols-outlined text-[#630ed4]">inventory_2</span>
              )}
            </div>
            <div className="text-xs">
              <div className="font-bold text-[#0b1c30] text-sm">{selectedProduct.name}</div>
              <div className="text-[#4a4455] font-mono">
                SKU: {selectedProduct.sku} • Precio: <strong className="text-[#630ed4]">${selectedProduct.sale_price}</strong>
              </div>
              <div className="text-[#7b7487]">
                Stock Total: <strong className="text-[#0b1c30]">{selectedProduct.total_stock || 0} {selectedProduct.unit}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batches Table */}
      <DataTable
        columns={columns}
        data={batches}
        loading={loading}
        emptyMessage="Este producto aún no tiene lotes registrados. Agrega uno con el botón 'Registrar Lote'."
      />

      {/* New/Edit Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBatch ? 'Editar Lote' : 'Registrar Nuevo Lote'}
      >
        <form onSubmit={handleSaveBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
              Número de Lote
            </label>
            <input
              type="text"
              required
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
                Cantidad Inicial ({selectedProduct?.unit || 'pza'})
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
                Fecha Caducidad
              </label>
              <input
                type="date"
                required
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
              Fecha de Recepción
            </label>
            <input
              type="date"
              value={formData.received_date}
              onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
              className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
              Notas / Proveedor
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas opcionales sobre este lote..."
              className="w-full p-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl bg-neutral-200 text-xs font-bold hover:bg-neutral-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-6 rounded-xl bg-[#630ed4] text-white text-xs font-bold hover:bg-[#7c3aed] shadow-md"
            >
              {saving ? 'Guardando...' : editingBatch ? 'Guardar Lote' : 'Crear Lote'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        itemName={targetBatch?.batch_number || 'lote'}
        isActive={targetBatch?.is_active}
        onToggleActive={handleToggleBatch}
        onHardDelete={handleHardDeleteBatch}
      />
    </div>
  );
}
