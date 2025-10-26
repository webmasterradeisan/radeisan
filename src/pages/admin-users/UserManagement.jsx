// src/pages/admin-users/UserManagement.jsx
// ✅ SPRINT 4 - Gestión Completa de Usuarios
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';

const UserManagement = () => {
  // Estados principales
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 20;
  
  // Estados de edición
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [userActivity, setUserActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Roles disponibles
  const ROLES = [
    { value: 'user', label: 'Usuario', color: 'text-muted-foreground' },
    { value: 'moderator', label: 'Moderador', color: 'text-warning' },
    { value: 'admin', label: 'Administrador', color: 'text-error' }
  ];

  // ===============================
  // FETCH USUARIOS
  // ===============================
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Construir query base
      let query = supabase
        .from('profiles')
        .select(`
          *,
          admin_roles (role),
          user_points (free_points, premium_points)
        `, { count: 'exact' });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }

      // Ordenamiento
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Paginación
      const from = (currentPage - 1) * usersPerPage;
      const to = from + usersPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Procesar usuarios para incluir rol
      const processedUsers = data?.map(user => ({
        ...user,
        role: user.admin_roles?.[0]?.role || 'user',
        totalPoints: (user.user_points?.[0]?.free_points || 0) + (user.user_points?.[0]?.premium_points || 0)
      })) || [];

      // Aplicar filtro de rol (después de procesar)
      const filteredUsers = roleFilter !== 'all' 
        ? processedUsers.filter(u => u.role === roleFilter)
        : processedUsers;

      setUsers(filteredUsers);
      setTotalUsers(count || 0);

    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter, sortBy, sortOrder, currentPage]);

  // ===============================
  // FETCH ACTIVIDAD DEL USUARIO
  // ===============================
  const fetchUserActivity = useCallback(async (userId) => {
    try {
      setLoadingActivity(true);
      
      // Obtener últimas transacciones de puntos
      const { data: transactions } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Obtener videos subidos
      const { data: videos } = await supabase
        .from('videos')
        .select('id, title, created_at, views_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setUserActivity({
        transactions: transactions || [],
        videos: videos || []
      });

    } catch (error) {
      console.error('Error fetching user activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  // ===============================
  // EDITAR USUARIO
  // ===============================
  const handleEditUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setEditingUser({
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      bio: user.bio || '',
      role: user.role,
      is_active: user.is_active ?? true
    });
    setSelectedUser(user);
    setShowUserModal(true);
    fetchUserActivity(userId);
  };

  // ===============================
  // GUARDAR CAMBIOS DE USUARIO
  // ===============================
  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);

      // Actualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editingUser.full_name,
          username: editingUser.username,
          bio: editingUser.bio,
          is_active: editingUser.is_active
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Actualizar rol si cambió
      if (editingUser.role !== selectedUser.role) {
        // Primero eliminar rol anterior
        await supabase
          .from('admin_roles')
          .delete()
          .eq('user_id', editingUser.id);

        // Si el nuevo rol no es 'user', agregar rol
        if (editingUser.role !== 'user') {
          const { error: roleError } = await supabase
            .from('admin_roles')
            .insert({
              user_id: editingUser.id,
              role: editingUser.role
            });

          if (roleError) throw roleError;
        }
      }

      // Recargar usuarios
      await fetchUsers();
      setShowUserModal(false);
      setEditingUser(null);
      setSelectedUser(null);

    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  // ===============================
  // SUSPENDER/ACTIVAR USUARIO
  // ===============================
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Error al cambiar el estado del usuario');
    }
  };

  // ===============================
  // ELIMINAR USUARIO (Soft delete)
  // ===============================
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);

      // En lugar de eliminar, desactivar permanentemente
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: false,
          deleted_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      await fetchUsers();
      setShowDeleteConfirm(false);
      setShowUserModal(false);
      setSelectedUser(null);

    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar el usuario');
    } finally {
      setSaving(false);
    }
  };

  // ===============================
  // PAGINACIÓN
  // ===============================
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // ===============================
  // EFFECTS
  // ===============================
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // ===============================
  // RENDER: MODAL DE USUARIO
  // ===============================
  const renderUserModal = () => {
    if (!showUserModal || !selectedUser) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-4">
              {selectedUser.avatar_url ? (
                <img 
                  src={selectedUser.avatar_url}
                  alt={selectedUser.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="User" size={32} color="var(--color-primary)" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {selectedUser.full_name || 'Sin nombre'}
                </h2>
                <p className="text-muted-foreground">@{selectedUser.username}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowUserModal(false);
                setEditingUser(null);
                setSelectedUser(null);
              }}
            >
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Información Básica
                </h3>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Nombre Completo
                  </label>
                  <Input
                    value={editingUser?.full_name || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      full_name: e.target.value
                    })}
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Username
                  </label>
                  <Input
                    value={editingUser?.username || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      username: e.target.value
                    })}
                    placeholder="Username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Email
                  </label>
                  <Input
                    value={editingUser?.email || selectedUser.email}
                    disabled
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El email no se puede modificar
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Biografía
                  </label>
                  <textarea
                    value={editingUser?.bio || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      bio: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    placeholder="Biografía del usuario"
                  />
                </div>

                {/* Rol y Estado */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Rol
                    </label>
                    <select
                      value={editingUser?.role || 'user'}
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        role: e.target.value
                      })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Estado de la cuenta</p>
                      <p className="text-sm text-muted-foreground">
                        {editingUser?.is_active ? 'Cuenta activa' : 'Cuenta suspendida'}
                      </p>
                    </div>
                    <Checkbox
                      checked={editingUser?.is_active ?? true}
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        is_active: e.target.checked
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Estadísticas y Actividad */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Estadísticas
                </h3>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="Coins" size={16} color="var(--color-accent)" />
                      <span className="text-xs text-muted-foreground">Puntos Gratis</span>
                    </div>
                    <p className="text-2xl font-bold text-accent">
                      {selectedUser.user_points?.[0]?.free_points?.toLocaleString() || 0}
                    </p>
                  </div>

                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="Award" size={16} color="var(--color-warning)" />
                      <span className="text-xs text-muted-foreground">Puntos Premium</span>
                    </div>
                    <p className="text-2xl font-bold text-warning">
                      {selectedUser.user_points?.[0]?.premium_points?.toLocaleString() || 0}
                    </p>
                  </div>

                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="Calendar" size={16} color="var(--color-primary)" />
                      <span className="text-xs text-muted-foreground">Miembro desde</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="Clock" size={16} color="var(--color-secondary)" />
                      <span className="text-xs text-muted-foreground">Última actividad</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(selectedUser.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actividad Reciente */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Actividad Reciente
                  </h4>
                  
                  {loadingActivity ? (
                    <div className="text-center py-4">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : (
                    <>
                      {/* Transacciones */}
                      {userActivity.transactions?.length > 0 && (
                        <div className="bg-background border border-border rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Últimas Transacciones
                          </p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {userActivity.transactions.slice(0, 5).map(tx => (
                              <div key={tx.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground truncate">
                                  {tx.description}
                                </span>
                                <span className={`font-semibold ${
                                  tx.amount > 0 ? 'text-success' : 'text-error'
                                }`}>
                                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Videos */}
                      {userActivity.videos?.length > 0 && (
                        <div className="bg-background border border-border rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Videos Recientes
                          </p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {userActivity.videos.slice(0, 5).map(video => (
                              <div key={video.id} className="flex items-center justify-between text-xs">
                                <span className="text-foreground truncate">
                                  {video.title}
                                </span>
                                <span className="text-muted-foreground flex items-center">
                                  <Icon name="Eye" size={12} className="mr-1" />
                                  {video.views_count || 0}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!userActivity.transactions?.length && !userActivity.videos?.length) && (
                        <div className="text-center py-6 text-muted-foreground">
                          <Icon name="Activity" size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Sin actividad reciente</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Icon name="Trash2" size={16} className="mr-2" />
              Eliminar Usuario
            </Button>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                  setSelectedUser(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===============================
  // RENDER: MODAL DE CONFIRMACIÓN
  // ===============================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
              <Icon name="AlertTriangle" size={24} color="var(--color-error)" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                ¿Eliminar usuario?
              </h3>
              <p className="text-sm text-muted-foreground">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Estás a punto de eliminar la cuenta de <strong>{selectedUser?.full_name}</strong>. 
            El usuario será desactivado permanentemente y perderá el acceso a la plataforma.
          </p>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteUser}
              disabled={saving}
            >
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <>
      <Helmet>
        <title>Gestión de Usuarios - Admin Radeisan</title>
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-muted-foreground mt-1">
              {totalUsers} usuarios registrados
            </p>
          </div>
          <Button onClick={fetchUsers} disabled={loading}>
            <Icon 
              name="RefreshCw" 
              size={16} 
              className={`mr-2 ${loading ? 'animate-spin' : ''}`} 
            />
            Actualizar
          </Button>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-2">
              <Input
                placeholder="Buscar por nombre, username o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="Search"
              />
            </div>

            {/* Filtro por Rol */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="all">Todos los roles</option>
              {ROLES.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            {/* Filtro por Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Suspendidos</option>
            </select>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Puntos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Registro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-muted-foreground">Cargando usuarios...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <Icon name="Users" size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No se encontraron usuarios</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr 
                      key={user.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {/* Usuario */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon name="User" size={20} color="var(--color-primary)" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">
                              {user.full_name || 'Sin nombre'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {user.email}
                      </td>

                      {/* Rol */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-error/10 text-error' :
                          user.role === 'moderator' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {ROLES.find(r => r.value === user.role)?.label || 'Usuario'}
                        </span>
                      </td>

                      {/* Puntos */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">
                            {user.totalPoints?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.user_points?.[0]?.free_points || 0} gratis + {user.user_points?.[0]?.premium_points || 0} premium
                          </p>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-success/10 text-success' 
                            : 'bg-error/10 text-error'
                        }`}>
                          <Icon 
                            name={user.is_active ? 'CheckCircle' : 'XCircle'} 
                            size={12} 
                            className="mr-1"
                          />
                          {user.is_active ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>

                      {/* Fecha de Registro */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user.id)}
                            title="Ver detalles"
                          >
                            <Icon name="Eye" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                            title={user.is_active ? 'Suspender' : 'Activar'}
                          >
                            <Icon 
                              name={user.is_active ? 'UserX' : 'UserCheck'} 
                              size={16}
                              color={user.is_active ? 'var(--color-error)' : 'var(--color-success)'}
                            />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * usersPerPage) + 1} a {Math.min(currentPage * usersPerPage, totalUsers)} de {totalUsers} usuarios
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <Icon name="ChevronLeft" size={16} />
                </Button>
                <span className="text-sm text-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <Icon name="ChevronRight" size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {renderUserModal()}
      {renderDeleteConfirm()}
    </>
  );
};

export default UserManagement;
