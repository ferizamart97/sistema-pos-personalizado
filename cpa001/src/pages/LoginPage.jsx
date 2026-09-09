import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import TouchButton from '../components/common/TouchButton';
import InstallAppButton from '../components/common/InstallAppButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleDemoFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      toast.error('Por favor ingresa correo y contraseña');
      return;
    }

    try {
      setLoading(true);
      await login(cleanEmail, cleanPass);
      toast.success('¡Bienvenido al sistema POS!');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8f9ff] p-4 sm:p-6 select-none relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <InstallAppButton />
      </div>
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-[#ccc3d8]/40 space-y-6">
        {/* Branding & Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#630ed4] flex items-center justify-center text-white shadow-xl shadow-[#630ed4]/20">
            <span className="material-symbols-outlined text-[42px]">point_of_sale</span>
          </div>
          <h1 className="text-3xl font-black text-[#0b1c30] tracking-tight">{import.meta.env.VITE_APP_NAME || 'Sistema POS'}</h1>
          <p className="text-sm font-medium text-[#7b7487]">
            Terminal de Ventas POS • {import.meta.env.VITE_APP_DESCRIPTION || 'Terminal de Ventas'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
              Correo Electrónico
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 material-symbols-outlined text-[#7b7487] text-[22px]">
                mail
              </span>
              <input
                type="email"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendedor@mitienda.com"
                className="w-full min-h-[52px] pl-12 pr-4 bg-[#f8f9ff] border border-[#ccc3d8]/60 rounded-2xl text-base text-[#0b1c30] placeholder-[#7b7487] focus:outline-none focus:ring-2 focus:ring-[#630ed4] transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 material-symbols-outlined text-[#7b7487] text-[22px]">
                lock
              </span>
              <input
                type="password"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[52px] pl-12 pr-4 bg-[#f8f9ff] border border-[#ccc3d8]/60 rounded-2xl text-base text-[#0b1c30] placeholder-[#7b7487] focus:outline-none focus:ring-2 focus:ring-[#630ed4] transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <TouchButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
              icon={loading ? 'hourglass_top' : 'login'}
              className="py-4 font-bold text-lg shadow-xl shadow-[#630ed4]/25"
            >
              {loading ? 'Iniciando sesión...' : 'Ingresar a Caja'}
            </TouchButton>
          </div>
        </form>

        {/* Quick Demo Help */}
        <div className="p-3.5 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/40 text-center space-y-2">
          <p className="text-xs font-bold text-[#630ed4]">👉 Clic para autocompletar Demo:</p>
          <div className="flex flex-col gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleDemoFill('admin@demo.com', 'password')}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 transition"
            >
              👑 Admin: <b>admin@demo.com</b> / <b>password</b>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('vendedor1@demo.com', 'password')}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 transition"
            >
              🛒 Vendedor: <b>vendedor1@demo.com</b> / <b>password</b>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
