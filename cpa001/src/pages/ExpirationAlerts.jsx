import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import ExpirationBadge from '../components/common/ExpirationBadge';
import TouchButton from '../components/common/TouchButton';

export default function ExpirationAlerts() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState(''); // '', 'red', 'orange', 'yellow', 'green'
  const [expirations, setExpirations] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpirations = async () => {
    try {
      setLoading(true);
      const [expRes, sumRes] = await Promise.all([
        api.get('/expirations', { params: { semaphore: selectedFilter, per_page: 50 } }),
        api.get('/expirations/summary')
      ]);
      setExpirations(expRes.data.data || []);
      setSummary(sumRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar alertas de caducidad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpirations();
  }, [selectedFilter]);

  const filterCards = [
    {
      id: '',
      label: 'Todos',
      count: summary.reduce((acc, curr) => acc + parseInt(curr.count || 0, 10), 0),
      color: 'bg-white text-[#0b1c30] border-[#ccc3d8]'
    },
    {
      id: 'red',
      label: 'Rojo: Remates (≤30d)',
      count: summary.find((s) => s.semaphore === 'red')?.count || 0,
      color: 'bg-[#ef4444] text-white border-[#dc2626]'
    },
    {
      id: 'orange',
      label: 'Naranja: Promociones (30-59d)',
      count: summary.find((s) => s.semaphore === 'orange')?.count || 0,
      color: 'bg-[#f97316] text-white border-[#ea580c]'
    },
    {
      id: 'yellow',
      label: 'Amarillo: Vigilar (60-89d)',
      count: summary.find((s) => s.semaphore === 'yellow')?.count || 0,
      color: 'bg-[#eab308] text-[#0b1c30] border-[#ca8a04]'
    },
    {
      id: 'green',
      label: 'Verde: Normal (90+d)',
      count: summary.find((s) => s.semaphore === 'green')?.count || 0,
      color: 'bg-[#22c55e] text-white border-[#16a34a]'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col p-4 sm:p-6 select-none">
      {/* Top Bar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between pb-4 border-b border-[#ccc3d8]/40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#ccc3d8]/60 text-[#0b1c30] hover:bg-[#e5eeff] active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#0b1c30] tracking-tight">
              Control y Semáforo de Caducidad
            </h1>
            <p className="text-xs text-[#7b7487]">
              Lotes organizados por proximidad a caducar para priorizar rotación (FIFO)
            </p>
          </div>
        </div>

        <TouchButton
          onClick={() => navigate('/')}
          variant="primary"
          size="md"
          icon="point_of_sale"
        >
          Volver a Caja
        </TouchButton>
      </header>

      {/* Summary Filter Cards */}
      <div className="max-w-6xl mx-auto w-full py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {filterCards.map((card) => {
            const isSelected = selectedFilter === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedFilter(card.id)}
                className={`p-4 rounded-2xl border flex flex-col justify-between text-left transition-all active:scale-95 shadow-xs ${
                  card.color
                } ${isSelected ? 'ring-4 ring-[#630ed4]/30 scale-[1.02]' : 'opacity-85 hover:opacity-100'}`}
              >
                <span className="text-xs font-bold uppercase tracking-wider">{card.label}</span>
                <div className="text-3xl font-black font-mono mt-2">{card.count}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expirations Table / List */}
      <main className="max-w-6xl mx-auto w-full flex-1 bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[#e5eeff] bg-[#f8f9ff] flex justify-between items-center">
          <h3 className="font-bold text-base text-[#0b1c30]">
            Listado de Lotes Próximos a Vencer
          </h3>
          <span className="text-xs font-mono text-[#7b7487]">
            Total mostrados: {expirations.length}
          </span>
        </div>

        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-[#630ed4] animate-spin">
                progress_activity
              </span>
              <p className="text-sm font-semibold mt-2 text-[#7b7487]">Cargando lotes...</p>
            </div>
          ) : expirations.length === 0 ? (
            <div className="p-12 text-center text-[#7b7487]">
              <span className="material-symbols-outlined text-[48px] text-[#ccc3d8] mb-2">
                task_alt
              </span>
              <p className="font-semibold text-base text-[#0b1c30]">No hay lotes en esta categoría</p>
              <p className="text-xs text-[#7b7487] mt-1">Todos los productos tienen fechas vigentes</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8f9ff] text-xs uppercase text-[#7b7487] font-semibold border-b border-[#e5eeff]">
                <tr>
                  <th className="px-6 py-3.5">Semáforo</th>
                  <th className="px-6 py-3.5">Producto</th>
                  <th className="px-6 py-3.5">SKU / Lote</th>
                  <th className="px-6 py-3.5">Fecha Caducidad</th>
                  <th className="px-6 py-3.5">Días Restantes</th>
                  <th className="px-6 py-3.5 text-right">Stock Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eeff]">
                {expirations.map((item) => (
                  <tr key={item.batch_id} className="hover:bg-[#eff4ff]/60 transition-colors">
                    <td className="px-6 py-4">
                      <ExpirationBadge
                        daysRemaining={item.days_remaining}
                        semaphore={item.semaphore}
                        label={item.semaphore_label}
                        showDays={false}
                      />
                    </td>
                    <td className="px-6 py-4 font-bold text-[#0b1c30]">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-[#7b7487]">
                      <div>{item.sku}</div>
                      <div className="text-[11px] text-[#4a4455] font-semibold">{item.batch_number}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#0b1c30]">
                      {item.expiration_date}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      <span
                        className={
                          item.days_remaining <= 30
                            ? 'text-[#ef4444]'
                            : item.days_remaining <= 59
                            ? 'text-[#f97316]'
                            : item.days_remaining <= 89
                            ? 'text-[#eab308]'
                            : 'text-[#22c55e]'
                        }
                      >
                        {item.days_remaining} días
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-base text-[#0b1c30]">
                      {item.stock_remaining} pzas
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
