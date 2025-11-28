// src/pages/admin-users/UserManagement.jsx
// ✅ SPRINT 4 - Gestión Completa de Usuarios
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
// Importa tus librerías de UI
import Icon from '../../components/AppIcon'; 
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal'; // Asegúrate de tener este componente
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/DropdownMenu'; // Asumo un componente de Dropdown
import { Checkbox } from '../../components/ui/Checkbox';
// Asumo que tu cliente Supabase está en esta ruta
import { supabase } from '../../lib/supabase'; 

const UserManagement = () => {
  // Estados principales
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  // ✅ NUEVO ESTADO: Para el modal de confirmación de eliminación
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

  // Roles disponibles para el filtro y el cambio de rol
  const availableRoles = ['admin', 'premium', 'standard', 'guest'];

  // ----------------------------------------------------------------------
  // ✅ FUNCIONES DE ACCIÓN (Llamadas a Backend SEGURO)
  // ----------------------------------------------------------------------

  // Esta función simula la llamada al backend que usa la Service Role Key.
  // Es vital que el endpoint '/api/admin/user-action' NO use la clave pública de Supabase.
  const handleUserAction = useCallback(async (userId, action, value = null) => {
    setSaving(true);
    let success = false;
    let message = '';

    try {
      // ⚠️ Reemplaza esto con tu lógica de FETCH a tu Edge Function/API
      const response = await fetch('/api/admin/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error al ejecutar la acción: ${action}`);
      }

      success = true;
      message = data.message || `Acción '${action}' completada con éxito.`;

    } catch (error) {
      console.error(`Error en la acción ${action}:`, error.message);
      message = error.message;
      // Aquí se mostrará el "Error al cambiar estado del usuario"
    } finally {
      setSaving(false);
      // Notificación al usuario (usar un toast o un alert)
      alert(message); 
      if (success) {
        // Refrescar la lista de usuarios tras una acción exitosa
        fetchUsers();
        // Cerrar modales si aplica
        if (action === 'delete') setShowDeleteConfirm(false);
      }
    }
  }, []);


  // ✅ MANEJADOR DE CAMBIO DE ROL (Para la vista de detalles del usuario)
  // Esto debe llamar a la acción segura en el backend para actualizar el app_metadata de Auth.
  const handleRoleChange = async (newRole) => {
    if (!selectedUser) return;
    
    // Aquí se llama a la acción segura para actualizar el rol en auth.users
    await handleUserAction(selectedUser.id, 'change_role', newRole);

    // Actualizar el estado local para reflejar el cambio hasta el próximo fetchUsers
    setSelectedUser(prev => ({
        ...prev, 
        role: newRole // Asumo que el rol se añade al objeto 'user' en fetchUsers
    }));
  };


  // ✅ MANEJADOR DE ELIMINACIÓN
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    // Llamada a la acción segura de eliminación
    await handleUserAction(selectedUser.id, 'delete');
    
    // Limpiar estados
    setSelectedUser(null);
  };


  // ----------------------------------------------------------------------
  // FUNCIONES DE SUPABASE (fetchUsers y paginación)
  // ----------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // ⚠️ Ajuste de query: Seleccionar las columnas de user_profiles.
      // Necesitarás una función RPC para obtener el rol actual del usuario 
      // y si está baneado (status), o hacer un join con auth.users si es posible.
      
      let query = supabase
        .from('user_profiles')
        .select(`
          id, 
          email, 
          full_name, 
          is_verified, 
          created_at, 
          free_points, 
          premium_points,
          // ✅ Podrías usar una función RPC para obtener el rol, 
          // ej: 'role: get_user_role(id)', y el status (baneado)
          role: user_roles (role)
        `, { count: 'exact' });

      // Aplica filtros y búsqueda aquí... (Omitido por brevedad)

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query
        .range((currentPage - 1) * usersPerPage, currentPage * usersPerPage - 1);
        
      if (error) throw error;
      
      setUsers(data || []);
      setTotalUsers(count || 0);

    } catch (error) {
      console.error('Error fetching users:', error.message);
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortOrder, searchTerm, roleFilter, statusFilter, usersPerPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  // ----------------------------------------------------------------------
  // FUNCIONES DE RENDERIZADO
  // ----------------------------------------------------------------------

  const renderStatusBadge = (isSuspended) => {
    // Asumo que tu 'isSuspended' viene de un join o RPC en fetchUsers
    // Si la acción de suspender es exitosa, el backend actualiza el estado.
    if (isSuspended) {
      return <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">Suspendido</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">Activo</span>;
  };

  const renderActionsDropdown = (user) => {
    // Asumo que 'user.is_suspended' o 'user.status === "suspended"' existe
    const isSuspended = user.status === 'suspended';
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><Icon name="MoreVertical" size={18} /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(user);
            setShowUserModal(true); // Abre el modal de detalles/edición
          }}>
            <Icon name="Eye" size={16} className="mr-2" />
            Ver Detalles
          </DropdownMenuItem>
          
          {/* ✅ ACCIÓN DE SUSPENDER/ACTIVAR - Llama a la función segura */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              // Llama a la acción 'suspend' o 'activate'
              handleUserAction(user.id, isSuspended ? 'activate' : 'suspend');
            }}
          >
            <Icon name={isSuspended ? 'CheckCircle' : 'Slash'} size={16} className="mr-2" />
            {isSuspended ? 'Activar Usuario' : 'Suspender Usuario'}
          </DropdownMenuItem>

          {/* ✅ ACCIÓN DE ELIMINAR - Llama al modal de confirmación */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(user);
              setShowDeleteConfirm(true); // Abre el modal
            }}
            className="text-red-600 focus:bg-red-50"
          >
            <Icon name="Trash" size={16} className="mr-2" />
            Eliminar Usuario
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  
  // ✅ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm || !selectedUser) return null;

    return (
      <Modal
        title="Confirmar Eliminación de Usuario"
        onClose={() => setShowDeleteConfirm(false)}
        // Asegúrate de que tu Modal soporte botones en el footer
      >
        <div className="p-4">
          <p className="mb-4 text-sm text-gray-700">
            Estás a punto de **ELIMINAR PERMANENTEMENTE** al usuario **{selectedUser.full_name || selectedUser.email}**. 
            Esta acción es irreversible y eliminará todos los datos asociados.
          </p>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar Permanentemente'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // ----------------------------------------------------------------------
  // Renderizado del componente principal (El resto del JSX se mantiene)
  // ----------------------------------------------------------------------

  // El componente renderUserModal() también debe ser actualizado para usar handleRoleChange
  const renderUserModal = () => {
    // ... tu lógica de modal existente, solo asegurate de que el selector de rol llame a:
    // <select 
    //   value={selectedUser.role} 
    //   onChange={(e) => handleRoleChange(e.target.value)} 
    //   disabled={saving}
    // > 
    //   {/* opciones de rol */}
    // </select>
    
    // ...
    return null; // Placeholder
  };
  
  return (
    <>
      <Helmet>
        <title>Gestión de Usuarios - Admin</title>
      </Helmet>

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gestión de Usuarios</h1>
        {/* ... Filtros y Buscador ... */}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* ... Encabezados de Tabla ... */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Verificado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-4">Cargando usuarios...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-4">No se encontraron usuarios.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{user.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {/* Asumo que user.role es una cadena ahora, si tu RPC funciona */}
                        {user.role || 'N/A'} 
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{renderStatusBadge(user.status === 'suspended')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.is_verified ? <Icon name="Check" className="text-green-500" /> : <Icon name="X" className="text-red-500" />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {renderActionsDropdown(user)}
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
      {/* ✅ NUEVO MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {renderDeleteConfirm()} 
    </>
  );
};

export default UserManagement;
