import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import ExpirationSemaphore from '../components/common/ExpirationSemaphore';

export default function ExpirationPage() {
  const [expirations, setExpirations] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const fetchExpirationsData = async (page = 1, limit = pageSize) => {
    try {
      setLoading(true);
      const params = { page, per_page: limit };
      if (selectedFilter) params.semaphore = selectedFilter;

      const [expRes, sumRes] = await Promise.all([
        api.get('/expirations', { params }),
        api.get('/expirations/summary')
      ]);

      setExpirations(expRes.data.data || []);
      if (expRes.data.pagination) {
        setPagination({
          ...expRes.data.pagination,
          onPerPageChange: (newLimit) => {
            setPageSize(newLimit);
            fetchExpirationsData(1, newLimit);
          }
        });
      } else {
        setPagination(null);
      }
      setSummary(sumRes.data.data || []);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos de caducidad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpirationsData(currentPage);
  }, [selectedFilter]);

  const cards = [
    {
      id: '',
      label: 'Todos los Lotes',
      sublabel: 'Inventario Completo',
      count: summary.reduce((acc, curr) => acc + parseInt(curr.count || 0, 10), 0),
      color: 'bg-white border-[#ccc3d8]'
    },
    {
      id: 'red',
      label: 'Rojo: Remates',
      sublabel: '≤ 30 días restantes',
      count: summary.find((s) => s.semaphore === 'red')?.count || 0,
      color: 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]'
    },
    {
      id: 'orange',
      label: 'Naranja: Promociones',
      sublabel: '30 a 59 días restantes',
      count: summary.find((s) => s.semaphore === 'orange')?.count || 0,
      color: 'bg-[#ffeedd] border-[#ea580c] text-[#ea580c]'
    },
    {
      id: 'yellow',
      label: 'Amarillo: Vigilar',
      sublabel: '60 a 89 días restantes',
      count: summary.find((s) => s.semaphore === 'yellow')?.count || 0,
      color: 'bg-[#fef9c3] border-[#ca8a04] text-[#854d0e]'
    },
    {
      id: 'green',
      label: 'Verde: Venta Normal',
      sublabel: '90+ días restantes',
      count: summary.find((s) => s.semaphore === 'green')?.count || 0,
      color: 'bg-[#dcfce7] border-[#16a34a] text-[#15803d]'
    }
  ];

  const columns = [
    {
      header: 'Semáforo y Acción',
      render: (item) => (
        <ExpirationSemaphore
          daysRemaining={item.days_remaining}
          semaphore={item.semaphore}
          label={item.semaphore_label}
        />
      )
    },
    {
      header: 'Producto',
      render: (item) => (
        <div>
          <span className="font-bold text-sm sm:text-base text-[#0b1c30]">{item.product_name}</span>
          <div className="text-xs text-[#7b7487] font-mono">SKU: {item.sku}</div>
        </div>
      )
    },
    {
      header: 'Lote #',
      render: (item) => (
        <span className="font-mono font-bold text-sm text-[#630ed4]">{item.batch_number}</span>
      )
    },
    {
      header: 'Fecha Caducidad',
      render: (item) => (
        <span className="font-mono text-sm font-semibold text-[#0b1c30]">{item.expiration_date}</span>
      )
    },
    {
      header: 'Días Restantes',
      render: (item) => {
        const days = parseInt(item.days_remaining, 10);
        return (
          <span
            className={`font-mono font-bold text-sm sm:text-base ${
              days <= 30
                ? 'text-[#ba1a1a]'
                : days <= 59
                ? 'text-[#ea580c]'
                : days <= 89
                ? 'text-[#ca8a04]'
                : 'text-[#16a34a]'
            }`}
          >
            {days} días
          </span>
        );
      }
    },
    {
      header: 'Stock Restante',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (item) => (
        <span className="font-mono font-black text-base text-[#0b1c30]">
          {item.stock_remaining} pzas
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
            Control de Inventario y Semáforo de Caducidad
          </h2>
          <p className="text-xs text-[#7b7487]">
            Monitoreo en tiempo real según la regla de negocio: Rojo (Remates ≤30d), Naranja (Promociones 30-59d), Amarillo (Vigilar 60-89d) y Verde (+90d)
          </p>
        </div>
      </div>

      {/* Semaphore Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => {
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
              <div>
                <div className="text-xs font-bold uppercase">{card.label}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{card.sublabel}</div>
              </div>
              <div className="text-3xl font-black font-mono mt-3">{card.count}</div>
            </button>
          );
        })}
      </div>

      {/* Expiration DataTable */}
      <DataTable
        columns={columns}
        data={expirations}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchExpirationsData(p)}
        emptyMessage="No hay productos registrados en este rango de caducidad."
      />
    </div>
  );
}
