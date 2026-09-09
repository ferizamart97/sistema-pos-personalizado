import React, { useState, useEffect } from 'react';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No se encontraron registros',
  pagination = null,
  onPageChange = null
}) {
  // Local pagination for client-side lists
  const [localPage, setLocalPage] = useState(1);
  const [localPerPage, setLocalPerPage] = useState(10);

  useEffect(() => {
    setLocalPage(1);
  }, [data.length, localPerPage]);

  if (loading) {
    return (
      <div className="w-full p-12 bg-white rounded-2xl border border-[#ccc3d8]/40 text-center">
        <span className="material-symbols-outlined text-[48px] text-[#630ed4] animate-spin">
          progress_activity
        </span>
        <p className="text-sm font-semibold mt-2 text-[#7b7487]">Cargando datos...</p>
      </div>
    );
  }

  // Determine active pagination info
  const isServerPaged = Boolean(pagination);
  const activePerPage = isServerPaged ? (pagination.per_page || 10) : localPerPage;
  const activeCurrentPage = isServerPaged ? (pagination.current_page || 1) : localPage;
  const activeTotal = isServerPaged ? (pagination.total ?? data.length) : data.length;
  const activeLastPage = isServerPaged ? (pagination.last_page || 1) : Math.max(1, Math.ceil(data.length / localPerPage));
  const activeFrom = isServerPaged 
    ? (pagination.from || (activeTotal > 0 ? 1 : 0)) 
    : (data.length > 0 ? (localPage - 1) * localPerPage + 1 : 0);
  const activeTo = isServerPaged 
    ? (pagination.to || activeTotal) 
    : Math.min(data.length, localPage * localPerPage);

  const displayedRows = isServerPaged 
    ? data 
    : data.slice((localPage - 1) * localPerPage, localPage * localPerPage);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > activeLastPage) return;
    if (isServerPaged) {
      if (onPageChange) onPageChange(newPage);
    } else {
      setLocalPage(newPage);
    }
  };

  const handlePerPageChange = (newSize) => {
    if (isServerPaged) {
      if (pagination.onPerPageChange) {
        pagination.onPerPageChange(newSize);
      } else if (onPageChange) {
        onPageChange(1, newSize);
      }
    } else {
      setLocalPerPage(newSize);
      setLocalPage(1);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-[#ccc3d8]/40 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead className="bg-[#f8f9ff] text-xs sm:text-sm uppercase text-[#7b7487] font-bold border-b border-[#e5eeff]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-5 py-4 font-bold ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5eeff]">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-[#7b7487]">
                  <span className="material-symbols-outlined text-[48px] text-[#ccc3d8] mb-1">
                    inbox
                  </span>
                  <p className="text-base font-semibold">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              displayedRows.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-[#eff4ff]/60 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-5 py-4 text-base ${col.cellClassName || ''}`}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unified Pagination Controls for all tables */}
      <div className="px-5 py-4 bg-[#f8f9ff] border-t border-[#e5eeff] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#7b7487]">
        <div className="flex items-center gap-3">
          <span>
            Mostrando <strong>{activeFrom}</strong> a <strong>{activeTo}</strong> de <strong>{activeTotal}</strong> registros
          </span>

          {/* Per Page Selector: 10, 20, 50, 100 */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-[#ccc3d8]/40">
            <span className="text-xs font-semibold text-[#0b1c30]">Mostrar:</span>
            <select
              value={activePerPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-white border border-[#ccc3d8] rounded-xl font-bold text-xs sm:text-sm text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#630ed4] cursor-pointer"
            >
              <option value="10">10 por pág.</option>
              <option value="20">20 por pág.</option>
              <option value="50">50 por pág.</option>
              <option value="100">100 por pág.</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={activeCurrentPage <= 1}
            onClick={() => handlePageChange(activeCurrentPage - 1)}
            className="px-4 py-2 bg-white border border-[#ccc3d8] rounded-xl font-bold text-xs sm:text-sm text-[#0b1c30] hover:bg-[#e5eeff] disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs"
          >
            Anterior
          </button>
          <span className="px-4 py-2 font-bold text-xs sm:text-sm text-[#0b1c30] bg-[#e5eeff]/50 rounded-xl">
            {activeCurrentPage} / {activeLastPage}
          </span>
          <button
            type="button"
            disabled={activeCurrentPage >= activeLastPage}
            onClick={() => handlePageChange(activeCurrentPage + 1)}
            className="px-4 py-2 bg-white border border-[#ccc3d8] rounded-xl font-bold text-xs sm:text-sm text-[#0b1c30] hover:bg-[#e5eeff] disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
