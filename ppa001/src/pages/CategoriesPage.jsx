import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subSearch, setSubSearch] = useState('');

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catFormData, setCatFormData] = useState({
    name: '',
    type: 'dulceria',
    description: '',
    image_url: ''
  });

  // Subcategory Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [subFormData, setSubFormData] = useState({
    name: '',
    description: '',
    category_id: ''
  });

  const [saving, setSaving] = useState(false);

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'category' | 'subcategory', item: obj }
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, subRes] = await Promise.all([
        api.get('/categories'),
        api.get('/subcategories')
      ]);
      const cats = catRes.data.data || [];
      const subs = subRes.data.data || [];
      setCategories(cats);
      setSubcategories(subs);
      if (!selectedCategory && cats.length > 0) {
        setSelectedCategory(cats[0]);
      } else if (selectedCategory) {
        const found = cats.find(c => c.id === selectedCategory.id);
        if (found) setSelectedCategory(found);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Category Handlers
  const handleOpenCreateCat = () => {
    setEditingCategory(null);
    setCatFormData({
      name: '',
      type: 'dulceria',
      description: '',
      image_url: ''
    });
    setIsCatModalOpen(true);
  };

  const handleOpenEditCat = (cat, e) => {
    if (e) e.stopPropagation();
    setEditingCategory(cat);
    setCatFormData({
      name: cat.name,
      type: cat.type || 'dulceria',
      description: cat.description || '',
      image_url: cat.image_url || ''
    });
    setIsCatModalOpen(true);
  };

  const handleToggleCategory = async (cat, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/categories/${cat.id}/toggle`);
      toast.success(`Categoría "${cat.name}" ${cat.is_active ? 'deshabilitada' : 'habilitada'}`);
      fetchData();
    } catch (err) {
      toast.error('Error al cambiar estado de la categoría');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      setSaving(true);
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, catFormData);
        toast.success('Categoría actualizada con éxito');
      } else {
        await api.post('/categories', catFormData);
        toast.success('Categoría creada con éxito');
      }
      setIsCatModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar categoría');
    } finally {
      setSaving(false);
    }
  };

  // Subcategory Handlers
  const handleOpenCreateSub = () => {
    setEditingSubcategory(null);
    setSubFormData({
      name: '',
      description: '',
      category_id: selectedCategory?.id || categories[0]?.id || ''
    });
    setIsSubModalOpen(true);
  };

  const handleOpenEditSub = (sub) => {
    setEditingSubcategory(sub);
    setSubFormData({
      name: sub.name,
      description: sub.description || '',
      category_id: sub.category_id
    });
    setIsSubModalOpen(true);
  };

  const handleToggleSubcategory = async (sub) => {
    try {
      await api.patch(`/subcategories/${sub.id}/toggle`);
      toast.success(`Subcategoría "${sub.name}" ${sub.is_active ? 'deshabilitada' : 'habilitada'}`);
      fetchData();
    } catch (err) {
      toast.error('Error al cambiar estado de la subcategoría');
    }
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!subFormData.name.trim() || !subFormData.category_id) {
      toast.error('Nombre y Categoría son requeridos');
      return;
    }

    try {
      setSaving(true);
      if (editingSubcategory) {
        await api.put(`/subcategories/${editingSubcategory.id}`, subFormData);
        toast.success('Subcategoría actualizada');
      } else {
        await api.post('/subcategories', subFormData);
        toast.success('Subcategoría creada');
      }
      setIsSubModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar subcategoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'category') {
        await api.delete(`/categories/${deleteTarget.item.id}`);
        toast.success('Categoría eliminada / deshabilitada correctamente');
        if (selectedCategory?.id === deleteTarget.item.id) {
          setSelectedCategory(categories.find(c => c.id !== deleteTarget.item.id) || null);
        }
      } else {
        await api.delete(`/subcategories/${deleteTarget.item.id}`);
        toast.success('Subcategoría eliminada / deshabilitada correctamente');
      }
      setIsConfirmOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const getCategoryTypeBadge = (type) => {
    switch (type) {
      case 'dulceria':
        return <span className="bg-[#fef9c3] text-[#854d0e] text-[10px] font-bold px-2 py-0.5 rounded-full">Dulcería</span>;
      case 'materias_primas':
        return <span className="bg-[#eff4ff] text-[#005479] text-[10px] font-bold px-2 py-0.5 rounded-full">Materias Primas</span>;
      case 'regalos':
        return <span className="bg-[#ffeedd] text-[#ea580c] text-[10px] font-bold px-2 py-0.5 rounded-full">Regalos / Fiestas</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full">{type}</span>;
    }
  };

  const filteredSubcategories = subcategories.filter(sub => {
    const matchCat = !selectedCategory || sub.category_id === selectedCategory.id;
    const matchSearch = !subSearch || sub.name.toLowerCase().includes(subSearch.toLowerCase()) || (sub.description && sub.description.toLowerCase().includes(subSearch.toLowerCase()));
    return matchCat && matchSearch;
  });

  const subColumns = [
    {
      header: 'Acciones',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleToggleSubcategory(item)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-2xs ${
              item.is_active !== false ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-green-50 hover:bg-green-100 text-green-700'
            }`}
            title={item.is_active !== false ? 'Deshabilitar subcategoría' : 'Habilitar subcategoría'}
          >
            <span className="material-symbols-outlined text-[19px]">
              {item.is_active !== false ? 'visibility_off' : 'visibility'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenEditSub(item)}
            className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] flex items-center justify-center transition-all active:scale-95 shadow-2xs"
            title="Editar subcategoría"
          >
            <span className="material-symbols-outlined text-[19px]">edit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteTarget({ type: 'subcategory', item });
              setIsConfirmOpen(true);
            }}
            className="w-9 h-9 rounded-xl bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] flex items-center justify-center transition-all active:scale-95 shadow-2xs"
            title="Eliminar subcategoría"
          >
            <span className="material-symbols-outlined text-[19px]">delete</span>
          </button>
        </div>
      )
    },
    {
      header: 'Subcategoría',
      render: (item) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#0b1c30] text-sm sm:text-base">{item.name}</span>
            {item.is_active === false && (
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-lg">Inactiva</span>
            )}
          </div>
          <div className="text-xs text-[#7b7487]">{item.description || 'Sin descripción'}</div>
        </div>
      )
    },
    {
      header: 'Categoría Padre',
      render: (item) => (
        <span className="text-sm font-semibold text-[#630ed4]">{item.category_name || selectedCategory?.name}</span>
      )
    },
    {
      header: 'Productos Vinculados',
      render: (item) => (
        <span className="font-mono font-bold text-sm bg-[#eff4ff] px-3 py-1 rounded-xl text-[#0b1c30]">
          {item.product_count || 0} prods
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0b1c30] tracking-tight">Gestión de Categorías & Subcategorías</h1>
          <p className="text-xs text-[#7b7487]">
            Organiza el catálogo comercial del negocio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreateCat}
            className="min-h-[42px] px-4 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Nueva Categoría</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateSub}
            className="min-h-[42px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] border border-[#ccc3d8]/40 text-xs font-bold flex items-center gap-2 shadow-2xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
            <span>+ Nueva Subcategoría</span>
          </button>
        </div>
      </div>

      {/* Grid of Categories Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase text-[#0b1c30] tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#630ed4]">category</span>
            <span>Categorías Principales ({categories.length})</span>
          </h2>
          <span className="text-[11px] text-[#7b7487]">Haz clic en una categoría para filtrar sus subcategorías</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#eff4ff] border-[#630ed4] shadow-md ring-2 ring-[#630ed4]/20'
                    : 'bg-white border-[#ccc3d8]/40 hover:border-[#630ed4]/50 hover:shadow-sm'
                } ${cat.is_active === false ? 'opacity-60 bg-gray-50' : ''}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#630ed4]/10 text-[#630ed4] flex items-center justify-center font-bold shrink-0">
                      <span className="material-symbols-outlined text-[22px]">category</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleToggleCategory(cat, e)}
                        className={`w-7 h-7 rounded-lg shadow-2xs flex items-center justify-center ${
                          cat.is_active !== false ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-green-50 hover:bg-green-100 text-green-700'
                        }`}
                        title={cat.is_active !== false ? 'Deshabilitar categoría' : 'Habilitar categoría'}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {cat.is_active !== false ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditCat(cat, e)}
                        className="w-7 h-7 rounded-lg bg-white/80 hover:bg-[#dce9ff] text-[#630ed4] flex items-center justify-center shadow-2xs"
                        title="Editar categoría"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'category', item: cat });
                          setIsConfirmOpen(true);
                        }}
                        className="w-7 h-7 rounded-lg bg-white/80 hover:bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shadow-2xs"
                        title="Eliminar categoría"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-[#0b1c30]">{cat.name}</h3>
                      {cat.is_active === false && (
                        <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">Inactiva</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7b7487] line-clamp-2 mt-0.5">
                      {cat.description || 'Sin descripción adicional'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#ccc3d8]/30 flex items-center justify-between">
                  {getCategoryTypeBadge(cat.type)}
                  <span className="text-[11px] font-mono font-bold text-[#7b7487]">
                    {cat.subcategory_count || 0} subcats
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subcategories Table Section */}
      <div className="space-y-3 bg-white p-5 rounded-2xl border border-[#ccc3d8]/40 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase text-[#0b1c30] tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#630ed4]">bookmark</span>
              <span>Subcategorías de {selectedCategory ? `"${selectedCategory.name}"` : 'Todas'} ({filteredSubcategories.length})</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7487] text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar subcategoría..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="w-56 min-h-[38px] pl-9 pr-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#630ed4]"
              />
            </div>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="min-h-[38px] px-3 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] rounded-xl text-xs font-bold"
              >
                Ver Todas
              </button>
            )}
          </div>
        </div>

        <DataTable
          columns={subColumns}
          data={filteredSubcategories}
          loading={loading}
          emptyMessage="No se encontraron subcategorías registradas."
        />
      </div>

      {/* Modal Crear / Editar Categoría */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => !saving && setIsCatModalOpen(false)}
        title={editingCategory ? `Editar Categoría: ${editingCategory.name}` : 'Crear Nueva Categoría'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre de la Categoría *</label>
            <input
              type="text"
              required
              placeholder="Ej: Dulcería a Granel"
              value={catFormData.name}
              onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
              className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Tipo de Catálogo Comercial *</label>
            <select
              value={catFormData.type}
              onChange={(e) => setCatFormData({ ...catFormData, type: e.target.value })}
              className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="dulceria">Dulcería (Golosinas, Chocolates, Gomitas)</option>
              <option value="materias_primas">Materias Primas (Harinas, Coberturas, Esencias)</option>
              <option value="regalos">Regalos & Fiestas (Globos, Piñatas, Envolturas)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Descripción / Observaciones</label>
            <textarea
              rows={3}
              placeholder="Breve descripción de la categoría..."
              value={catFormData.description}
              onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
              className="w-full p-2.5 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="min-h-[42px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[42px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95"
            >
              {saving ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear / Editar Subcategoría */}
      <Modal
        isOpen={isSubModalOpen}
        onClose={() => !saving && setIsSubModalOpen(false)}
        title={editingSubcategory ? `Editar Subcategoría: ${editingSubcategory.name}` : 'Crear Nueva Subcategoría'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveSub} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Categoría Padre *</label>
            <select
              value={subFormData.category_id}
              onChange={(e) => setSubFormData({ ...subFormData, category_id: e.target.value })}
              className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-bold focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre de la Subcategoría *</label>
            <input
              type="text"
              required
              placeholder="Ej: Gomitas Enchiladas, Globos Metálicos..."
              value={subFormData.name}
              onChange={(e) => setSubFormData({ ...subFormData, name: e.target.value })}
              className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0b1c30] uppercase">Descripción</label>
            <textarea
              rows={3}
              placeholder="Descripción opcional..."
              value={subFormData.description}
              onChange={(e) => setSubFormData({ ...subFormData, description: e.target.value })}
              className="w-full p-2.5 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsSubModalOpen(false)}
              className="min-h-[42px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[42px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95"
            >
              {saving ? 'Guardando...' : editingSubcategory ? 'Guardar Cambios' : 'Crear Subcategoría'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={`Eliminar / Deshabilitar ${deleteTarget?.type === 'category' ? 'Categoría' : 'Subcategoría'}`}
        message={`¿Estás seguro de eliminar o deshabilitar "${deleteTarget?.item?.name}"? Si tiene productos o subcategorías vinculadas, se deshabilitará de forma segura.`}
        confirmText="Sí, Continuar"
        confirmVariant="danger"
      />
    </div>
  );
}
