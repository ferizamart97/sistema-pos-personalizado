import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import BatchesPage from './pages/BatchesPage';
import CategoriesPage from './pages/CategoriesPage';
import UsersPage from './pages/UsersPage';
import SalesPage from './pages/SalesPage';
import ExpirationPage from './pages/ExpirationPage';
import PackagesPage from './pages/PackagesPage';
import ServicesPage from './pages/ServicesPage';
import CustomOrdersPage from './pages/CustomOrdersPage';
import LayawaysPage from './pages/LayawaysPage';
import InstallAppButton from './components/common/InstallAppButton';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getUserInitials = () => {
    if (!user?.name) return 'LP';
    const parts = user.name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/productos', label: 'Productos & Granel', icon: 'inventory_2' },
    { path: '/productos/lotes', label: 'Gestión de Lotes', icon: 'calendar_month' },
    { path: '/paquetes', label: 'Paquetes Piñateros', icon: 'celebration' },
    { path: '/servicios', label: 'Servicios en Tienda', icon: 'design_services' },
    { path: '/pedidos', label: 'Pedidos Especiales', icon: 'receipt_long' },
    { path: '/apartados', label: 'Sistema Apartados', icon: 'savings' },
    { path: '/categorias', label: 'Categorías', icon: 'category' },
    { path: '/caducidad', label: 'Semáforo Caducidad', icon: 'notifications_active' },
    { path: '/ventas', label: 'Ventas & Tickets', icon: 'point_of_sale' },
    { path: '/usuarios', label: 'Usuarios & Roles', icon: 'group' },
  ];

  const getPosUrl = () => {
    let baseUrl = import.meta.env.VITE_POS_URL;
    if (!baseUrl) {
      if (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1') {
        baseUrl = `http://${window.location.hostname}:3000`;
      } else {
        baseUrl = window.location.origin.replace('ppa001', 'cpa001');
      }
    }
    const token = localStorage.getItem('pos_admin_token') || '';
    const userJson = localStorage.getItem('pos_admin_user') || '';
    if (token) {
      return `${baseUrl}/#sso_token=${encodeURIComponent(token)}&sso_user=${encodeURIComponent(userJson)}`;
    }
    return baseUrl;
  };

  return (
    <div className="flex h-screen min-h-[100dvh] bg-[#f8f9ff] text-[#0b1c30] overflow-hidden select-none">
      {/* Mobile / Tablet Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Navigation with Collapsible Desktop State */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } w-64 bg-[#0b1c30] text-white flex flex-col justify-between transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className={`border-b border-white/10 ${sidebarCollapsed ? 'p-4' : 'p-6'} flex items-center justify-between`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#630ed4] flex items-center justify-center text-white shadow-lg shrink-0">
              <span className="material-symbols-outlined text-[24px]">storefront</span>
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden min-w-0">
                <h1 className="text-lg font-black tracking-tight leading-tight truncate">Panel Admin</h1>
                <span className="text-[12px] text-amber-300 uppercase font-black tracking-wider block truncate">
                  {import.meta.env.VITE_APP_NAME || 'Mi Tienda'}
                </span>
              </div>
            )}
          </div>
          {/* Mobile Close Button inside sidebar */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
            title="Cerrar menú"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Mobile POS shortcut button */}
        <div className="p-3 bg-white/5 border-b border-white/10 lg:hidden">
          <a
            href={getPosUrl()}
            target="_blank"
            rel="noreferrer"
            onClick={() => setSidebarOpen(false)}
            className="w-full min-h-[42px] px-3.5 bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
            <span>Abrir POS Vendedor</span>
          </a>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center ${
                  sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3.5'
                } py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#630ed4] text-white shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle & User Info */}
        <div className="border-t border-white/10 bg-black/20">
          {/* Mobile Install App Button inside sidebar */}
          <div className="p-3 border-b border-white/10 lg:hidden">
            <InstallAppButton className="w-full justify-center !text-xs py-2" />
          </div>

          {/* Desktop Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full hidden lg:flex items-center justify-center py-2 text-white/50 hover:text-white hover:bg-white/5 text-xs font-semibold border-b border-white/10 transition-colors"
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
            {!sidebarCollapsed && <span className="ml-1 text-[11px]">Colapsar menú</span>}
          </button>

          <div className={`p-4 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-[#630ed4] flex items-center justify-center font-bold text-xs shrink-0">
                {getUserInitials()}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-bold truncate">{user?.name || 'Administrador'}</p>
                  <p className="text-[10px] text-white/60 uppercase font-mono">{user?.role || 'Admin'}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#ffdad6] hover:bg-white/10 active:scale-95 transition-all"
                title="Cerrar sesión"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-14 sm:h-16 bg-white border-b border-[#ccc3d8]/40 px-3 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] flex items-center justify-center text-[#630ed4] lg:hidden active:scale-95 shrink-0"
              title="Abrir menú"
            >
              <span className="material-symbols-outlined text-[22px] sm:text-[24px]">menu</span>
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-10 h-10 rounded-xl bg-[#eff4ff] hidden lg:flex items-center justify-center text-[#0b1c30] hover:bg-[#dce9ff] active:scale-95 transition-all shrink-0"
              title={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {sidebarCollapsed ? 'menu_open' : 'menu'}
              </span>
            </button>

            {/* Logo Badge & Title */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#630ed4] flex items-center justify-center text-white shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[18px] sm:text-[22px]">storefront</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-black text-[#0b1c30] leading-tight truncate">
                  {import.meta.env.VITE_APP_NAME || 'Mi Tienda'}
                </h1>
                <span className="text-[10px] text-[#7b7487] font-semibold leading-tight block truncate">
                  Panel Admin
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-[#eff4ff] text-[#0b1c30] hidden md:flex items-center justify-center border border-[#ccc3d8]/40 shadow-2xs active:scale-95 transition-all shrink-0"
              title="Alternar Pantalla Completa"
            >
              <span className="material-symbols-outlined text-[20px]">
                {document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            {/* POS Shortcut Pill */}
            <a
              href={getPosUrl()}
              target="_blank"
              rel="noreferrer"
              className="min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#ccc3d8]/40 shadow-xs transition-all active:scale-95 shrink-0"
              title="Abrir Terminal POS Vendedor"
            >
              <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
              <span className="hidden sm:inline">POS Vendedor</span>
              <span className="sm:hidden font-mono font-bold">POS</span>
            </a>

            {/* User Avatar Dropdown */}
            <div className="relative pl-0.5">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#630ed4] hover:bg-[#7c3aed] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-[#630ed4]/20 active:scale-95 transition-all cursor-pointer shrink-0"
                title={`Usuario: ${user?.name || 'Administrador'}`}
              >
                {getUserInitials()}
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-[#ccc3d8]/60 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1 text-[#0b1c30]">
                    <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#ccc3d8]/30 mb-1">
                      <p className="text-xs font-bold truncate">{user?.name || 'Administrador'}</p>
                      <p className="text-[10px] text-[#7b7487] font-mono truncate">{user?.email || 'admin@mitienda.com'}</p>
                      <span className="inline-block mt-1 bg-[#eff4ff] text-[#630ed4] font-mono font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                        {user?.role || 'Admin'}
                      </span>
                    </div>

                    <a
                      href={getPosUrl()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full min-h-[36px] px-3 rounded-xl hover:bg-[#eff4ff] text-[#630ed4] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                      <span>Abrir POS Vendedor</span>
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

        {/* Page View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/productos/lotes" element={<BatchesPage />} />
              <Route path="/paquetes" element={<PackagesPage />} />
              <Route path="/servicios" element={<ServicesPage />} />
              <Route path="/pedidos" element={<CustomOrdersPage />} />
              <Route path="/apartados" element={<LayawaysPage />} />
              <Route path="/categorias" element={<CategoriesPage />} />
              <Route path="/usuarios" element={<UsersPage />} />
              <Route path="/ventas" element={<SalesPage />} />
              <Route path="/caducidad" element={<ExpirationPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
