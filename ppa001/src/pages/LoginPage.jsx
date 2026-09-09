import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
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
      const user = await login(cleanEmail, cleanPass);
      if (user.role !== 'admin' && user.role !== 'gerente') {
        toast.error('Acceso restringido: Requiere rol de Administrador o Gerente');
        return;
      }
      toast.success(`¡Bienvenido ${user.name}!`);
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0b1c30] p-4 sm:p-6 select-none relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <InstallAppButton />
      </div>
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#630ed4] flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[36px]">admin_panel_settings</span>
          </div>
          <h1 className="text-2xl font-black text-[#0b1c30] tracking-tight">Panel Admin</h1>
          <p className="text-xs font-black text-amber-700 uppercase tracking-wider">
            {import.meta.env.VITE_APP_NAME || 'Sistema POS'} • Control Gerencial &amp; Inventarios
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mitienda.com"
              className="w-full min-h-[48px] px-4 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-[48px] px-4 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[50px] bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Accediendo...' : 'Ingresar al Panel'}
          </button>
        </form>

        <div
          onClick={() => handleDemoFill('admin@demo.com', 'password')}
          className="p-3 bg-[#eff4ff] hover:bg-[#e0ecff] cursor-pointer transition-colors rounded-xl border border-[#ccc3d8]/40 text-center text-xs text-[#4a4455]"
          title="Haz clic para autocompletar credenciales"
        >
          <p className="font-bold text-[#630ed4]">👉 Clic aquí para autocompletar Demo:</p>
          <p className="font-mono text-[11px] mt-0.5 font-semibold text-slate-700">admin@demo.com / password</p>
        </div>
      </div>
    </div>
  );
}
