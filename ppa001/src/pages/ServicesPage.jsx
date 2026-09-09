import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

const DRAFT_KEY = 'pos_admin_service_draft';
const DRAFT_MAX_AGE_MS = 15 * 60 * 1000;

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Custom Service Categories
  const [categoriesList, setCategoriesList] = useState([
    { id: 'globos_helio', name: '🎈 Globos con Helio' },
    { id: 'envolturas', name: '🎁 Envolturas de Regalo' },
    { id: 'impresion_transfer', name: '🖨️ Impresión Transfer / Oblea' },
    { id: 'personalizacion', name: '✂️ Personalización / Vinil' },
    { id: 'general', name: '🛠️ Otro Servicio' }
  ]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('globos_helio');
  const [priceType, setPriceType] = useState('variable');
  const [basePrice, setBasePrice] = useState('25.00');
  const [estimatedTime, setEstimatedTime] = useState('10');

  // Delete / Toggle Dialog
  const [targetService, setTargetService] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [pageSize, setPageSize] = useState(10);

  const fetchServices = async (page = 1, limit = pageSize) => {
    try {
      setLoading(true);
      const res = await api.get('/services', { params: { page, per_page: limit } });
      setServices(res.data.data || []);
      if (res.data.pagination) {
        setPagination({
          ...res.data.pagination,
          onPerPageChange: (newLimit) => {
            setPageSize(newLimit);
            fetchServices(1, newLimit);
          }
        });
      } else {
        setPagination(null);
      }
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar catálogo de servicios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices(currentPage);
  }, [currentPage]);

  // Draft persistence
  useEffect(() => {
    if (isModalOpen && !editingService && name) {
      const draft = {
        data: { name, description, category, priceType, basePrice, estimatedTime },
        timestamp: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [name, description, category, priceType, basePrice, estimatedTime, isModalOpen, editingService]);

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const checkAndLoadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < DRAFT_MAX_AGE_MS) {
          setName(data.name || '');
          setDescription(data.description || '');
          setCategory(data.category || 'globos_helio');
          setPriceType(data.priceType || 'variable');
          setBasePrice(data.basePrice || '25.00');
          setEstimatedTime(data.estimatedTime || '10');
          toast.success('Borrador de servicio recuperado.', { duration: 3000 });
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

  const handleOpenModal = (serv = null) => {
    if (serv) {
      setEditingService(serv);
      setName(serv.name);
      setDescription(serv.description || '');
      setCategory(serv.category || 'general');
      setPriceType(serv.price_type || 'variable');
      setBasePrice(String(serv.base_price || '25.00'));
      setEstimatedTime(String(serv.estimated_time_minutes || '10'));
    } else {
      setEditingService(null);
      setName('');
      setDescription('');
      setCategory('globos_helio');
      setPriceType('variable');
      setBasePrice('25.00');
      setEstimatedTime('10');
      checkAndLoadDraft();
    }
    setIsModalOpen(true);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const key = newCatName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    if (categoriesList.some(c => c.id === key)) {
      toast.error('Esta categoría ya existe');
      return;
    }
    setCategoriesList([...categoriesList, { id: key, name: `📌 ${newCatName.trim()}` }]);
    setCategory(key);
    setNewCatName('');
    setIsCategoryModalOpen(false);
    toast.success('Categoría agregada');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }

    try {
      const payload = {
        name,
        description,
        category,
        price_type: priceType,
        base_price: parseFloat(basePrice) || 0,
        estimated_time_minutes: parseInt(estimatedTime, 10) || 10
      };

      if (editingService) {
        await api.put(`/services/${editingService.id}`, payload);
        toast.success('Servicio actualizado');
      } else {
        await api.post('/services', payload);
        toast.success('Servicio registrado');
        clearDraft();
      }

      setIsModalOpen(false);
      fetchServices(currentPage);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar servicio');
    }
  };

  const handleToggleActive = async (serv) => {
    try {
      await api.patch(`/services/${serv.id}/toggle`);
      toast.success(`Servicio ${serv.is_active ? 'deshabilitado' : 'activado'}`);
      setIsConfirmOpen(false);
      setTargetService(null);
      fetchServices(currentPage);
    } catch (err) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleHardDelete = async (serv) => {
    try {
      await api.delete(`/services/${serv.id}`);
      toast.success('Servicio eliminado permanentemente');
      setIsConfirmOpen(false);
      setTargetService(null);
      fetchServices(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar servicio');
    }
  };

  const columns = [
    {
      header: 'Acciones',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenModal(item)}
            className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] flex items-center justify-center active:scale-95 shadow-xs transition-all"
            title="Editar servicio"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetService(item);
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
      header: 'Servicio',
      render: (item) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0b1c30] text-sm sm:text-base">{item.name}</span>
            {!item.is_active && (
              <span className="bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold px-2 py-0.5 rounded-lg">Inactivo</span>
            )}
          </div>
          <div className="text-xs text-[#7b7487] line-clamp-1">{item.description}</div>
        </div>
      )
    },
    {
      header: 'Categoría',
      render: (item) => {
        const found = categoriesList.find(c => c.id === item.category);
        return (
          <span className="bg-[#eff4ff] text-[#0284c7] font-bold text-xs sm:text-sm px-3 py-1 rounded-xl">
            {found ? found.name : item.category.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      header: 'Tiempo Estimado',
      render: (item) => (
        <span className="bg-[#f3e8ff] text-[#630ed4] font-bold text-xs sm:text-sm px-3 py-1 rounded-xl font-mono flex items-center gap-1 w-fit">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          {item.estimated_time_minutes || 10} min
        </span>
      )
    },
    {
      header: 'Modalidad de Precio',
      render: (item) => (
        <span className={`font-semibold text-xs sm:text-sm px-3 py-1 rounded-xl ${
          item.price_type === 'variable' ? 'bg-[#ffeedd] text-[#ea580c]' : 'bg-[#e5eeff] text-[#005479]'
        }`}>
          {item.price_type === 'variable' ? 'Variable al Cobro' : 'Precio Fijo'}
        </span>
      )
    },
    {
      header: 'Precio Base Sugerido',
      render: (item) => (
        <span className="font-mono font-black text-base text-[#0284c7]">
          ${parseFloat(item.base_price).toFixed(2)}
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
            Catálogo de Servicios
          </h2>
          <p className="text-xs text-[#7b7487]">
            Servicios en tienda (Helio, Envolturas, Impresiones) con tiempo estimado de acción y modalidades de cobro
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="min-h-[44px] px-3.5 bg-white border border-[#ccc3d8] hover:bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">category</span>
            <span>+ Categoría</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="min-h-[44px] px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Crear Nuevo Servicio</span>
          </button>
        </div>
      </div>

      {/* Table with Pagination */}
      <DataTable
        columns={columns}
        data={services}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setCurrentPage(p)}
        emptyMessage="No hay servicios registrados."
      />

      {/* Modal Crear / Editar Servicio */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? `Editar Servicio: ${editingService.name}` : 'Crear Nuevo Servicio en Tienda'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre del Servicio *</label>
            <input
              type="text"
              required
              placeholder="Ej: Inflado de Globo con Gas Helio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">Categoría</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[10px] text-[#0284c7] font-bold hover:underline"
                >
                  + Nueva
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              >
                {categoriesList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Tiempo Estimado (Minutos)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="10"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-mono font-bold focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7b7487]">min</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Modalidad de Precio</label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              >
                <option value="variable">Variable (Cajero ingresa monto)</option>
                <option value="fijo">Fijo (Precio estricto)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0b1c30] uppercase">Precio Base Sugerido ($)</label>
              <input
                type="number"
                step="0.50"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-mono font-bold text-[#0284c7] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Descripción / Instrucciones</label>
            <textarea
              rows={2}
              placeholder="Detalle o instrucciones del servicio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            ></textarea>
          </div>

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
              className="min-h-[44px] px-6 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-md active:scale-95"
            >
              {editingService ? 'Guardar Cambios' : 'Registrar Servicio'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Creation Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Crear Nueva Categoría de Servicio"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre de la Categoría</label>
            <input
              type="text"
              required
              placeholder="Ej: Impresión en Lona / Banner"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full min-h-[42px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="min-h-[38px] px-3 rounded-lg border border-[#ccc3d8] text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[38px] px-4 rounded-lg bg-[#0284c7] text-white text-xs font-bold active:scale-95"
            >
              Guardar Categoría
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetService(null);
        }}
        title="Gestionar Estado o Eliminación de Servicio"
        itemName={targetService?.name || 'este servicio'}
        isActive={Boolean(targetService?.is_active)}
        onToggleActive={() => handleToggleActive(targetService)}
        onHardDelete={() => handleHardDelete(targetService)}
      />
    </div>
  );
}

