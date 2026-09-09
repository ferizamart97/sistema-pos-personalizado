import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import PriceMarginInput from '../components/common/PriceMarginInput';
import ImageCapture from '../components/common/ImageCapture';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ExpirationSemaphore from '../components/common/ExpirationSemaphore';
import { getProductImageUrl } from '../utils/imageUrl';
import { 
  exportProductsToCSV, 
  exportProductsToWord, 
  downloadProductBulkTemplate,
  downloadProductBulkTemplateExcel,
  downloadProductBulkTemplateCSV,
  SAMPLE_BULK_PRODUCTS_GRANEL,
  SAMPLE_BULK_PRODUCTS_PIEZAS
} from '../utils/exportUtils';

const DRAFT_KEY = 'pos_admin_product_draft';
const DRAFT_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos


export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCatType, setSelectedCatType] = useState('');
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModeTab, setBulkModeTab] = useState('excel'); // 'excel' | 'web_grid'
  const [bulkParsedProducts, setBulkParsedProducts] = useState([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [importingBulk, setImportingBulk] = useState(false);
  const [gridRows, setGridRows] = useState([]);
  const [isPasteAreaOpen, setIsPasteAreaOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');


  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [actionSheetProduct, setActionSheetProduct] = useState(null);
  const [modalTab, setModalTab] = useState('general'); // 'general', 'bulk', 'fractions', 'wholesale', 'history'
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    subcategory_id: '',
    purchase_price: '50',
    margin_type: 'percentage',
    margin_value: '20',
    min_stock: '5',
    unit: 'pza',
    image_url: '',
    initial_stock: '10',
    expiration_date: '',
    is_bulk_enabled: false,
    bulk_unit: 'kg',
    bulk_price: '72.00',
    package_content: '1.000',
    bulk_stock: '0'
  });
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Extra Sub-Tables (Fractions, Wholesale & Bulk History)
  const [fractions, setFractions] = useState([]);
  const [wholesaleTiers, setWholesaleTiers] = useState([]);
  const [bulkHistory, setBulkHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fraction creation helpers
  const [newFraction, setNewFraction] = useState({ name: '', multiplier: '0.500', price: '' });
  const [newWholesale, setNewWholesale] = useState({ min_qty: '12', price: '' });
  const [openBagsCount, setOpenBagsCount] = useState('1');

  // Section Collapsibles for 2-row layout
  const [isGeneralSectionOpen, setIsGeneralSectionOpen] = useState(true);
  const [isPricingSectionOpen, setIsPricingSectionOpen] = useState(true);

  // Delete / Toggle Dialog State
  const [targetProduct, setTargetProduct] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Calculate current estimated sale price
  const getSalePrice = () => {
    const cost = parseFloat(formData.purchase_price) || 0;
    const margin = parseFloat(formData.margin_value) || 0;
    if (formData.margin_type === 'percentage') {
      return (cost * (1 + margin / 100)).toFixed(2);
    }
    return (cost + margin).toFixed(2);
  };

  // Auto calculate bulk price (+20%) based on sale price
  const getBulkSuggestedPrice = (salePrice) => {
    const base = parseFloat(salePrice || getSalePrice()) || 0;
    return (base * 1.20).toFixed(2);
  };

  // Draft persistence in localStorage
  useEffect(() => {
    if (isModalOpen && !editingProduct && formData.name) {
      const draft = {
        data: formData,
        timestamp: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [formData, isModalOpen, editingProduct]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const checkAndLoadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < DRAFT_MAX_AGE_MS) {
          setFormData(data);
          toast.success('Se recuperó el borrador que tenías pendiente.', { duration: 3000 });
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

  const fetchProducts = async (page = 1, limit = pageSize) => {
    try {
      setLoading(true);
      const params = { page, per_page: limit };
      if (search) params.search = search;
      if (selectedCatType) params.category_type = selectedCatType;

      const response = await api.get('/products', { params });
      setProducts(response.data.data || []);
      if (response.data.pagination) {
        setPagination({
          ...response.data.pagination,
          onPerPageChange: (newLimit) => {
            setPageSize(newLimit);
            fetchProducts(1, newLimit);
          }
        });
      } else {
        setPagination(null);
      }
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const [catRes, subRes] = await Promise.all([
        api.get('/categories'),
        api.get('/subcategories')
      ]);
      setCategories(catRes.data.data || []);
      setSubcategories(subRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProductExtras = async (productId) => {
    try {
      const [fracRes, wholeRes] = await Promise.all([
        api.get(`/products/${productId}/fractions`),
        api.get(`/products/${productId}/wholesale-tiers`)
      ]);
      setFractions(fracRes.data.data || []);
      setWholesaleTiers(wholeRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBulkHistory = async (productId) => {
    try {
      setLoadingHistory(true);
      const res = await api.get(`/products/${productId}/bulk-history`);
      setBulkHistory(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchProducts(currentPage);
  }, [search, selectedCatType]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setModalTab('general');
    const defaultExp = new Date();
    defaultExp.setDate(defaultExp.getDate() + 90);

    const initial = {
      name: '',
      sku: `PROD-${Date.now().toString().slice(-4)}`,
      barcode: '',
      description: '',
      subcategory_id: subcategories[0]?.id || '',
      purchase_price: '50',
      margin_type: 'percentage',
      margin_value: '20',
      min_stock: '5',
      unit: 'pza',
      image_url: '',
      initial_stock: '10',
      expiration_date: defaultExp.toISOString().split('T')[0],
      is_bulk_enabled: false,
      bulk_unit: 'kg',
      bulk_price: '72.00',
      package_content: '1.000',
      bulk_stock: '0'
    };

    setFormData(initial);
    setFractions([]);
    setWholesaleTiers([]);
    setBulkHistory([]);
    setSelectedPhotoFile(null);
    checkAndLoadDraft();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setModalTab('general');
    const salePrice = String(prod.sale_price || '0');
    const suggestedBulkPrice = prod.bulk_price && parseFloat(prod.bulk_price) > 0
      ? String(prod.bulk_price)
      : getBulkSuggestedPrice(salePrice);

    setFormData({
      name: prod.name,
      sku: prod.sku,
      barcode: prod.barcode || '',
      description: prod.description || '',
      subcategory_id: prod.subcategory_id || '',
      purchase_price: String(prod.purchase_price || '0'),
      margin_type: prod.margin_type || 'percentage',
      margin_value: String(prod.margin_value || '0'),
      min_stock: String(prod.min_stock || '5'),
      unit: prod.unit || 'pza',
      image_url: prod.image_url || '',
      is_bulk_enabled: Boolean(prod.is_bulk_enabled),
      bulk_unit: prod.bulk_unit || 'kg',
      bulk_price: suggestedBulkPrice,
      package_content: String(prod.package_content || '1.000'),
      bulk_stock: String(prod.bulk_stock || '0')
    });
    setSelectedPhotoFile(null);
    loadProductExtras(prod.id);
    loadBulkHistory(prod.id);
    setIsModalOpen(true);
  };

  const handleBulkToggle = (checked) => {
    const salePrice = getSalePrice();
    const autoBulkPrice = getBulkSuggestedPrice(salePrice);
    setFormData(prev => ({
      ...prev,
      is_bulk_enabled: checked,
      bulk_price: checked ? autoBulkPrice : prev.bulk_price
    }));
  };

  const handlePriceMarginChange = (pricing) => {
    setFormData(prev => {
      const updated = { ...prev, ...pricing };
      if (updated.is_bulk_enabled) {
        const cost = parseFloat(updated.purchase_price) || 0;
        const margin = parseFloat(updated.margin_value) || 0;
        const sp = updated.margin_type === 'percentage' ? cost * (1 + margin / 100) : cost + margin;
        updated.bulk_price = (sp * 1.20).toFixed(2);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      toast.error('Nombre y SKU son requeridos');
      return;
    }

    try {
      setSaving(true);
      let prodId = editingProduct?.id;

      const payload = {
        ...formData,
        subcategory_id: formData.subcategory_id ? Number(formData.subcategory_id) : null,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        margin_value: parseFloat(formData.margin_value) || 0,
        min_stock: parseInt(formData.min_stock, 10) || 0,
        initial_stock: parseInt(formData.initial_stock, 10) || 0,
        bulk_price: parseFloat(formData.bulk_price) || 0,
        package_content: parseFloat(formData.package_content) || 1,
        bulk_stock: parseFloat(formData.bulk_stock) || 0
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success('Producto actualizado exitosamente');
      } else {
        const res = await api.post('/products', payload);
        prodId = res.data.data.id;
        toast.success('Producto creado exitosamente');
        clearDraft();
      }

      // Subir foto si se tomó o seleccionó una
      if (selectedPhotoFile && prodId) {
        const formPhoto = new FormData();
        formPhoto.append('photo', selectedPhotoFile);
        await api.post(`/products/${prodId}/photo`, formPhoto, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsModalOpen(false);
      fetchProducts(currentPage);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBags = async () => {
    if (!editingProduct) return;
    try {
      const count = parseInt(openBagsCount, 10) || 1;
      const res = await api.post(`/products/${editingProduct.id}/open-bulk`, { packages_count: count });
      toast.success(`Se abrieron ${count} bolsa(s) exitosamente.`);
      setFormData(prev => ({ ...prev, bulk_stock: String(res.data.data.new_bulk_stock) }));
      loadBulkHistory(editingProduct.id);
      fetchProducts(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al abrir bolsas');
    }
  };

  const handleGenerateStandardFractions = async () => {
    if (!editingProduct) return;
    const bulkPrice = parseFloat(formData.bulk_price) || parseFloat(getBulkSuggestedPrice(getSalePrice()));
    const standards = [
      { name: '3/4 Kilo', fraction_multiplier: 0.750, price: parseFloat((bulkPrice * 0.75).toFixed(2)) },
      { name: '1/2 Kilo', fraction_multiplier: 0.500, price: parseFloat((bulkPrice * 0.50).toFixed(2)) },
      { name: '1/4 Kilo', fraction_multiplier: 0.250, price: parseFloat((bulkPrice * 0.25).toFixed(2)) },
      { name: '100 Gramos', fraction_multiplier: 0.100, price: parseFloat((bulkPrice * 0.10).toFixed(2)) }
    ];

    try {
      for (const frac of standards) {
        await api.post(`/products/${editingProduct.id}/fractions`, frac);
      }
      toast.success('Fracciones estándar de kilo generadas con éxito');
      loadProductExtras(editingProduct.id);
    } catch (err) {
      toast.error('Error al generar fracciones automáticas');
    }
  };

  const handleGeneratePieceFractions = async () => {
    if (!editingProduct) return;
    const unitPrice = parseFloat(getSalePrice()) || parseFloat(formData.sale_price) || 1.0;
    const piecePackages = [
      { name: 'Paquete 25 Piezas', fraction_multiplier: 25, price: parseFloat((unitPrice * 25).toFixed(2)) },
      { name: 'Paquete 50 Piezas', fraction_multiplier: 50, price: parseFloat((unitPrice * 50).toFixed(2)) },
      { name: 'Paquete 100 Piezas', fraction_multiplier: 100, price: parseFloat((unitPrice * 100).toFixed(2)) },
      { name: 'Paquete 500 Piezas', fraction_multiplier: 500, price: parseFloat((unitPrice * 500 * 0.95).toFixed(2)) },
      { name: 'Caja 1,000 Piezas', fraction_multiplier: 1000, price: parseFloat((unitPrice * 1000 * 0.90).toFixed(2)) }
    ];

    try {
      for (const pack of piecePackages) {
        await api.post(`/products/${editingProduct.id}/fractions`, pack);
      }
      toast.success('Paquetes de 25, 50, 100, 500 y 1,000 piezas generados con éxito');
      loadProductExtras(editingProduct.id);
    } catch (err) {
      toast.error('Error al generar paquetes de piezas');
    }
  };

  const handleFractionMultiplierChange = (multiplierVal) => {
    const m = parseFloat(multiplierVal) || 0;
    const baseP = formData.unit === 'pza'
      ? parseFloat(getSalePrice()) || 1.0
      : (parseFloat(formData.bulk_price) || parseFloat(getBulkSuggestedPrice(getSalePrice())));
    const autoPrice = (baseP * m).toFixed(2);
    setNewFraction(prev => ({
      ...prev,
      multiplier: multiplierVal,
      price: autoPrice
    }));
  };

  const handleAddFraction = async (e) => {
    e.preventDefault();
    if (!editingProduct || !newFraction.name || !newFraction.price) return;
    try {
      await api.post(`/products/${editingProduct.id}/fractions`, {
        name: newFraction.name,
        fraction_multiplier: parseFloat(newFraction.multiplier),
        price: parseFloat(newFraction.price)
      });
      toast.success('Fracción / Paquete guardado');
      setNewFraction({ name: '', multiplier: formData.unit === 'pza' ? '25' : '0.500', price: '' });
      loadProductExtras(editingProduct.id);
    } catch (err) {
      toast.error('Error al guardar fracción');
    }
  };

  const handleDeleteFraction = async (fracId) => {
    try {
      await api.delete(`/products/fractions/${fracId}`);
      toast.success('Fracción eliminada');
      if (editingProduct) loadProductExtras(editingProduct.id);
    } catch (err) {
      toast.error('Error al eliminar fracción');
    }
  };

  const handleAddWholesale = async (e) => {
    e.preventDefault();
    if (!editingProduct || !newWholesale.min_qty || !newWholesale.price) return;

    const purchasePrice = parseFloat(formData.purchase_price) || 0;
    const wholesalePrice = parseFloat(newWholesale.price) || 0;

    if (wholesalePrice < purchasePrice) {
      toast.error(`El precio de mayoreo ($${wholesalePrice.toFixed(2)}) NO puede ser menor al costo de compra ($${purchasePrice.toFixed(2)})`);
      return;
    }

    try {
      await api.post(`/products/${editingProduct.id}/wholesale-tiers`, {
        min_quantity: parseFloat(newWholesale.min_qty),
        wholesale_price: wholesalePrice
      });
      toast.success('Escala de mayoreo guardada');
      setNewWholesale({ min_qty: '12', price: '' });
      loadProductExtras(editingProduct.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar escala');
    }
  };

  const handleDeleteWholesale = async (tierId) => {
    try {
      await api.delete(`/products/wholesale-tiers/${tierId}`);
      toast.success('Escala eliminada');
      if (editingProduct) loadProductExtras(editingProduct.id);
    } catch (err) {
      toast.error('Error al eliminar escala');
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await api.patch(`/products/${product.id}/toggle`);
      toast.success(`Producto ${product.is_active ? 'deshabilitado' : 'activado'}`);
      setIsConfirmOpen(false);
      setTargetProduct(null);
      fetchProducts(currentPage);
    } catch (err) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleHardDelete = async (product) => {
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Producto eliminado permanentemente');
      setIsConfirmOpen(false);
      setTargetProduct(null);
      fetchProducts(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar producto');
    }
  };

  const columns = [
    {
      header: 'Acciones',
      render: (item) => (
        <div>
          {/* Mobile 3-Dots Action Button */}
          <div className="lg:hidden flex justify-center">
            <button
              type="button"
              onClick={() => setActionSheetProduct(item)}
              className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] border border-[#630ed4]/30 flex items-center justify-center shadow-2xs active:scale-95 transition-all"
              title="Acciones"
              aria-label="Acciones"
            >
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>

          {/* Desktop Horizontal Icons */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate(`/productos/lotes?product_id=${item.id}`)}
              className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#005479] flex items-center justify-center active:scale-95 shadow-xs transition-all"
              title="Ver lotes de este producto"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenEdit(item)}
              className="w-9 h-9 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] flex items-center justify-center active:scale-95 shadow-xs transition-all"
              title="Editar producto, granel y mayoreo"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetProduct(item);
                setIsConfirmOpen(true);
              }}
              className="w-9 h-9 rounded-xl bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] flex items-center justify-center active:scale-95 shadow-xs transition-all"
              title="Eliminar o deshabilitar"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </div>
      )
    },
    {
      header: 'Producto',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center overflow-hidden shrink-0 border border-[#ccc3d8]/40 shadow-2xs">
            {item.image_url ? (
              <img 
                src={getProductImageUrl(item.image_url)} 
                alt={item.name} 
                className="w-full h-full object-cover" 
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
              />
            ) : (
              <span className="material-symbols-outlined text-[#630ed4] text-[22px]">inventory_2</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[#0b1c30] text-sm sm:text-base">{item.name}</span>
              {item.is_bulk_enabled && (
                <span className="bg-[#fef9c3] text-[#854d0e] text-xs font-bold px-2 py-0.5 rounded-lg">Granel</span>
              )}
              {!item.is_active && (
                <span className="bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold px-2 py-0.5 rounded-lg">Inactivo</span>
              )}
            </div>
            <div className="text-xs text-[#7b7487] font-mono">
              SKU: {item.sku} {item.barcode && `• Barcode: ${item.barcode}`}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Categoría',
      render: (item) => <span className="text-sm font-semibold text-[#0b1c30]">{item.subcategory_name || 'Sin Categoría'}</span>
    },
    {
      header: 'Precio Venta',
      render: (item) => (
        <div>
          <span className="font-mono font-black text-base text-[#630ed4]">${parseFloat(item.sale_price).toFixed(2)}</span>
          <div className="text-xs text-[#7b7487]">Costo: ${parseFloat(item.purchase_price).toFixed(2)}</div>
        </div>
      )
    },
    {
      header: 'Stock Total Lotes',
      render: (item) => (
        <div>
          <span className={`font-mono font-black text-base ${item.total_stock <= item.min_stock ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'}`}>
            {item.total_stock || 0} {item.unit}
          </span>
          {item.is_bulk_enabled && (
            <div className="text-xs text-[#854d0e] font-mono font-semibold">
              Granel: {parseFloat(item.bulk_stock || 0).toFixed(3)} {item.bulk_unit}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Caducidad Próxima',
      render: (item) => (
        <ExpirationSemaphore
          daysRemaining={item.semaphore?.days}
          semaphore={item.semaphore?.color}
          label={item.semaphore?.label}
          expirationDate={item.nearest_expiration}
          productName={item.name}
        />
      )
    }
  ];

  const handleExport = async (type, format) => {
    try {
      setExporting(true);
      // Obtener todos los productos para exportación completa
      const res = await api.get('/products', { params: { per_page: 500 } });
      const allProds = res.data.data || [];

      let targetProds = allProds;
      let title = 'Catálogo Completo de Productos';
      let filename = 'catalogo_productos';

      if (type === 'expiring') {
        targetProds = allProds.filter(p => p.days_to_expiration !== null && p.days_to_expiration !== undefined && p.days_to_expiration <= 60);
        title = 'Reporte de Productos Próximos a Caducar (<= 60 días)';
        filename = 'productos_por_caducar';
      } else if (type === 'low_stock') {
        targetProds = allProds.filter(p => (parseFloat(p.total_stock) || 0) <= (parseFloat(p.min_stock) || 0));
        title = 'Reporte de Productos con Poco Stock (Stock Bajo)';
        filename = 'productos_poco_stock';
      }

      if (targetProds.length === 0) {
        toast.error('No hay productos que coincidan con este filtro para exportar');
        return;
      }

      if (format === 'excel') {
        exportProductsToCSV(targetProds, `${filename}.csv`);
        toast.success(`Archivo Excel (${filename}.csv) descargado`);
      } else {
        exportProductsToWord(targetProds, title, `${filename}.doc`);
        toast.success(`Archivo Word (${filename}.doc) descargado`);
      }
      setIsExportMenuOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al generar archivo de exportación');
    } finally {
      setExporting(false);
    }
  };

  // Normalize an item dictionary into a validated product payload
  const normalizeBulkItem = (item) => {
    const sku = (item['sku'] || item['codigo'] || '').trim().toUpperCase();
    const name = (item['nombre'] || item['producto'] || item['name'] || '').trim();
    const subcategory_name = (item['subcategoria'] || item['categoria'] || '').trim();
    const purchase_price = parseFloat(item['precio_compra'] || item['costo'] || 0);
    const margin_type = (item['tipo_margen'] || 'percentage').toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
    const margin_value = parseFloat(item['valor_margen'] || item['margen'] || 30);
    const initial_stock = parseFloat(item['stock_inicial'] || item['stock'] || 0);
    const min_stock = parseFloat(item['stock_minimo'] || 5);
    const esGranelVal = (item['es_granel'] || '').toString().trim().toUpperCase();
    const is_bulk_enabled = esGranelVal === 'SI' || esGranelVal === 'SÍ' || esGranelVal === 'TRUE' || item['es_granel'] === true;
    const expiration_days = parseInt(item['dias_caducidad'] || 180, 10);
    const barcode = (item['codigo_barras'] || item['barcode'] || '').trim();
    const unit = (item['unidad'] || (is_bulk_enabled ? 'kg' : 'pza')).trim().toLowerCase();

    if (!sku || !name || purchase_price <= 0) return null;

    const sale_price = margin_type === 'percentage'
      ? purchase_price * (1 + (margin_value / 100))
      : purchase_price + margin_value;

    return {
      sku,
      name,
      subcategory_name,
      purchase_price,
      margin_type,
      margin_value,
      sale_price: parseFloat(sale_price.toFixed(2)),
      initial_stock,
      min_stock,
      is_bulk_enabled,
      expiration_days,
      barcode,
      unit,
      status: 'Valido'
    };
  };

  // Parse raw text from .xls (XML/HTML table), CSV, TSV, or Google Sheets paste
  const parseRawBulkContent = (text) => {
    // 1. If text contains HTML or XML Spreadsheet tags (e.g. from downloaded .xls or web tables)
    if (text.includes('<table') || text.includes('<Table') || text.includes('xmlns:x="urn:schemas-microsoft-com:office:excel"')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const rows = Array.from(doc.querySelectorAll('tr'));
      if (rows.length < 2) {
        throw new Error('La tabla no contiene filas suficientes de encabezados y datos');
      }

      const headerCells = Array.from(rows[0].querySelectorAll('th, td')).map(c => 
        c.textContent.trim().toLowerCase().replace(/\(\*\)|\(ref\)|\*/g, '').trim()
      );

      const parsed = [];
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td')).map(c => c.textContent.trim());
        if (cells.length === 0 || !cells.some(c => c.length > 0)) continue;

        const item = {};
        headerCells.forEach((h, idx) => {
          item[h] = cells[idx] || '';
        });

        const normalized = normalizeBulkItem(item);
        if (normalized) parsed.push(normalized);
      }
      return parsed;
    }

    // 2. CSV / TSV / Semicolon-delimited Text
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('El texto o archivo no contiene filas suficientes');
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');
    const headers = firstLine.split(delimiter).map(h => 
      h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\(\*\)|\(ref\)|\*/g, '').trim()
    );

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i];
      let values = [];
      if (delimiter === ',') {
        values = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rawLine.split(',');
      } else {
        values = rawLine.split(delimiter);
      }
      const cleanValues = values.map(v => v ? v.trim().replace(/^"|"$/g, '') : '');

      const item = {};
      headers.forEach((h, idx) => {
        item[h] = cleanValues[idx] || '';
      });

      const normalized = normalizeBulkItem(item);
      if (normalized) parsed.push(normalized);
    }
    return parsed;
  };

  // Bulk File Upload Handler (.xls, .xlsx, .csv, .tsv)
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsed = parseRawBulkContent(text);

        if (parsed.length === 0) {
          toast.error('No se encontraron filas válidas. Revisa que SKU, Nombre y Precio de Compra sean mayores a 0.');
        } else {
          setBulkParsedProducts(parsed);
          toast.success(`${parsed.length} productos listos para importar`);
        }
      } catch (parseErr) {
        console.error(parseErr);
        toast.error(parseErr.message || 'Error al procesar el archivo');
      }
    };
    reader.readAsText(file);
  };

  // Interactive Web Grid Handlers
  const handleAddGridRow = (template = null) => {
    const newRow = {
      id: Date.now() + Math.random(),
      sku: template?.sku || '',
      name: template?.name || '',
      subcategory_name: template?.subcategory_name || (subcategories[0]?.name || ''),
      purchase_price: template?.purchase_price || 0,
      margin_type: template?.margin_type || 'percentage',
      margin_value: template?.margin_value || 30,
      sale_price: template ? (template.margin_type === 'percentage' ? template.purchase_price * (1 + template.margin_value/100) : template.purchase_price + template.margin_value) : 0,
      initial_stock: template?.initial_stock || 10,
      min_stock: template?.min_stock || 5,
      is_bulk_enabled: template ? Boolean(template.is_bulk_enabled) : false,
      unit: template?.unit || 'pza',
      expiration_days: template?.expiration_days || 180,
      barcode: template?.barcode || ''
    };
    setGridRows(prev => [...prev, newRow]);
  };

  const handleLoadGranelSamples = () => {
    const newRows = SAMPLE_BULK_PRODUCTS_GRANEL.map(item => ({
      ...item,
      id: Date.now() + Math.random(),
      sale_price: item.margin_type === 'percentage'
        ? item.purchase_price * (1 + item.margin_value / 100)
        : item.purchase_price + item.margin_value
    }));
    setGridRows(prev => [...prev, ...newRows]);
    toast.success('3 ejemplos a granel agregados a la tabla');
  };

  const handleLoadPiezasSamples = () => {
    const newRows = SAMPLE_BULK_PRODUCTS_PIEZAS.map(item => ({
      ...item,
      id: Date.now() + Math.random(),
      sale_price: item.margin_type === 'percentage'
        ? item.purchase_price * (1 + item.margin_value / 100)
        : item.purchase_price + item.margin_value
    }));
    setGridRows(prev => [...prev, ...newRows]);
    toast.success('4 ejemplos por piezas/paquetes agregados a la tabla');
  };

  const handleGridRowChange = (id, field, value) => {
    setGridRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };

      // Recalculate sale_price if price or margin changes
      if (field === 'purchase_price' || field === 'margin_type' || field === 'margin_value') {
        const pprice = parseFloat(field === 'purchase_price' ? value : updated.purchase_price) || 0;
        const mtype = field === 'margin_type' ? value : updated.margin_type;
        const mval = parseFloat(field === 'margin_value' ? value : updated.margin_value) || 0;
        updated.sale_price = mtype === 'percentage' ? pprice * (1 + mval / 100) : pprice + mval;
      }

      // Sync unit if bulk toggle changes
      if (field === 'is_bulk_enabled') {
        if (value === true) updated.unit = 'kg';
        else if (updated.unit === 'kg') updated.unit = 'pza';
      }

      return updated;
    }));
  };

  const handleRemoveGridRow = (id) => {
    setGridRows(prev => prev.filter(r => r.id !== id));
  };

  const handleDuplicateGridRow = (id) => {
    const target = gridRows.find(r => r.id === id);
    if (!target) return;
    const clone = {
      ...target,
      id: Date.now() + Math.random(),
      sku: target.sku ? `${target.sku}-COPIA` : ''
    };
    setGridRows(prev => [...prev, clone]);
  };

  const handleClearGrid = () => {
    if (gridRows.length > 0 && window.confirm('¿Seguro que deseas vaciar todas las filas de la tabla?')) {
      setGridRows([]);
    }
  };

  const handlePasteFromSpreadsheet = () => {
    if (!pasteRawText.trim()) {
      toast.error('Pega el texto copiado de Excel o Google Sheets');
      return;
    }
    try {
      const parsed = parseRawBulkContent(pasteRawText);
      if (parsed.length === 0) {
        toast.error('No se detectaron filas válidas en el texto pegado');
        return;
      }
      const newGridItems = parsed.map(p => ({
        ...p,
        id: Date.now() + Math.random()
      }));
      setGridRows(prev => [...prev, ...newGridItems]);
      setPasteRawText('');
      setIsPasteAreaOpen(false);
      toast.success(`${parsed.length} productos agregados desde el portapapeles`);
    } catch (e) {
      toast.error(e.message || 'Error al procesar el texto pegado');
    }
  };

  // Submit bulk import payload to API
  const handleExecuteBulkImport = async (productsToImport = null) => {
    const list = productsToImport || (bulkModeTab === 'excel' ? bulkParsedProducts : gridRows.map(r => normalizeBulkItem(r)).filter(Boolean));

    if (!list || list.length === 0) {
      toast.error('No hay productos válidos para importar. Revisa que tengan SKU, Nombre y Costo de compra.');
      return;
    }

    try {
      setImportingBulk(true);
      const res = await api.post('/products/bulk-import', {
        products: list
      });

      toast.success(res.data.message || `Carga completada: ${list.length} productos procesados`);
      setIsBulkModalOpen(false);
      setBulkParsedProducts([]);
      setBulkFileName('');
      setGridRows([]);
      fetchProducts(1);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al ejecutar la carga masiva');
    } finally {
      setImportingBulk(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0b1c30] tracking-tight">Catálogo de Productos</h2>
          <p className="text-xs text-[#7b7487]">
            Gestión comercial, cálculo de ganancia, captura de fotos, fracciones y mayoreo
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Bulk Import Button */}
          <button
            type="button"
            onClick={() => {
              setBulkParsedProducts([]);
              setBulkFileName('');
              setIsBulkModalOpen(true);
            }}
            className="min-h-[44px] px-3.5 bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-[#ccc3d8] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-[#630ed4]">upload_file</span>
            <span>Carga Masiva</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={exporting}
              className="min-h-[44px] px-3.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] border border-[#ccc3d8]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>{exporting ? 'Exportando...' : 'Descargar / Reportes'}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#ccc3d8]/60 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-black text-[#7b7487] uppercase tracking-wider">
                  Inventario Completo
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('all', 'excel')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-green-700 text-[18px]">table_view</span>
                  <span>Descargar Todo (Excel .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('all', 'word')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-blue-700 text-[18px]">description</span>
                  <span>Descargar Todo (Word .doc)</span>
                </button>

                <div className="border-t border-[#ccc3d8]/30 my-1"></div>

                <div className="px-3 py-1.5 text-[10px] font-black text-amber-700 uppercase tracking-wider">
                  Alertas de Caducidad
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('expiring', 'excel')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">timer</span>
                  <span>Por Caducar (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('expiring', 'word')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-blue-700 text-[18px]">description</span>
                  <span>Por Caducar (Word)</span>
                </button>

                <div className="border-t border-[#ccc3d8]/30 my-1"></div>

                <div className="px-3 py-1.5 text-[10px] font-black text-red-700 uppercase tracking-wider">
                  Stock Bajo / Agotados
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('low_stock', 'excel')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-red-600 text-[18px]">warning</span>
                  <span>Poco Stock (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('low_stock', 'word')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-blue-700 text-[18px]">description</span>
                  <span>Poco Stock (Word)</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="min-h-[44px] px-4 bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[44px] px-4 bg-white border border-[#ccc3d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
          />
        </div>
        <div className="sm:w-56">
          <select
            value={selectedCatType}
            onChange={(e) => setSelectedCatType(e.target.value)}
            className="w-full min-h-[44px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
          >
            <option value="">Todas las Categorías</option>
            <option value="dulceria">🍬 Dulcería</option>
            <option value="materias_primas">🧪 Materias Primas</option>
            <option value="regalos">🎁 Regalos</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchProducts(p)}
        emptyMessage="No se encontraron productos registrados."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title={editingProduct ? `Editar Producto: ${editingProduct.name}` : 'Crear Nuevo Producto'}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          <div className="flex bg-[#eff4ff] p-1.5 rounded-xl border border-[#ccc3d8]/40 overflow-x-auto gap-1">
            <button
              type="button"
              onClick={() => setModalTab('general')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                modalTab === 'general' ? 'bg-[#630ed4] text-white shadow-xs' : 'text-[#0b1c30] hover:bg-white/50'
              }`}
            >
              1. Datos &amp; Precios (2 Secciones)
            </button>
            <button
              type="button"
              onClick={() => setModalTab('bulk')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                modalTab === 'bulk' ? 'bg-[#630ed4] text-white shadow-xs' : 'text-[#0b1c30] hover:bg-white/50'
              }`}
            >
              2. Venta a Granel
            </button>
            {editingProduct && (
              <>
                <button
                  type="button"
                  onClick={() => setModalTab('fractions')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    modalTab === 'fractions' ? 'bg-[#630ed4] text-white shadow-xs' : 'text-[#0b1c30] hover:bg-white/50'
                  }`}
                >
                  3. Fracciones (3/4, 1/2, 1/4, 100g)
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('wholesale')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    modalTab === 'wholesale' ? 'bg-[#630ed4] text-white shadow-xs' : 'text-[#0b1c30] hover:bg-white/50'
                  }`}
                >
                  4. Escalas de Mayoreo
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('history')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    modalTab === 'history' ? 'bg-[#630ed4] text-white shadow-xs' : 'text-[#0b1c30] hover:bg-white/50'
                  }`}
                >
                  5. Historial Granel
                </button>
              </>
            )}
          </div>

          {modalTab === 'general' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* FILA 1: INFORMACIÓN GENERAL DEL PRODUCTO (DESPLEGABLE / COLLAPSIBLE) */}
              <div className="bg-[#f8f9ff] rounded-2xl border border-[#ccc3d8]/40 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsGeneralSectionOpen(!isGeneralSectionOpen)}
                  className="w-full px-4 py-3 bg-[#eef3ff] hover:bg-[#e4edff] flex items-center justify-between text-left transition-colors border-b border-[#ccc3d8]/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#630ed4]">inventory_2</span>
                    <span className="text-xs font-black uppercase text-[#0b1c30] tracking-wider">
                      Fila 1: Información General del Producto &amp; Categoría
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[#7b7487] transition-transform duration-200">
                    {isGeneralSectionOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isGeneralSectionOpen && (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre del Producto *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Gomitas de Osito 1kg"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0b1c30] uppercase">Subcategoría *</label>
                        <select
                          value={formData.subcategory_id}
                          onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                          className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                        >
                          {subcategories.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0b1c30] uppercase">SKU / Código Interno *</label>
                        <input
                          type="text"
                          required
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                          className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0b1c30] uppercase">Código de Barras</label>
                        <input
                          type="text"
                          placeholder="Opcional"
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                          className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0b1c30] uppercase">Unidad de Venta</label>
                        <select
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                        >
                          <option value="pza">Pieza (pza)</option>
                          <option value="kg">Kilogramo (kg)</option>
                          <option value="lt">Litro (lt)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0b1c30] uppercase">Stock Mínimo Alerta</label>
                        <input
                          type="number"
                          value={formData.min_stock}
                          onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                          className="w-full min-h-[42px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#ccc3d8]/30">
                      <ImageCapture
                        currentImageUrl={formData.image_url}
                        onImageSelected={(file) => setSelectedPhotoFile(file)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* FILA 2: CÁLCULO DE PRECIOS, MARGEN Y LOTES (DESPLEGABLE / COLLAPSIBLE) */}
              <div className="bg-[#f8f9ff] rounded-2xl border border-[#ccc3d8]/40 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsPricingSectionOpen(!isPricingSectionOpen)}
                  className="w-full px-4 py-3 bg-[#eef3ff] hover:bg-[#e4edff] flex items-center justify-between text-left transition-colors border-b border-[#ccc3d8]/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#15803d]">payments</span>
                    <span className="text-xs font-black uppercase text-[#0b1c30] tracking-wider">
                      Fila 2: Cálculo de Precios, Margen de Ganancia &amp; Lote
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[#7b7487] transition-transform duration-200">
                    {isPricingSectionOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isPricingSectionOpen && (
                  <div className="p-4 space-y-3">
                    <PriceMarginInput
                      purchasePrice={formData.purchase_price}
                      marginType={formData.margin_type}
                      marginValue={formData.margin_value}
                      onChange={handlePriceMarginChange}
                    />

                    {formData.is_bulk_enabled && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#854d0e]">scale</span>
                          <span>Precio Venta a Granel:</span>
                        </div>
                        <span className="font-mono font-black text-sm text-[#854d0e]">${formData.bulk_price} /{formData.bulk_unit || 'kg'}</span>
                      </div>
                    )}

                    {!editingProduct && (
                      <div className="p-3.5 bg-[#eff4ff] rounded-xl border border-[#ccc3d8]/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b1c30]">
                          <span className="material-symbols-outlined text-[18px] text-[#630ed4]">calendar_month</span>
                          <span>Inventario Inicial (Creación de Primer Lote FIFO)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#0b1c30] uppercase">Stock Inicial ({formData.unit})</label>
                            <input
                              type="number"
                              min="0"
                              value={formData.initial_stock}
                              onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                              className="w-full min-h-[38px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#0b1c30] uppercase">Fecha de Caducidad</label>
                            <input
                              type="date"
                              value={formData.expiration_date}
                              onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                              className="w-full min-h-[38px] px-2 bg-white border border-[#ccc3d8] rounded-xl text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  disabled={saving}
                  className="min-h-[44px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95"
                >
                  {saving ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          )}

          {modalTab === 'bulk' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#0b1c30]">Habilitar Venta a Granel</h4>
                    <p className="text-xs text-[#7b7487]">
                      Permite vender por peso o fracciones (kilo, medios, cuartos, gramos)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_bulk_enabled}
                    onChange={(e) => handleBulkToggle(e.target.checked)}
                    className="w-6 h-6 accent-[#630ed4] cursor-pointer"
                  />
                </div>
                {formData.is_bulk_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#ccc3d8]/40">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0b1c30] uppercase">Unidad de Granel</label>
                      <input
                        type="text"
                        value={formData.bulk_unit}
                        onChange={(e) => setFormData({ ...formData, bulk_unit: e.target.value })}
                        className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono"
                        placeholder="kg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0b1c30] uppercase">
                        Precio por {formData.bulk_unit || 'kg'} ($)
                      </label>
                      <input
                        type="number"
                        step="0.50"
                        value={formData.bulk_price}
                        onChange={(e) => setFormData({ ...formData, bulk_price: e.target.value })}
                        className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-sm font-mono font-black text-[#630ed4]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0b1c30] uppercase">Rendimiento por Bolsa ({formData.bulk_unit})</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.package_content}
                        onChange={(e) => setFormData({ ...formData, package_content: e.target.value })}
                        className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
              {editingProduct && formData.is_bulk_enabled && (
                <div className="p-4 bg-white rounded-2xl border-2 border-[#630ed4] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#0b1c30]">Stock Actual Abierto a Granel</h4>
                      <div className="text-2xl font-black text-[#630ed4] font-mono mt-0.5">
                        {parseFloat(formData.bulk_stock || 0).toFixed(3)} {formData.bulk_unit || 'kg'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-[#7b7487]">Bolsas cerradas en lotes:</span>
                      <div className="font-bold font-mono text-base text-[#0b1c30]">{editingProduct.total_stock || 0} bolsas</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#e5eeff] flex flex-wrap items-center gap-3">
                    <span className="text-xs text-[#7b7487] font-semibold">Abrir bolsas para granel:</span>
                    <input
                      type="number"
                      min="1"
                      value={openBagsCount}
                      onChange={(e) => setOpenBagsCount(e.target.value)}
                      className="w-20 min-h-[38px] px-2 text-center bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-bold font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleOpenBags}
                      className="min-h-[38px] px-4 bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl text-xs font-bold active:scale-95 shadow-sm"
                    >
                      Abrir y Transferir (FIFO)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {modalTab === 'fractions' && editingProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Generador de Paquetes por Piezas */}
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 flex flex-col justify-between gap-2.5">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-sky-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">package_2</span>
                      <span>Paquetes de Piezas (Bolsas, Celofán, Desechables)</span>
                    </h4>
                    <p className="text-xs text-sky-800 mt-1">
                      Genera paquetes de <strong>25, 50, 100, 500 piezas</strong> y <strong>Caja de 1,000 piezas</strong> con descuento por volumen aplicado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePieceFractions}
                    className="w-full min-h-[38px] px-3 bg-[#005479] hover:bg-[#0284c7] text-white rounded-xl text-xs font-bold active:scale-95 shadow-xs transition-all"
                  >
                    ⚡ Generar Paquetes de 25, 50, 100, 500 y 1,000 pz
                  </button>
                </div>

                {/* Generador de Kilo / Granel */}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col justify-between gap-2.5">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">scale</span>
                      <span>Fracciones Estándar de Kilo (Granel)</span>
                    </h4>
                    <p className="text-xs text-amber-800 mt-1">
                      Genera las 4 fracciones estándar de peso: <strong>3/4 kg, 1/2 kg, 1/4 kg</strong> y <strong>100 gramos</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateStandardFractions}
                    className="w-full min-h-[38px] px-3 bg-[#854d0e] hover:bg-[#713f12] text-white rounded-xl text-xs font-bold active:scale-95 shadow-xs transition-all"
                  >
                    ⚡ Generar Fracciones de Kilo (3/4, 1/2, 1/4 y 100g)
                  </button>
                </div>
              </div>

              {/* Formulario Manual de Fracción / Paquete */}
              <form onSubmit={handleAddFraction} className="p-4 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/40 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0b1c30] uppercase">Nombre Presentación *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Paquete 25 pzas / 50 gramos"
                    value={newFraction.name}
                    onChange={(e) => setNewFraction({ ...newFraction, name: e.target.value })}
                    className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0b1c30] uppercase">
                    {formData.unit === 'pza' ? 'Cantidad Piezas (Multiplicador)' : 'Peso / Multiplicador (kg)'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder={formData.unit === 'pza' ? '25' : '0.250'}
                    value={newFraction.multiplier}
                    onChange={(e) => handleFractionMultiplierChange(e.target.value)}
                    className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0b1c30] uppercase">Precio Venta ($) *</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    placeholder="0.00"
                    value={newFraction.price}
                    onChange={(e) => setNewFraction({ ...newFraction, price: e.target.value })}
                    className="w-full min-h-[40px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-black text-[#630ed4]"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[40px] bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl text-xs font-bold active:scale-95 shadow-xs transition-all"
                >
                  + Agregar Paquete
                </button>
              </form>

              {/* Lista de Fracciones / Presentaciones */}
              <div className="divide-y divide-[#e5eeff] border border-[#ccc3d8]/40 rounded-2xl bg-white overflow-hidden shadow-xs">
                {fractions.length === 0 ? (
                  <div className="p-6 text-center text-xs sm:text-sm text-[#7b7487]">
                    No hay presentaciones o paquetes registrados para este producto todavía.
                  </div>
                ) : (
                  fractions.map((f) => (
                    <div key={f.id} className="p-3.5 flex items-center justify-between text-xs sm:text-sm hover:bg-[#eff4ff]/40 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[20px] text-[#630ed4]">inventory_2</span>
                        <div>
                          <span className="font-bold text-[#0b1c30] text-sm">{f.name}</span>
                          <span className="text-xs text-[#7b7487] font-mono ml-2">
                            ({f.fraction_multiplier} {editingProduct.bulk_unit || editingProduct.unit || 'pza'})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-base text-[#630ed4]">${parseFloat(f.price).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFraction(f.id)}
                          className="w-8 h-8 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] rounded-xl flex items-center justify-center active:scale-90 shadow-2xs transition-all"
                          title="Eliminar presentación"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {modalTab === 'wholesale' && editingProduct && (
            <div className="space-y-4">
              <form onSubmit={handleAddWholesale} className="p-3 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/40 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#0b1c30] uppercase">Cantidad Mínima ({formData.unit})</label>
                  <input
                    type="number"
                    step="1"
                    min="2"
                    required
                    placeholder="Ej: 12"
                    value={newWholesale.min_qty}
                    onChange={(e) => setNewWholesale({ ...newWholesale, min_qty: e.target.value })}
                    className="w-full min-h-[38px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#0b1c30] uppercase">
                    Precio Mayoreo ($ c/u) <span className="text-xs text-[#ba1a1a] font-normal">(Costo: ${formData.purchase_price})</span>
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    placeholder={formData.purchase_price}
                    value={newWholesale.price}
                    onChange={(e) => setNewWholesale({ ...newWholesale, price: e.target.value })}
                    className="w-full min-h-[38px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-xs font-mono font-bold text-[#15803d]"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[38px] bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold active:scale-95 shadow-xs"
                >
                  + Agregar Escala
                </button>
              </form>
              <div className="border border-[#ccc3d8]/40 rounded-xl bg-white overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9ff] text-[11px] uppercase text-[#7b7487] font-semibold border-b border-[#e5eeff]">
                    <tr>
                      <th className="px-3.5 py-2.5">Cantidad Mínima</th>
                      <th className="px-3.5 py-2.5">Precio Mayoreo</th>
                      <th className="px-3.5 py-2.5">Ganancia por Pieza</th>
                      <th className="px-3.5 py-2.5">Margen %</th>
                      <th className="px-3.5 py-2.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff]">
                    {wholesaleTiers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-[#7b7487]">No hay escalas de mayoreo configuradas</td>
                      </tr>
                    ) : (
                      wholesaleTiers.map((t) => {
                        const cost = parseFloat(formData.purchase_price) || 0;
                        const price = parseFloat(t.wholesale_price) || 0;
                        const profit = price - cost;
                        const marginPercent = price > 0 ? ((profit / price) * 100).toFixed(1) : '0';
                        return (
                          <tr key={t.id} className="hover:bg-[#eff4ff]/40">
                            <td className="px-3.5 py-2.5 font-bold text-[#0b1c30]">A partir de {t.min_quantity} {formData.unit}</td>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-[#15803d]">${price.toFixed(2)} c/u</td>
                            <td className="px-3.5 py-2.5 font-mono font-semibold text-[#0b1c30]">+${profit.toFixed(2)}</td>
                            <td className="px-3.5 py-2.5"><span className="bg-[#dcfce7] text-[#15803d] font-bold px-2 py-0.5 rounded font-mono">{marginPercent}%</span></td>
                            <td className="px-3.5 py-2.5 text-right">
                              <button type="button" onClick={() => handleDeleteWholesale(t.id)} className="w-7 h-7 bg-[#ffdad6] text-[#ba1a1a] rounded-lg inline-flex items-center justify-center active:scale-90" title="Eliminar escala">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {modalTab === 'history' && editingProduct && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#0b1c30]">Historial de Bolsas Abiertas para Granel</h4>
                <button type="button" onClick={() => loadBulkHistory(editingProduct.id)} className="text-xs text-[#630ed4] font-bold hover:underline">Actualizar Historial</button>
              </div>
              <div className="border border-[#ccc3d8]/40 rounded-xl bg-white overflow-hidden">
                {loadingHistory ? (
                  <div className="p-6 text-center text-xs text-[#7b7487]">Cargando historial...</div>
                ) : bulkHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#7b7487]">No se han registrado aperturas de bolsas aún.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8f9ff] text-[11px] uppercase text-[#7b7487] font-semibold border-b border-[#e5eeff]">
                      <tr>
                        <th className="px-3 py-2.5">Fecha y Hora</th>
                        <th className="px-3 py-2.5">Usuario</th>
                        <th className="px-3 py-2.5">Bolsas Abiertas</th>
                        <th className="px-3 py-2.5">Contenido Agregado</th>
                        <th className="px-3 py-2.5">Lotes Afectados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5eeff]">
                      {bulkHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-[#eff4ff]/40">
                          <td className="px-3 py-2.5 font-mono text-[#7b7487]">{new Date(item.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2.5 font-semibold text-[#0b1c30]">{item.user_name}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[#630ed4]">{item.packages_opened} bolsa(s)</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-[#15803d]">+{parseFloat(item.content_added).toFixed(3)} {formData.bulk_unit || 'kg'}</td>
                          <td className="px-3 py-2.5 text-[11px] text-[#7b7487]">
                            {item.affected_batches?.map((b) => (
                              <span key={b.batch_id} className="inline-block bg-[#f8f9ff] border border-[#ccc3d8] rounded px-1.5 py-0.5 mr-1 mb-1 font-mono">{b.batch_number} (-{b.deducted_bags})</span>
                            )) || 'Lote FIFO'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de Carga Masiva (Excel / CSV / Tabla Web) */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => !importingBulk && setIsBulkModalOpen(false)}
        title="Carga Masiva de Productos (Excel, Google Sheets o Tabla Web)"
        maxWidth="max-w-6xl"
      >
        <div className="space-y-4">
          {/* Navigation Tabs between File Upload and In-Browser Web Grid */}
          <div className="flex border-b border-[#e5eeff] gap-2">
            <button
              type="button"
              onClick={() => setBulkModeTab('excel')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                bulkModeTab === 'excel'
                  ? 'border-[#630ed4] text-[#630ed4]'
                  : 'border-transparent text-[#7b7487] hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Subir Archivo Excel o CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkModeTab('web_grid');
                if (gridRows.length === 0) {
                  // If empty, preload with samples so tablet user immediately sees how it works
                  handleLoadGranelSamples();
                  handleLoadPiezasSamples();
                }
              }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                bulkModeTab === 'web_grid'
                  ? 'border-[#630ed4] text-[#630ed4]'
                  : 'border-transparent text-[#7b7487] hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              <span>Captura Directa en Tabla Web / Google Sheets ({gridRows.length})</span>
            </button>
          </div>

          {/* TAB 1: FILE UPLOAD (EXCEL / CSV / GOOGLE SHEETS) */}
          {bulkModeTab === 'excel' && (
            <div className="space-y-4">
              {/* Instructions and Download Template Buttons */}
              <div className="p-4 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-[#0b1c30]">1. Descarga la Plantilla Compatible con Tablets y PC</h4>
                    <p className="text-[11px] text-[#7b7487] mt-0.5">
                      Incluye ejemplos listos de <strong>A Granel (kg)</strong> y <strong>Por Piezas/Paquetes (25, 50, 100, 1000 pz)</strong>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={downloadProductBulkTemplateExcel}
                      className="min-h-[40px] px-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95 transition-all"
                      title="Descargar archivo Excel nativo (.xls)"
                    >
                      <span className="material-symbols-outlined text-[18px]">description</span>
                      <span>Descargar Excel (.xls)</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadProductBulkTemplateCSV}
                      className="min-h-[40px] px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95 transition-all"
                      title="Descargar archivo CSV estándar"
                    >
                      <span className="material-symbols-outlined text-[18px]">table_view</span>
                      <span>Descargar (.csv)</span>
                    </button>
                    <a
                      href="https://docs.google.com/spreadsheets/u/0/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] px-3 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95 transition-all"
                      title="Crear o abrir hoja en Google Sheets"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      <span>Google Sheets</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#4b5563] pt-2 border-t border-[#ccc3d8]/40">
                  <div className="flex items-start gap-1.5 bg-white/70 p-2 rounded-lg border border-[#e5eeff]">
                    <span className="material-symbols-outlined text-green-700 text-[16px] shrink-0 mt-0.5">check_circle</span>
                    <div>
                      <strong className="text-[#0b1c30]">A Granel (Dulcera / Repostería):</strong> Coloca <code>es_granel: SI</code> y <code>unidad: kg</code>. Se registrará para vender por fracciones de peso o paquetes.
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 bg-white/70 p-2 rounded-lg border border-[#e5eeff]">
                    <span className="material-symbols-outlined text-purple-700 text-[16px] shrink-0 mt-0.5">check_circle</span>
                    <div>
                      <strong className="text-[#0b1c30]">Por Piezas / Paquetes:</strong> Coloca <code>es_granel: NO</code> y <code>unidad: pza</code> (ej. bolsas de 1000 pz, vasos de 50 pz, o globos).
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0b1c30] uppercase">2. Selecciona o Arrastra tu Archivo Completado (.xls, .xlsx, .csv)</label>
                <div className="p-6 border-2 border-dashed border-[#ccc3d8] hover:border-[#630ed4] rounded-2xl text-center bg-[#f8f9ff] transition-colors relative">
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv,.tsv,.txt"
                    onChange={handleCSVUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="material-symbols-outlined text-[36px] text-[#630ed4] block mx-auto mb-1">
                    cloud_upload
                  </span>
                  <p className="text-xs font-bold text-[#0b1c30]">
                    {bulkFileName ? `Archivo cargado: ${bulkFileName}` : 'Toca o arrastra aquí tu archivo Excel (.xls, .xlsx) o CSV'}
                  </p>
                  <p className="text-[10px] text-[#7b7487] mt-0.5">Formatos compatibles: Microsoft Excel (.xls, .xlsx), CSV con UTF-8 y Google Sheets exportado</p>
                </div>
              </div>

              {/* Preview Table */}
              {bulkParsedProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-[#0b1c30]">
                      3. Vista Previa de Productos a Importar ({bulkParsedProducts.length})
                    </h4>
                    <span className="text-[11px] text-green-700 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>{bulkParsedProducts.length} productos validados listos</span>
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-[#ccc3d8]/40 rounded-xl bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8f9ff] text-[10px] uppercase text-[#7b7487] font-semibold border-b border-[#e5eeff] sticky top-0">
                        <tr>
                          <th className="p-2.5">SKU</th>
                          <th className="p-2.5">Producto</th>
                          <th className="p-2.5">Subcategoría</th>
                          <th className="p-2.5 text-center">Tipo / Unidad</th>
                          <th className="p-2.5 text-right">Costo</th>
                          <th className="p-2.5 text-right">Margen</th>
                          <th className="p-2.5 text-right">Precio Venta</th>
                          <th className="p-2.5 text-center">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5eeff]">
                        {bulkParsedProducts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-[#eff4ff]/30">
                            <td className="p-2.5 font-mono font-bold text-[#630ed4]">{p.sku}</td>
                            <td className="p-2.5 font-bold text-[#0b1c30] max-w-[200px] truncate">{p.name}</td>
                            <td className="p-2.5 text-[#7b7487]">{p.subcategory_name || '-'}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.is_bulk_enabled ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {p.is_bulk_enabled ? `Granel (${p.unit})` : `Pieza/Paq (${p.unit})`}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono">${p.purchase_price.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono text-green-700">+{p.margin_value}{p.margin_type === 'percentage' ? '%' : '$'}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-[#0b1c30]">${p.sale_price.toFixed(2)}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-[#0b1c30]">{p.initial_stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions for File Upload */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5eeff]">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteBulkImport()}
                  disabled={importingBulk || bulkParsedProducts.length === 0}
                  className="min-h-[44px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  <span>{importingBulk ? 'Importando Productos...' : `Importar ${bulkParsedProducts.length} Productos`}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IN-BROWSER WEB GRID / TABLE EDITOR */}
          {bulkModeTab === 'web_grid' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#f8f9ff] rounded-2xl border border-[#ccc3d8]/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddGridRow()}
                    className="min-h-[38px] px-3 bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>+ Agregar Fila</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadGranelSamples}
                    className="min-h-[38px] px-3 bg-white hover:bg-green-50 text-green-700 border border-green-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                    title="Cargar 3 productos de ejemplo para venta a granel (kg)"
                  >
                    <span className="material-symbols-outlined text-[18px]">cake</span>
                    <span>+ Ejemplos Granel (kg)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadPiezasSamples}
                    className="min-h-[38px] px-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                    title="Cargar 4 productos de ejemplo por piezas y paquetes"
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    <span>+ Ejemplos Piezas / Paq</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPasteAreaOpen(prev => !prev)}
                    className="min-h-[38px] px-3 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_paste</span>
                    <span>{isPasteAreaOpen ? 'Ocultar Pegar' : 'Pegar desde Sheets/Excel'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0b1c30]">
                    Total: <span className="font-mono text-[#630ed4]">{gridRows.length}</span> filas
                  </span>
                  {gridRows.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearGrid}
                      className="min-h-[36px] px-2.5 text-xs text-[#ba1a1a] hover:bg-red-50 rounded-lg font-bold flex items-center gap-1 transition-all"
                      title="Vaciar tabla"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Paste from Clipboard Modal / Box */}
              {isPasteAreaOpen && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">content_paste</span>
                      <span>Pegar datos copiados directamente de Google Sheets o Microsoft Excel</span>
                    </h4>
                    <span className="text-[11px] text-blue-700">Copia las celdas en tu hoja y pégalas aquí</span>
                  </div>
                  <textarea
                    rows={3}
                    value={pasteRawText}
                    onChange={(e) => setPasteRawText(e.target.value)}
                    placeholder="Pega aquí el contenido copiado de tu tabla (columnas separadas por tabulación o comas)..."
                    className="w-full text-xs font-mono p-2.5 bg-white border border-blue-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setPasteRawText(''); setIsPasteAreaOpen(false); }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteFromSpreadsheet}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_box</span>
                      <span>Agregar filas a la tabla</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Interactive Web Table */}
              <div className="max-h-[380px] overflow-x-auto overflow-y-auto border border-[#ccc3d8]/40 rounded-2xl bg-white shadow-2xs">
                {gridRows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#7b7487] space-y-2">
                    <span className="material-symbols-outlined text-[36px] text-[#ccc3d8] block mx-auto">grid_off</span>
                    <p className="font-bold text-[#0b1c30]">No hay filas en la tabla.</p>
                    <p>Haz clic en "+ Agregar Fila" o "+ Ejemplos Granel / Piezas" arriba para comenzar a capturar.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#f8f9ff] text-[10px] uppercase text-[#7b7487] font-semibold border-b border-[#e5eeff] sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 min-w-[70px] text-center">Acciones</th>
                        <th className="p-2.5 min-w-[120px]">SKU (*)</th>
                        <th className="p-2.5 min-w-[200px]">Nombre Producto (*)</th>
                        <th className="p-2.5 min-w-[130px]">Subcategoría</th>
                        <th className="p-2.5 min-w-[110px] text-center">¿Es Granel?</th>
                        <th className="p-2.5 min-w-[80px] text-center">Unidad</th>
                        <th className="p-2.5 min-w-[95px] text-right">Costo ($)</th>
                        <th className="p-2.5 min-w-[90px] text-right">Margen (%)</th>
                        <th className="p-2.5 min-w-[100px] text-right font-bold text-[#15803d]">P. Venta ($)</th>
                        <th className="p-2.5 min-w-[85px] text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5eeff]">
                      {gridRows.map((row) => {
                        const isValid = row.sku && row.name && parseFloat(row.purchase_price) > 0;
                        return (
                          <tr key={row.id} className={`hover:bg-[#eff4ff]/20 ${!isValid ? 'bg-amber-50/40' : ''}`}>
                            <td className="p-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateGridRow(row.id)}
                                  className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-center text-slate-700 active:scale-90"
                                  title="Duplicar fila"
                                >
                                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGridRow(row.id)}
                                  className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg inline-flex items-center justify-center active:scale-90"
                                  title="Eliminar fila"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </div>
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.sku}
                                onChange={(e) => handleGridRowChange(row.id, 'sku', e.target.value.toUpperCase())}
                                placeholder="DUL-001"
                                className="w-full text-xs font-mono font-bold p-1.5 border border-[#ccc3d8] rounded-lg focus:ring-2 focus:ring-[#630ed4] focus:outline-hidden uppercase"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleGridRowChange(row.id, 'name', e.target.value)}
                                placeholder="Nombre de producto o paquete"
                                className="w-full text-xs font-semibold p-1.5 border border-[#ccc3d8] rounded-lg focus:ring-2 focus:ring-[#630ed4] focus:outline-hidden"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                list="bulk-subcat-list"
                                value={row.subcategory_name}
                                onChange={(e) => handleGridRowChange(row.id, 'subcategory_name', e.target.value)}
                                placeholder="Gomitas / Bolsas"
                                className="w-full text-xs p-1.5 border border-[#ccc3d8] rounded-lg focus:ring-2 focus:ring-[#630ed4] focus:outline-hidden"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <select
                                value={row.is_bulk_enabled ? 'SI' : 'NO'}
                                onChange={(e) => handleGridRowChange(row.id, 'is_bulk_enabled', e.target.value === 'SI')}
                                className={`w-full text-xs font-bold p-1.5 border rounded-lg focus:ring-2 focus:outline-hidden ${
                                  row.is_bulk_enabled ? 'bg-green-50 text-green-800 border-green-300' : 'bg-white text-slate-700 border-[#ccc3d8]'
                                }`}
                              >
                                <option value="NO">NO (Pieza/Paq)</option>
                                <option value="SI">SÍ (Granel)</option>
                              </select>
                            </td>
                            <td className="p-1.5 text-center">
                              <select
                                value={row.unit || (row.is_bulk_enabled ? 'kg' : 'pza')}
                                onChange={(e) => handleGridRowChange(row.id, 'unit', e.target.value)}
                                className="w-full text-xs font-semibold p-1.5 border border-[#ccc3d8] rounded-lg focus:ring-2 focus:ring-[#630ed4] focus:outline-hidden"
                              >
                                <option value="pza">pza</option>
                                <option value="kg">kg</option>
                                <option value="paq">paq</option>
                                <option value="caja">caja</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.purchase_price}
                                onChange={(e) => handleGridRowChange(row.id, 'purchase_price', e.target.value)}
                                className="w-full text-xs text-right font-mono p-1.5 border border-[#ccc3d8] rounded-lg focus:ring-2 focus:ring-[#630ed4] focus:outline-hidden"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={row.margin_value}
                                onChange={(e) => handleGridRowChange(row.id, 'margin_value', e.target.value)}
                                className="w-full text-xs text-right font-mono text-green-700 font-bold p-1.5 border border-[#ccc3d8] rounded-lg focus:ring-2 focus:ring-[#630ed4] focus:outline-hidden"
                              />
                            </td>
                            <td className="p-1.5 text-right font-mono font-bold text-[#15803d]">
                              ${parseFloat(row.sale_price || 0).toFixed(2)}
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                min="0"
                                value={row.initial_stock}
                                onChange={(e) => handleGridRowChange(row.id, 'initial_stock', e.target.value)}
                                className="w-full text-xs text-center font-mono p-1.5 border border-[#ccc3d8] rounded-lg focus:ring-2 focus:ring-[#630ed4] focus:outline-hidden"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Datalist for Subcategories */}
              <datalist id="bulk-subcat-list">
                {subcategories.map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>

              {/* Modal Footer Actions for Web Grid */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#e5eeff]">
                <div className="text-xs text-[#7b7487]">
                  Filas válidas para importar: <strong className="text-[#0b1c30]">{gridRows.filter(r => r.sku && r.name && parseFloat(r.purchase_price) > 0).length}</strong> de {gridRows.length}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="min-h-[44px] px-4 rounded-xl border border-[#ccc3d8] text-[#0b1c30] text-xs font-bold hover:bg-[#eff4ff]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteBulkImport()}
                    disabled={importingBulk || gridRows.length === 0}
                    className="min-h-[44px] px-6 rounded-xl bg-[#630ed4] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">publish</span>
                    <span>{importingBulk ? 'Importando...' : `Guardar e Importar ${gridRows.length} Productos`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>


      {/* Modal Acciones en Móvil */}
      <Modal
        isOpen={Boolean(actionSheetProduct)}
        onClose={() => setActionSheetProduct(null)}
        title={actionSheetProduct ? `Acciones: ${actionSheetProduct.name}` : 'Acciones'}
        maxWidth="max-w-sm"
      >
        {actionSheetProduct && (
          <div className="space-y-3">
            <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#ccc3d8]/40 text-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-[#ccc3d8]/40 shadow-2xs">
                {actionSheetProduct.image_url ? (
                  <img
                    src={getProductImageUrl(actionSheetProduct.image_url)}
                    alt={actionSheetProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span className="material-symbols-outlined text-[#630ed4] text-[24px]">inventory_2</span>
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-[#0b1c30]">{actionSheetProduct.name}</div>
                <div className="text-[#7b7487] font-mono text-[11px]">SKU: {actionSheetProduct.sku}</div>
                <div className="font-mono font-bold text-[#630ed4] text-xs">${parseFloat(actionSheetProduct.sale_price || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const target = actionSheetProduct;
                  setActionSheetProduct(null);
                  handleOpenEdit(target);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] text-xs font-bold flex items-center gap-3 border border-[#630ed4]/20 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-8 rounded-lg bg-[#630ed4] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </span>
                <div>
                  <div>Editar Producto</div>
                  <div className="text-[10px] text-[#7b7487] font-normal">Precios, granel, mayoreo y datos</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = actionSheetProduct;
                  setActionSheetProduct(null);
                  navigate(`/productos/lotes?product_id=${target.id}`);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#005479] text-xs font-bold flex items-center gap-3 border border-blue-200 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-8 rounded-lg bg-[#005479] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </span>
                <div>
                  <div>Ver Lotes y Caducidades</div>
                  <div className="text-[10px] text-[#7b7487] font-normal">Historial y fechas de expiración</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = actionSheetProduct;
                  setActionSheetProduct(null);
                  setTargetProduct(target);
                  setIsConfirmOpen(true);
                }}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#ffdad6]/50 hover:bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold flex items-center gap-3 border border-[#ba1a1a]/20 shadow-2xs active:scale-95 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-8 rounded-lg bg-[#ba1a1a] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </span>
                <div>
                  <div>Deshabilitar / Eliminar</div>
                  <div className="text-[10px] text-[#ba1a1a] font-normal">Cambiar estado o borrar</div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-[#e5eeff]">
              <button
                type="button"
                onClick={() => setActionSheetProduct(null)}
                className="w-full min-h-[38px] px-4 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetProduct(null);
        }}
        title="Gestionar Estado o Eliminación"
        itemName={targetProduct?.name || 'este producto'}
        isActive={Boolean(targetProduct?.is_active)}
        onToggleActive={() => handleToggleActive(targetProduct)}
        onHardDelete={() => handleHardDelete(targetProduct)}
      />
    </div>
  );
}
