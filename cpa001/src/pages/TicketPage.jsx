import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import TicketPreview from '../components/ticket/TicketPreview';
import TicketActions from '../components/ticket/TicketActions';
import TouchButton from '../components/common/TouchButton';

export default function TicketPage() {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/tickets/${saleId}`);
        const data = response.data.data;
        setSale(data.sale);
        setDetails(data.details || []);
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar datos del ticket');
      } finally {
        setLoading(false);
      }
    };

    if (saleId) {
      fetchTicket();
    }
  }, [saleId]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Header */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between pb-4 border-b border-[#ccc3d8]/40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] px-3.5 flex items-center gap-2 rounded-xl bg-white border border-[#ccc3d8]/60 text-[#0b1c30] hover:bg-[#e5eeff] active:scale-95 font-bold text-sm shadow-xs"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Volver a Caja</span>
          </button>
          <div>
            <h2 className="text-xl font-black text-[#0b1c30]">Comprobante de Venta</h2>
            <p className="text-xs text-[#7b7487]">Venta exitosa registrada</p>
          </div>
        </div>

        <TouchButton
          onClick={() => navigate('/')}
          variant="primary"
          size="md"
          icon="add_shopping_cart"
          className="font-bold"
        >
          Nueva Venta
        </TouchButton>
      </header>

      {/* Main Ticket Display & Actions Area */}
      <main className="max-w-3xl mx-auto w-full py-6 flex flex-col md:flex-row gap-6 items-start justify-center">
        {loading ? (
          <div className="w-full max-w-[360px] mx-auto p-12 bg-white rounded-2xl shadow-md text-center">
            <span className="material-symbols-outlined text-[48px] text-[#630ed4] animate-spin">
              progress_activity
            </span>
            <p className="text-sm font-semibold mt-2 text-[#7b7487]">Generando ticket...</p>
          </div>
        ) : (
          <>
            {/* Ticket Preview Component */}
            <div className="flex-1 flex justify-center w-full min-w-0">
              <TicketPreview sale={sale} details={details} />
            </div>

            {/* Action Buttons (Print / WhatsApp / Email) */}
            <div className="w-full md:w-80 shrink-0 sticky top-6">
              <TicketActions saleId={saleId} onNewSale={() => navigate('/')} />
            </div>
          </>
        )}
      </main>

      {/* Bottom Bar */}
      <footer className="max-w-3xl mx-auto w-full text-center text-xs text-[#7b7487] pt-4">
        {import.meta.env.VITE_APP_NAME || 'Sistema POS'} • Terminal de Ventas
      </footer>
    </div>
  );
}
