import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axiosConfig';
import TouchButton from '../common/TouchButton';

export default function TicketActions({ saleId, onNewSale }) {
  const [loading, setLoading] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showWhatsappInput, setShowWhatsappInput] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handlePrint = () => {
    window.print();
  };

  const getPdfUrl = () => {
    if (api.defaults.baseURL && api.defaults.baseURL.startsWith('http')) {
      return `${api.defaults.baseURL}/tickets/${saleId}/pdf`;
    }
    return `${window.location.origin}/api/tickets/${saleId}/pdf`;
  };

  const handleDownloadPdf = () => {
    window.open(getPdfUrl(), '_blank');
  };

  // Touch handlers for Phone Keypad
  const handlePhoneKeypad = (val) => {
    if (val === 'C') {
      setPhone('');
    } else if (val === 'backspace') {
      setPhone((prev) => prev.slice(0, -1));
    } else {
      if (phone.length < 10) {
        setPhone((prev) => prev + String(val));
      }
    }
  };

  // Touch handlers for Email Keypad
  const handleEmailKeypad = (val) => {
    if (val === 'C') {
      setEmail('');
    } else if (val === 'backspace') {
      setEmail((prev) => prev.slice(0, -1));
    } else {
      setEmail((prev) => prev + String(val));
    }
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Ingresa un correo electrónico válido');
      return;
    }
    try {
      setLoading(true);
      await api.post(`/tickets/${saleId}/send`, {
        channel: 'email',
        recipient: email
      });
      toast.success(`¡Ticket en PDF enviado por correo a ${email}!`);
      setShowEmailInput(false);
      setEmail('');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al enviar ticket por correo');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsapp = async (e) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      toast.error('Ingresa un número de WhatsApp a 10 dígitos');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`/tickets/${saleId}/send`, {
        channel: 'whatsapp',
        recipient: phone
      });

      toast.success(`¡Ticket en PDF preparado para WhatsApp al ${phone}!`);
      
      if (res.data?.data?.whatsapp_url) {
        window.open(res.data.data.whatsapp_url, '_blank');
      }

      setShowWhatsappInput(false);
      setPhone('');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al procesar envío por WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneDisplay = (p) => {
    if (!p) return '___-___-____';
    const clean = p.padEnd(10, '_');
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-3 select-none">
      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handlePrint}
          className="min-h-[52px] p-2.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] rounded-xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm border border-[#ccc3d8]/50 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] text-[#630ed4]">print</span>
          <span>Imprimir Ticket</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          className="min-h-[52px] p-2.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] rounded-xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm border border-[#ccc3d8]/50 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] text-[#0284c7]">picture_as_pdf</span>
          <span>Descargar PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setShowWhatsappInput(!showWhatsappInput);
            setShowEmailInput(false);
          }}
          className={`min-h-[48px] p-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm border transition-all active:scale-95 shadow-xs cursor-pointer ${
            showWhatsappInput
              ? 'bg-[#22c55e] text-white border-[#22c55e]'
              : 'bg-white hover:bg-[#f0fdf4] text-[#15803d] border-[#22c55e]/40'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">chat</span>
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowEmailInput(!showEmailInput);
            setShowWhatsappInput(false);
          }}
          className={`min-h-[48px] p-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm border transition-all active:scale-95 shadow-xs cursor-pointer ${
            showEmailInput
              ? 'bg-[#630ed4] text-white border-[#630ed4]'
              : 'bg-white hover:bg-[#eff4ff] text-[#630ed4] border-[#630ed4]/40'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">mail</span>
          <span>Correo</span>
        </button>
      </div>

      {/* WhatsApp Integrated Touch Keypad */}
      {showWhatsappInput && (
        <div className="p-4 bg-white rounded-2xl border-2 border-[#22c55e] shadow-lg space-y-3 animate-in fade-in w-full box-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#15803d] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">chat</span>
              WhatsApp (10 Dígitos)
            </span>
            <span className="text-xs font-mono font-bold text-[#7b7487]">
              {phone.length}/10
            </span>
          </div>

          {/* Number Display */}
          <div className="min-h-[50px] px-3 py-2 bg-[#f8f9ff] border-2 border-[#22c55e]/40 rounded-xl flex items-center justify-center text-2xl font-black font-mono text-[#0b1c30] tracking-wider">
            {formatPhoneDisplay(phone)}
          </div>

          {/* Touch Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'backspace'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handlePhoneKeypad(k)}
                className={`min-h-[46px] rounded-xl font-mono font-black text-xl flex items-center justify-center transition-all active:scale-95 shadow-2xs border ${
                  k === 'C'
                    ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffdad6]'
                    : k === 'backspace'
                    ? 'bg-[#eff4ff] text-[#15803d] border-[#ccc3d8]/40'
                    : 'bg-white text-[#0b1c30] border-[#ccc3d8]/50 hover:bg-[#f8f9ff]'
                }`}
              >
                {k === 'backspace' ? (
                  <span className="material-symbols-outlined text-[22px]">backspace</span>
                ) : (
                  k
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading || phone.length < 10}
            onClick={handleSendWhatsapp}
            className="w-full min-h-[48px] bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-sm font-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
            <span>{loading ? 'Enviando...' : 'Enviar a WhatsApp'}</span>
          </button>
        </div>
      )}

      {/* Email Integrated Touch Keypad */}
      {showEmailInput && (
        <div className="p-3.5 bg-white rounded-2xl border-2 border-[#630ed4] shadow-lg space-y-2.5 animate-in fade-in w-full box-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#630ed4] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">mail</span>
              Correo Electrónico
            </span>
            {email && (
              <button
                type="button"
                onClick={() => handleEmailKeypad('C')}
                className="text-[11px] font-bold text-[#ba1a1a] hover:underline"
              >
                Borrar
              </button>
            )}
          </div>

          {/* Email Display */}
          <div className="min-h-[44px] px-3 py-1.5 bg-[#f8f9ff] border-2 border-[#630ed4]/40 rounded-xl flex items-center text-xs sm:text-sm font-mono font-bold text-[#0b1c30] truncate overflow-x-auto">
            {email || <span className="text-[#7b7487] font-normal font-sans">Escribe el correo...</span>}
          </div>

          {/* Quick Domain Pills */}
          <div className="flex flex-wrap gap-1">
            {['@gmail.com', '@hotmail.com', '@outlook.com', '.com', '.mx'].map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => handleEmailKeypad(dom)}
                className="px-2.5 py-1 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#630ed4] font-mono font-bold text-xs rounded-lg active:scale-90 border border-[#630ed4]/30"
              >
                {dom}
              </button>
            ))}
          </div>

          {/* Compact On-Screen Alphabet & Digit Keypad */}
          <div className="space-y-1 pt-1">
            <div className="grid grid-cols-10 gap-1 text-center font-mono font-bold text-xs">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleEmailKeypad(c)}
                  className="min-h-[32px] bg-white border border-[#ccc3d8] rounded-md active:scale-90 text-[#0b1c30]"
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-10 gap-1 text-center font-mono font-bold text-xs">
              {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleEmailKeypad(c)}
                  className="min-h-[34px] bg-white border border-[#ccc3d8] rounded-md active:scale-90 text-[#0b1c30]"
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-10 gap-1 text-center font-mono font-bold text-xs">
              {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleEmailKeypad(c)}
                  className="min-h-[34px] bg-white border border-[#ccc3d8] rounded-md active:scale-90 text-[#0b1c30]"
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-10 gap-1 text-center font-mono font-bold text-xs">
              {['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '-', '_'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleEmailKeypad(c)}
                  className="min-h-[34px] bg-white border border-[#ccc3d8] rounded-md active:scale-90 text-[#0b1c30]"
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => handleEmailKeypad('@')}
                className="min-h-[36px] bg-[#eff4ff] text-[#630ed4] font-mono font-black text-sm rounded-lg border border-[#ccc3d8] active:scale-95"
              >
                @
              </button>
              <button
                type="button"
                onClick={() => handleEmailKeypad('.')}
                className="min-h-[36px] bg-[#eff4ff] text-[#0b1c30] font-mono font-black text-sm rounded-lg border border-[#ccc3d8] active:scale-95"
              >
                . (punto)
              </button>
              <button
                type="button"
                onClick={() => handleEmailKeypad('backspace')}
                className="min-h-[36px] bg-[#ffdad6] text-[#ba1a1a] rounded-lg border border-[#ffdad6] active:scale-95 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">backspace</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={loading || !email || !email.includes('@')}
            onClick={handleSendEmail}
            className="w-full min-h-[46px] bg-[#630ed4] hover:bg-[#7c3aed] disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-sm font-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
            <span>{loading ? 'Enviando...' : 'Enviar por Correo'}</span>
          </button>
        </div>
      )}

      {/* Volver / Nueva Venta Button */}
      {onNewSale && (
        <div className="pt-2">
          <TouchButton
            onClick={onNewSale}
            variant="primary"
            size="lg"
            fullWidth
            icon="point_of_sale"
            className="!py-4 !text-base font-black shadow-md"
          >
            ← Volver a Caja / Nueva Venta
          </TouchButton>
        </div>
      )}
    </div>
  );
}
