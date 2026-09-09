import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import SearchBar from '../components/common/SearchBar';
import CategoryFilter from '../components/products/CategoryFilter';
import SubcategoryFilter from '../components/products/SubcategoryFilter';
import ProductGrid from '../components/products/ProductGrid';
import Cart from '../components/cart/Cart';
import Modal from '../components/common/Modal';
import TouchButton from '../components/common/TouchButton';
import BulkFractionModal from '../components/products/BulkFractionModal';
import ServiceModal from '../components/products/ServiceModal';
import SpecialOrdersModal from '../components/orders/SpecialOrdersModal';
import LayawaysModal from '../components/orders/LayawaysModal';
import InstallAppButton from '../components/common/InstallAppButton';

export default function POSPage() {
  const { user, logout } = useAuth();
  const { 
    cartItems, 
    addToCart, 
    addBulkToCart, 
    addFractionToCart, 
    addPackageToCart, 
    addServiceToCart, 
    clearCart, 
    cartTotal, 
    cartCount, 
    updateQuantity, 
    removeFromCart 
  } = useCart();
  const navigate = useNavigate();

  // Mobile Cart State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Active Main Tab: 'dulceria', 'materias_primas', 'regalos', 'paquetes', 'servicios'
  const [activeTab, setActiveTab] = useState('dulceria');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);


  // Products Hook
  const { products, loading, refetch } = useProducts(
    ['paquetes', 'servicios'].includes(activeTab) ? '' : activeTab,
    selectedSubcategory,
    search
  );

  // Packages & Services State
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Modal States
  const [bulkProduct, setBulkProduct] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [isSpecialOrdersOpen, setIsSpecialOrdersOpen] = useState(false);
  const [isLayawaysOpen, setIsLayawaysOpen] = useState(false);

  // Keypad Modal State (Custom Quantity)
  const [keypadProduct, setKeypadProduct] = useState(null);
  const [keypadValue, setKeypadValue] = useState('1');

  // User Dropdown State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getUserInitials = () => {
    if (!user?.name) return 'LP';
    const parts = user.name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const getAdminUrl = () => {
    let baseUrl = import.meta.env.VITE_ADMIN_URL;
    if (!baseUrl) {
      if (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1') {
        baseUrl = `http://${window.location.hostname}:3001`;
      } else {
        baseUrl = window.location.origin.replace('cpa001', 'ppa001');
      }
    }
    return baseUrl;
  };

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [processingSale, setProcessingSale] = useState(false);

  // Load Packages and Services
  useEffect(() => {
    fetchPackagesAndServices();
  }, []);

  const fetchPackagesAndServices = async () => {
    try {
      setLoadingExtras(true);
      const [pkgRes, servRes] = await Promise.all([
        api.get('/packages'),
        api.get('/services')
      ]);
      setPackages(pkgRes.data.data || []);
      setServices(servRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExtras(false);
    }
  };

  // Handle Tab Change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedSubcategory('');
  };

  // Helper for responsive add to cart notification (top-right on mobile, bottom-left on desktop)
  const showAddToast = (message) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    toast.success(message, {
      duration: 1500,
      position: isMobile ? 'top-right' : 'bottom-left'
    });
  };

  // Handle Product Selection
  const handleSelectProduct = (product) => {
    if (product.is_bulk_enabled || (product.fractions && product.fractions.length > 0)) {
      setBulkProduct(product);
    } else {
      addToCart(product, 1);
      showAddToast(`+1 ${product.name}`);
    }
  };

  // Handle Keypad Press for Qty
  const handleOpenKeypad = (product) => {
    setKeypadProduct(product);
    setKeypadValue('1');
  };

  const handleKeypadPress = (val) => {
    if (val === 'C') {
      setKeypadValue('0');
    } else if (val === 'backspace') {
      setKeypadValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (val === '.') {
      if (!keypadValue.includes('.')) setKeypadValue((prev) => prev + '.');
    } else {
      setKeypadValue((prev) => (prev === '0' ? String(val) : prev + val));
    }
  };

  const handleKeypadSubmit = () => {
    const qty = parseFloat(keypadValue) || 1;
    if (qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    addToCart(keypadProduct, qty);
    showAddToast(`${qty}x ${keypadProduct.name} agregados`);
    setKeypadProduct(null);
  };


  // Checkout Initiation
  const handleCheckoutInit = (data) => {
    setCheckoutData(data);
    setAmountReceived('');
    setIsCheckoutOpen(true);
  };

  const handleCheckoutNumpad = (val) => {
    if (val === 'C') {
      setAmountReceived('');
    } else if (val === 'backspace') {
      setAmountReceived((prev) => (prev.length > 1 ? prev.slice(0, -1) : ''));
    } else if (val === '.') {
      if (!amountReceived.includes('.')) {
        setAmountReceived((prev) => (prev ? prev + '.' : '0.'));
      }
    } else if (val === 'exact') {
      setAmountReceived(totalToPay.toFixed(2));
    } else if (typeof val === 'number') {
      setAmountReceived(String(val));
    } else {
      setAmountReceived((prev) => {
        if (prev === '0') return String(val);
        return prev + String(val);
      });
    }
  };

  const receivedNum = parseFloat(amountReceived) || 0;
  const totalToPay = checkoutData?.total || 0;
  const changeAmount = Math.max(0, receivedNum - totalToPay);

  // Complete Sale
  const handleCompleteSale = async () => {
    if (paymentMethod === 'efectivo' && receivedNum < totalToPay) {
      toast.error('El monto recibido es menor al total de la venta');
      return;
    }

    try {
      setProcessingSale(true);
      const itemsPayload = cartItems.map((item) => ({
        item_type: item.item_type || 'producto',
        product_id: item.product_id || null,
        package_id: item.package_id || null,
        service_id: item.service_id || null,
        fraction_id: item.fraction_id || null,
        unit_price: item.unit_price || item.sale_price,
        quantity: item.quantity,
      }));

      const res = await api.post('/sales', {
        items: itemsPayload,
        payment_method: paymentMethod,
        discount,
      });

      const { sale_id } = res.data.data;
      toast.success('¡Venta realizada con éxito!');
      clearCart();
      setIsCheckoutOpen(false);
      navigate(`/ticket/${sale_id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al procesar la venta');
    } finally {
      setProcessingSale(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#f8f9ff] text-[#0b1c30] select-none">
      {/* MAIN AREA: CATALOG & WORKSPACE (Full width on mobile, 8 columns on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top App Header */}
        <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white border-b border-[#ccc3d8]/40 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#630ed4] flex items-center justify-center text-white shadow-md shrink-0">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">storefront</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-[#0b1c30] leading-none truncate">{import.meta.env.VITE_APP_NAME || 'POS'} Terminal</h1>
              <span className="hidden sm:inline text-[11px] text-[#7b7487] font-semibold">Terminal de Ventas</span>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden md:inline-flex">
              <InstallAppButton />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-[#eff4ff] text-[#0b1c30] items-center justify-center border border-[#ccc3d8]/40 active:scale-95 shadow-xs"
              title="Alternar Pantalla Completa"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">fullscreen</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSpecialOrdersOpen(true)}
              className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#ccc3d8]/40 active:scale-95 shadow-xs"
              title="Pedidos Especiales"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span className="hidden md:inline">Pedidos Especiales</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLayawaysOpen(true)}
              className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3 bg-[#ffeedd] hover:bg-[#fed7aa] text-[#ea580c] rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#ea580c]/30 active:scale-95 shadow-xs"
              title="Apartados y Abonos"
            >
              <span className="material-symbols-outlined text-[18px]">savings</span>
              <span className="hidden md:inline">Apartados &amp; Abonos</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/caducidad')}
              className="hidden lg:flex min-h-[40px] px-3 bg-white hover:bg-[#eff4ff] text-[#ba1a1a] rounded-xl text-xs font-bold items-center gap-1.5 border border-[#ccc3d8]/40 active:scale-95 shadow-xs"
              title="Semáforo de Caducidad"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
              <span>Caducidad</span>
            </button>

            <div className="h-5 sm:h-6 w-px bg-[#ccc3d8] mx-0.5 sm:mx-1"></div>

            {/* User Avatar Circle with Dropdown Menu */}
            <div className="relative pl-0.5">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#630ed4] hover:bg-[#7c3aed] text-white flex items-center justify-center font-bold text-[11px] sm:text-xs shadow-md border-2 border-white ring-2 ring-[#630ed4]/20 active:scale-95 transition-all cursor-pointer"
                title={`Usuario: ${user?.name || 'Vendedor'}`}
              >
                {getUserInitials()}
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-[#ccc3d8]/60 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                    <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#ccc3d8]/30 mb-1">
                      <p className="text-xs font-bold text-[#0b1c30] truncate">{user?.name || 'Administrador'}</p>
                      <p className="text-[10px] text-[#7b7487] font-mono truncate">{user?.email || 'vendedor@mitienda.com'}</p>
                      <span className="inline-block mt-1 bg-[#eff4ff] text-[#630ed4] font-mono font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                        {user?.role || 'Caja'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate('/caducidad');
                      }}
                      className="lg:hidden w-full min-h-[36px] px-3 rounded-xl hover:bg-[#eff4ff] text-[#ba1a1a] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
                      <span>Semáforo Caducidad</span>
                    </button>

                    <a
                      href={getAdminUrl()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full min-h-[36px] px-3 rounded-xl hover:bg-[#eff4ff] text-[#630ed4] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      <span>Panel Administrador</span>
                    </a>

                    <div className="md:hidden pb-1">
                      <InstallAppButton className="w-full justify-center !text-xs py-2" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full min-h-[38px] px-3 rounded-xl bg-[#ffdad6]/60 hover:bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Category & Search Unified Bar */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-white border-b border-[#e5eeff] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 py-0.5 shrink-0 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleTabChange('dulceria')}
              className={`min-h-[44px] min-w-[48px] sm:min-h-[50px] sm:min-w-[56px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                activeTab === 'dulceria'
                  ? 'bg-[#630ed4] text-white shadow-md ring-2 ring-[#630ed4]/30'
                  : 'bg-[#eff4ff] text-[#630ed4] hover:bg-[#dce9ff]'
              }`}
              title="Dulcería"
              aria-label="Dulcería"
            >
              <span className="material-symbols-outlined text-[24px] sm:text-[28px]">cake</span>
              <span className="hidden xl:inline text-sm font-black">Dulcería</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('materias_primas')}
              className={`min-h-[44px] min-w-[48px] sm:min-h-[50px] sm:min-w-[56px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                activeTab === 'materias_primas'
                  ? 'bg-[#005479] text-white shadow-md ring-2 ring-[#005479]/30'
                  : 'bg-[#eff4ff] text-[#005479] hover:bg-[#dce9ff]'
              }`}
              title="Materias Primas"
              aria-label="Materias Primas"
            >
              <span className="material-symbols-outlined text-[24px] sm:text-[28px]">inventory_2</span>
              <span className="hidden xl:inline text-sm font-black">Materias Primas</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('regalos')}
              className={`min-h-[44px] min-w-[48px] sm:min-h-[50px] sm:min-w-[56px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                activeTab === 'regalos'
                  ? 'bg-[#a43073] text-white shadow-md ring-2 ring-[#a43073]/30'
                  : 'bg-[#eff4ff] text-[#a43073] hover:bg-[#dce9ff]'
              }`}
              title="Regalos y Fiestas"
              aria-label="Regalos y Fiestas"
            >
              <span className="material-symbols-outlined text-[24px] sm:text-[28px]">card_giftcard</span>
              <span className="hidden xl:inline text-sm font-black">Regalos</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('paquetes')}
              className={`min-h-[44px] min-w-[48px] sm:min-h-[50px] sm:min-w-[56px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                activeTab === 'paquetes'
                  ? 'bg-[#ea580c] text-white shadow-md ring-2 ring-[#ea580c]/30'
                  : 'bg-[#ffeedd] text-[#ea580c] hover:bg-[#fed7aa]'
              }`}
              title="Paquetes Piñateros"
              aria-label="Paquetes Piñateros"
            >
              <span className="material-symbols-outlined text-[24px] sm:text-[28px]">celebration</span>
              <span className="hidden xl:inline text-sm font-black">Paquetes</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('servicios')}
              className={`min-h-[44px] min-w-[48px] sm:min-h-[50px] sm:min-w-[56px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                activeTab === 'servicios'
                  ? 'bg-[#0284c7] text-white shadow-md ring-2 ring-[#0284c7]/30'
                  : 'bg-[#eff4ff] text-[#0284c7] hover:bg-[#dce9ff]'
              }`}
              title="Servicios"
              aria-label="Servicios"
            >
              <span className="material-symbols-outlined text-[24px] sm:text-[28px]">design_services</span>
              <span className="hidden xl:inline text-sm font-black">Servicios</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs md:max-w-sm">
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, código..." />
          </div>
        </div>

        {/* Subcategories Bar (Only for Products) */}
        {!['paquetes', 'servicios'].includes(activeTab) && (
          <div className="px-3 sm:px-6 py-2 bg-[#f8f9ff] border-b border-[#e5eeff] shrink-0 overflow-x-auto no-scrollbar">
            <SubcategoryFilter
              categoryType={activeTab}
              selectedSubcategory={selectedSubcategory}
              onSelectSubcategory={setSelectedSubcategory}
            />
          </div>
        )}

        {/* Main Content Area: Products Grid with padding bottom for mobile sticky cart */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 pb-28 lg:pb-6">
          {/* TAB: PAQUETES PIÑATEROS */}
          {activeTab === 'paquetes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => {
                    addPackageToCart(pkg, 1);
                    showAddToast(`+1 ${pkg.name}`);
                  }}
                  className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#ccc3d8]/40 hover:border-[#ea580c] shadow-xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                      <span className="bg-[#ffeedd] text-[#ea580c] text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center shrink-0">
                        {pkg.capacity_people} {pkg.capacity_people === 1 ? 'Persona' : 'Personas'}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#7b7487] whitespace-nowrap">
                        Stock: {pkg.virtual_stock}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-[#0b1c30] text-sm sm:text-base leading-tight mt-1">{pkg.name}</h4>
                    <p className="text-xs text-[#7b7487] mt-1 line-clamp-2">{pkg.description}</p>
                  </div>
                  <div className="mt-3 sm:mt-4 flex items-center justify-between border-t border-[#e5eeff] pt-2.5">
                    <span className="text-xl sm:text-2xl font-black text-[#ea580c] font-mono">${parseFloat(pkg.price).toFixed(2)}</span>
                    <button type="button" className="w-8 h-8 sm:w-10 sm:h-10 bg-[#ea580c] text-white rounded-xl flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[18px] sm:text-[22px]">add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: SERVICIOS */}
          {activeTab === 'servicios' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1">
              {services.map((serv) => (
                <div
                  key={serv.id}
                  onClick={() => setSelectedService(serv)}
                  className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#ccc3d8]/40 hover:border-[#0284c7] shadow-xs cursor-pointer active:scale-95 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                      <span className="bg-[#eff4ff] text-[#0284c7] text-xs font-bold px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap">
                        {serv.category.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-semibold text-[#7b7487] whitespace-nowrap">
                        {serv.price_type === 'variable' ? 'Variable' : 'Fijo'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-[#0b1c30] text-sm sm:text-base leading-tight mt-1">{serv.name}</h4>
                    <p className="text-xs text-[#7b7487] mt-1 line-clamp-2">{serv.description}</p>
                  </div>
                  <div className="mt-3 sm:mt-4 flex items-center justify-between border-t border-[#e5eeff] pt-2.5">
                    <div>
                      <span className="text-[10px] text-[#7b7487] uppercase font-bold block">Precio Base</span>
                      <span className="text-xl sm:text-2xl font-black text-[#0284c7] font-mono">${parseFloat(serv.base_price).toFixed(2)}</span>
                    </div>
                    <button type="button" className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0284c7] text-white rounded-xl flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[18px] sm:text-[22px]">edit_square</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: PRODUCT CATALOG (2 Cards Grid on Mobile) */}
          {!['paquetes', 'servicios'].includes(activeTab) && (
            <ProductGrid
              products={products}
              loading={loading}
              onSelectProduct={handleSelectProduct}
            />
          )}
        </div>
      </div>

      {/* RIGHT AREA: CART SIDEBAR (Desktop & Horizontal Tablet only) */}
      <div className="hidden lg:flex w-80 lg:w-96 h-full flex-col shrink-0">
        <Cart
          onCheckout={handleCheckoutInit}
          discount={discount}
          onApplyDiscount={setDiscount}
        />
      </div>

      {/* MOBILE STICKY BOTTOM CART BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#ccc3d8]/60 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] px-3.5 py-2.5 flex items-center justify-between gap-3">
        {/* Left Side: Clickable area to toggle Mobile Cart Drawer */}
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(!isMobileCartOpen)}
          className="flex items-center gap-2.5 flex-1 min-w-0 bg-[#f8f9ff] hover:bg-[#eff4ff] p-2 rounded-2xl border border-[#ccc3d8]/40 active:scale-95 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#630ed4] text-white flex items-center justify-center shrink-0 shadow-xs relative">
            <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#ea580c] text-white font-mono font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-[#7b7487]">Total Venta</span>
              <span className="material-symbols-outlined text-[16px] text-[#630ed4]">
                {isMobileCartOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-[#630ed4] font-mono leading-none truncate">
              ${Math.max(0, cartTotal - discount).toFixed(2)}
            </div>
          </div>
        </button>

        {/* Right Side: Direct Checkout Button */}
        <button
          type="button"
          onClick={() => handleCheckoutInit({ subtotal: cartTotal, tax: 0, discount, total: Math.max(0, cartTotal - discount) })}
          disabled={cartCount === 0}
          className="min-h-[48px] px-5 bg-[#15803d] hover:bg-[#166534] disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm rounded-2xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">payments</span>
          <span>Cobrar</span>
        </button>
      </div>

      {/* MOBILE EXPANDABLE CART DRAWER / BOTTOM SHEET */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* Semi-transparent Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileCartOpen(false)}
          />

          {/* Drawer Sheet Container */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl border-t border-[#ccc3d8]/60 max-h-[85vh] h-[80vh] flex flex-col z-50 animate-in slide-in-from-bottom duration-200 overflow-hidden">
            <Cart
              onCheckout={(data) => {
                setIsMobileCartOpen(false);
                handleCheckoutInit(data);
              }}
              discount={discount}
              onApplyDiscount={setDiscount}
              onClose={() => setIsMobileCartOpen(false)}
            />
          </div>
        </div>
      )}



      {/* MODAL: GRANEL Y FRACCIONES */}
      <BulkFractionModal
        isOpen={!!bulkProduct}
        onClose={() => setBulkProduct(null)}
        product={bulkProduct}
        onAddBulk={addBulkToCart}
        onAddFraction={addFractionToCart}
        onAddNormal={addToCart}
      />

      {/* MODAL: COBRO DE SERVICIOS */}
      <ServiceModal
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        service={selectedService}
        onAddService={addServiceToCart}
      />

      {/* MODAL: PEDIDOS ESPECIALES */}
      <SpecialOrdersModal
        isOpen={isSpecialOrdersOpen}
        onClose={() => setIsSpecialOrdersOpen(false)}
      />

      {/* MODAL: APARTADOS Y ABONOS */}
      <LayawaysModal
        isOpen={isLayawaysOpen}
        onClose={() => setIsLayawaysOpen(false)}
        cartItems={cartItems}
        cartTotal={cartTotal}
        onClearCart={clearCart}
      />

      {/* MODAL: CHECKOUT DE COBRO (Con Teclado Táctil y Sin Distorsión de Pantalla) */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => !processingSale && setIsCheckoutOpen(false)}
        title="Finalizar Venta y Cobro"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Total Box */}
          <div className="p-3.5 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/40 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-[#7b7487]">Total a Cobrar</span>
            <span className="text-3xl sm:text-4xl font-black text-[#630ed4] font-mono">${totalToPay.toFixed(2)}</span>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'efectivo', label: 'Efectivo', icon: 'payments' },
              { id: 'tarjeta', label: 'Tarjeta', icon: 'credit_card' },
              { id: 'transferencia', label: 'Transfer.', icon: 'account_balance' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`min-h-[52px] p-2 rounded-xl flex flex-col items-center justify-center font-bold text-xs sm:text-sm border transition-all active:scale-95 ${
                  paymentMethod === m.id
                    ? 'bg-[#630ed4] text-white border-[#630ed4] shadow-md'
                    : 'bg-white text-[#0b1c30] border-[#ccc3d8]/50 hover:bg-[#eff4ff]'
                }`}
              >
                <span className="material-symbols-outlined text-[24px] mb-0.5">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Cash Payment Keypad (Prevents OS virtual keyboard distortion on tablets) */}
          {paymentMethod === 'efectivo' && (
            <div className="space-y-3 p-3.5 bg-[#f8f9ff] rounded-2xl border border-[#ccc3d8]/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#0b1c30] uppercase">Monto Recibido</label>
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-xs text-[#7b7487]">Entregado:</span>
                  <span className="text-lg sm:text-xl font-black text-[#630ed4]">${receivedNum.toFixed(2)}</span>
                </div>
              </div>

              {/* Readonly Display Input (No OS keyboard popup) */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  inputMode="none"
                  value={amountReceived ? `$${amountReceived}` : '$0.00'}
                  placeholder="$0.00"
                  className="w-full min-h-[52px] px-4 bg-white border-2 border-[#630ed4] rounded-xl text-3xl font-black font-mono text-[#0b1c30] text-center focus:outline-none cursor-default select-none shadow-xs"
                />
                {amountReceived && (
                  <button
                    type="button"
                    onClick={() => handleCheckoutNumpad('C')}
                    className="absolute right-3 px-2.5 py-1 bg-[#ffdad6] text-[#ba1a1a] rounded-lg text-xs font-bold active:scale-90"
                    title="Borrar monto"
                  >
                    Borrar
                  </button>
                )}
              </div>

              {/* Denomination Quick Buttons */}
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCheckoutNumpad('exact')}
                  className="min-h-[42px] bg-[#630ed4]/10 hover:bg-[#630ed4]/20 text-[#630ed4] font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-95 border border-[#630ed4]/30"
                >
                  Exacto
                </button>
                {[50, 100, 200, 500].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => handleCheckoutNumpad(bill)}
                    className="min-h-[42px] bg-white hover:bg-[#eff4ff] text-[#0b1c30] font-mono font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-95 border border-[#ccc3d8]/60 shadow-2xs"
                  >
                    ${bill}
                  </button>
                ))}
              </div>

              {/* On-Screen Touch Numpad with Decimal Point */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCheckoutNumpad(key)}
                    className={`min-h-[50px] rounded-xl font-mono font-black text-xl flex items-center justify-center transition-all active:scale-95 shadow-2xs border ${
                      key === 'backspace'
                        ? 'bg-[#eff4ff] text-[#630ed4] border-[#ccc3d8]/40'
                        : key === '.'
                        ? 'bg-[#eff4ff] text-[#0b1c30] font-black text-2xl border-[#ccc3d8]/50'
                        : 'bg-white text-[#0b1c30] border-[#ccc3d8]/50 hover:bg-[#f8f9ff]'
                    }`}
                  >
                    {key === 'backspace' ? (
                      <span className="material-symbols-outlined text-[24px]">backspace</span>
                    ) : (
                      key
                    )}
                  </button>
                ))}
              </div>

              {/* Change / Devolución Display */}
              <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-[#22c55e]/40 shadow-xs">
                <span className="text-xs sm:text-sm text-[#7b7487] font-bold uppercase">Cambio / Devolución:</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#15803d]">
                  ${changeAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <TouchButton
            onClick={handleCompleteSale}
            disabled={processingSale}
            variant="primary"
            size="lg"
            fullWidth
            icon="receipt_long"
            className="!py-4 !text-xl font-black"
          >
            {processingSale ? 'Procesando...' : 'Completar Venta y Emitir Ticket'}
          </TouchButton>
        </div>
      </Modal>
    </div>
  );
}
