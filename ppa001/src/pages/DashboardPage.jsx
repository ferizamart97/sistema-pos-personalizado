import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/dashboard/stats');
        setStats(res.data.data);
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar estadísticas del dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <span className="material-symbols-outlined text-[48px] text-[#630ed4] animate-spin">
          progress_activity
        </span>
        <p className="text-sm font-semibold mt-2 text-[#7b7487]">Cargando métricas...</p>
      </div>
    );
  }

  const semaphore = stats?.expiration_semaphore || { red: 0, orange: 0, yellow: 0, green: 0 };
  const ordersAlerts = stats?.alerts?.orders_due_soon || { count: 0, items: [] };
  const layawaysAlerts = stats?.alerts?.layaways_in_grace_or_overdue || { count: 0, items: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0b1c30] tracking-tight">Panel de Control General</h2>
          <p className="text-xs text-[#7b7487]">
            Resumen ejecutivo de ventas, alertas de pedidos, apartados y semáforo de caducidad
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/ventas')}
          className="min-h-[44px] px-4 bg-white border border-[#ccc3d8] hover:bg-[#e5eeff] text-[#0b1c30] rounded-xl text-xs font-bold active:scale-95 shadow-xs"
        >
          Ver Todas las Ventas →
        </button>
      </div>

      {/* SECTION: PROACTIVE OPERATIONAL ALERTS */}
      {(ordersAlerts.count > 0 || layawaysAlerts.count > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Urgent Orders (72h) */}
          {ordersAlerts.count > 0 && (
            <div className="p-4 bg-white rounded-2xl border-2 border-[#ea580c] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ea580c] text-[24px]">alarm</span>
                  <h4 className="font-bold text-xs text-[#0b1c30] uppercase">
                    Pedidos con Entrega Próxima ({ordersAlerts.count})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/pedidos')}
                  className="text-xs text-[#ea580c] hover:underline font-bold"
                >
                  Ver Pedidos →
                </button>
              </div>

              <div className="space-y-2">
                {ordersAlerts.items.map((ord) => (
                  <div key={ord.id} className="p-2.5 bg-[#ffeedd] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#ea580c]">{ord.order_number}</span>
                        <span className="font-semibold text-[#0b1c30]">{ord.customer_name}</span>
                      </div>
                      <p className="text-[11px] text-[#7b7487] line-clamp-1 mt-0.5">{ord.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="bg-[#ea580c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        En {ord.hours_remaining} hrs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layaways in Grace or Due */}
          {layawaysAlerts.count > 0 && (
            <div className="p-4 bg-white rounded-2xl border-2 border-[#ba1a1a] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-[24px]">hourglass_bottom</span>
                  <h4 className="font-bold text-xs text-[#0b1c30] uppercase">
                    Apartados Vencidos / Gracia ({layawaysAlerts.count})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/apartados')}
                  className="text-xs text-[#ba1a1a] hover:underline font-bold"
                >
                  Ver Apartados →
                </button>
              </div>

              <div className="space-y-2">
                {layawaysAlerts.items.map((lay) => (
                  <div key={lay.id} className="p-2.5 bg-[#ffdad6] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#ba1a1a]">{lay.folio}</span>
                        <span className="font-semibold text-[#0b1c30]">{lay.customer_name}</span>
                      </div>
                      <p className="text-[11px] text-[#7b7487] mt-0.5">Saldo pendiente: ${lay.remaining_balance}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="bg-[#ba1a1a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {lay.status === 'gracia_10_dias' ? 'En Gracia' : 'Vencido 30d'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Today */}
        <div className="p-5 bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-[#7b7487]">Ventas de Hoy</span>
            <div className="text-2xl font-black text-[#0b1c30] font-mono mt-1">
              ${stats?.sales_today?.total?.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] text-[#22c55e] font-semibold mt-0.5">
              {stats?.sales_today?.count || 0} tickets cobrados
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#630ed4]">
            <span className="material-symbols-outlined text-[28px]">payments</span>
          </div>
        </div>

        {/* Sales This Month */}
        <div className="p-5 bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-[#7b7487]">Ventas del Mes</span>
            <div className="text-2xl font-black text-[#630ed4] font-mono mt-1">
              ${stats?.sales_month?.total?.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] text-[#7b7487] font-semibold mt-0.5">
              {stats?.sales_month?.count || 0} tickets en total
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#630ed4]/10 flex items-center justify-center text-[#630ed4]">
            <span className="material-symbols-outlined text-[28px]">trending_up</span>
          </div>
        </div>

        {/* Active Products & Packages */}
        <div className="p-5 bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-[#7b7487]">Catálogo Activo</span>
            <div className="text-2xl font-black text-[#0b1c30] font-mono mt-1">
              {stats?.active_products || 0}
            </div>
            <div className="text-[11px] text-[#7b7487] font-semibold mt-0.5">
              {stats?.active_packages || 0} Paquetes • {stats?.active_services || 0} Servicios
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#005479]">
            <span className="material-symbols-outlined text-[28px]">inventory_2</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="p-5 bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-[#7b7487]">Stock Bajo / Reorden</span>
            <div className={`text-2xl font-black font-mono mt-1 ${
              (stats?.low_stock_count || 0) > 0 ? 'text-[#ba1a1a]' : 'text-[#22c55e]'
            }`}>
              {stats?.low_stock_count || 0}
            </div>
            <div className="text-[11px] text-[#7b7487] font-semibold mt-0.5">
              Productos bajo stock mínimo
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            (stats?.low_stock_count || 0) > 0 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#dcfce7] text-[#22c55e]'
          }`}>
            <span className="material-symbols-outlined text-[28px]">warning</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Expiration Semaphore & Top Selling Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiration Semaphore Overview */}
        <div className="p-6 bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[#0b1c30]">Semáforo de Caducidad de Lotes</h3>
            <button
              type="button"
              onClick={() => navigate('/caducidad')}
              className="text-xs text-[#630ed4] hover:underline font-bold"
            >
              Ver Detalle Completo →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-center">
              <span className="block text-2xl font-black font-mono text-[#ba1a1a]">{semaphore.red}</span>
              <span className="text-[10px] font-bold uppercase text-[#ba1a1a] mt-1 block">🔴 &lt; 30 Días</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#ffeedd] border border-[#ea580c]/30 text-center">
              <span className="block text-2xl font-black font-mono text-[#ea580c]">{semaphore.orange}</span>
              <span className="text-[10px] font-bold uppercase text-[#ea580c] mt-1 block">🟠 30 - 60 Días</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#fef9c3] border border-[#ca8a04]/30 text-center">
              <span className="block text-2xl font-black font-mono text-[#854d0e]">{semaphore.yellow}</span>
              <span className="text-[10px] font-bold uppercase text-[#854d0e] mt-1 block">🟡 60 - 90 Días</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#dcfce7] border border-[#16a34a]/30 text-center">
              <span className="block text-2xl font-black font-mono text-[#15803d]">{semaphore.green}</span>
              <span className="text-[10px] font-bold uppercase text-[#15803d] mt-1 block">🟢 90+ Días</span>
            </div>
          </div>
        </div>

        {/* Top Selling Items (Products, Packages & Services) */}
        <div className="p-6 bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[#0b1c30]">Más Vendidos (Rotación)</h3>
            <span className="text-xs text-[#7b7487] font-semibold">Histórico Acumulado</span>
          </div>

          <div className="divide-y divide-[#e5eeff]">
            {stats?.top_products?.length > 0 ? (
              stats.top_products.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#eff4ff] text-[#630ed4] font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[#0b1c30] truncate max-w-[220px]">
                      {item.product_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#0b1c30]">{parseFloat(item.total_sold).toFixed(2)} vendidos</span>
                    <span className="text-[10px] text-[#7b7487] ml-2 font-mono">(${parseFloat(item.total_revenue).toFixed(2)})</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#7b7487] py-4 text-center">Sin datos de rotación aún</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
