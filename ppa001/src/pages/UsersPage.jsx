import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
    phone: ''
  });
  const [saving, setSaving] = useState(false);

  // Delete Dialog
  const [targetUser, setTargetUser] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { per_page: 50 };
      if (search) params.search = search;
      if (selectedRole) params.role = selectedRole;

      const response = await api.get('/users', { params });
      setUsers(response.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, selectedRole]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'vendedor',
      phone: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      phone: u.phone || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
        toast.success('Usuario actualizado con éxito');
      } else {
        await api.post('/users', formData);
        toast.success('Usuario creado con éxito');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUser = async () => {
    if (!targetUser) return;
    try {
      await api.patch(`/users/${targetUser.id}/toggle`);
      toast.success(`Usuario ${targetUser.is_active ? 'deshabilitado' : 'habilitado'}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Error al cambiar estado del usuario');
    }
  };

  const handleHardDeleteUser = async () => {
    if (!targetUser) return;
    try {
      await api.delete(`/users/${targetUser.id}`);
      toast.success('Usuario eliminado permanentemente');
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const columns = [
    {
      header: 'Acciones',
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEdit(u)}
            className="w-9 h-9 rounded-xl bg-white border border-[#ccc3d8] flex items-center justify-center hover:bg-[#e5eeff] active:scale-95 shadow-2xs transition-all"
            title="Editar"
          >
            <span className="material-symbols-outlined text-[19px] text-[#630ed4]">edit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetUser(u);
              setIsConfirmOpen(true);
            }}
            className="w-9 h-9 rounded-xl bg-[#ffdad6]/60 text-[#ba1a1a] flex items-center justify-center hover:bg-[#ffdad6] active:scale-95 shadow-2xs transition-all"
            title="Eliminar"
          >
            <span className="material-symbols-outlined text-[19px]">delete</span>
          </button>
        </div>
      )
    },
    {
      header: 'Usuario',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#630ed4] font-bold text-base border border-[#ccc3d8]/40">
            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base text-[#0b1c30]">{u.name}</div>
            <div className="text-xs text-[#7b7487]">{u.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Rol en el Sistema',
      render: (u) => {
        const roleBadges = {
          admin: 'bg-[#630ed4] text-white',
          gerente: 'bg-[#005479] text-white',
          vendedor: 'bg-[#eff4ff] text-[#630ed4] border border-[#ccc3d8]'
        };
        const roleLabels = {
          admin: 'Administrador',
          gerente: 'Gerente',
          vendedor: 'Vendedor'
        };
        return (
          <span className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-bold ${roleBadges[u.role] || 'bg-neutral-100'}`}>
            {roleLabels[u.role] || u.role}
          </span>
        );
      }
    },
    {
      header: 'Teléfono',
      render: (u) => (
        <span className="text-sm font-mono text-[#0b1c30]">{u.phone || 'N/A'}</span>
      )
    },
    {
      header: 'Estado',
      render: (u) => (
        <span
          className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-bold ${
            u.is_active ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#ffdad6] text-[#ba1a1a]'
          }`}
        >
          {u.is_active ? 'Activo' : 'Deshabilitado'}
        </span>
      )
    },
    {
      header: 'Fecha Registro',
      render: (u) => (
        <span className="text-xs sm:text-sm text-[#7b7487] font-mono">
          {new Date(u.created_at).toLocaleDateString('es-MX')}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0b1c30] tracking-tight">Gestión de Usuarios y Roles</h2>
          <p className="text-xs text-[#7b7487]">
            Control de accesos: Administrador, Gerente y Vendedor
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="min-h-[44px] px-5 bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Nuevo Usuario
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-[#ccc3d8]/40 shadow-xs">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-3 material-symbols-outlined text-[#7b7487] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full min-h-[44px] pl-10 pr-4 bg-[#f8f9ff] border border-[#ccc3d8]/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
          />
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full sm:w-48 min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8]/60 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
        >
          <option value="">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="gerente">Gerente</option>
          <option value="vendedor">Vendedor</option>
        </select>
      </div>

      {/* Users DataTable */}
      <DataTable columns={columns} data={users} loading={loading} />

      {/* User Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuario' : 'Crear Usuario'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
                Rol en el Sistema
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-bold"
              >
                <option value="admin">Administrador</option>
                <option value="gerente">Gerente</option>
                <option value="vendedor">Vendedor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="55-1234-5678"
                className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1c30] uppercase mb-1">
              {editingUser ? 'Nueva Contraseña (dejar vacío para mantener actual)' : 'Contraseña'}
            </label>
            <input
              type="password"
              required={!editingUser}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
              className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ccc3d8] rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl bg-neutral-200 text-xs font-bold hover:bg-neutral-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-6 rounded-xl bg-[#630ed4] text-white text-xs font-bold hover:bg-[#7c3aed] shadow-md"
            >
              {saving ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        itemName={targetUser?.name || 'usuario'}
        isActive={targetUser?.is_active}
        onToggleActive={handleToggleUser}
        onHardDelete={handleHardDeleteUser}
      />
    </div>
  );
}
