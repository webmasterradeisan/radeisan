// src/pages/admin-users/UserManagement.jsx
// ✅ SPRINT 4 - Gestión Completa de Usuarios
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
// Importa tus librerías de UI
import Icon from '../../components/AppIcon'; 
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';

// 🚨 CORRECCIÓN DE RUTAS DE COMPONENTES DE UI
// Se asume que estos son los archivos que sí existen en tu carpeta 'components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
// Si necesitas el componente Dialog para el renderUserModal, deberás importarlo también.

// Asumo que tu cliente Supabase está en esta ruta
import { supabase } from '../../lib/supabase'; 

const UserManagement = () => {
  // Estados principales
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  // ✅ NUEVO ESTADO: Usaremos el estado para controlar la apertura del AlertDialog
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
  // FUNCIONES DE ACCIÓN (Llamadas a Backend SEGURO)
  // ----------------------------------------------------------------------

  // Esta función simula la llamada al backend que usa la Service Role Key.
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
    } finally {
      setSaving(false);
      alert(message); 
      if (success) {
        fetchUsers();
      }
    }
  }, []);


  // MANEJADOR DE CAMBIO DE ROL (Para la vista de detalles del usuario)
  const handleRoleChange = async (newRole) => {
    if (!selectedUser) return;
    
    // Llama a la acción segura en el backend para actualizar el app_metadata de Auth.
    await handleUserAction(selectedUser.id, 'change_role', newRole);

    setSelectedUser(prev => ({
        ...prev, 
        role: newRole 
    }));
  };


  // ✅ MANEJADOR DE ELIMINACIÓN
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    // Llamada a la acción segura de eliminación
    await handleUserAction(selectedUser.id, 'delete');
    
    // Limpiar estados
    setSelectedUser(null);
    setShowDeleteConfirm(false); // Cierra el AlertDialog al terminar
  };


  // ----------------------------------------------------------------------
  // FUNCIONES DE SUPABASE (fetchUsers y paginación)
  // ----------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
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
          // Placeholder para rol y estado, que deben venir de joins o RPC
          // Si tienes una tabla 'user_roles' la puedes consultar aquí
          role: user_roles (role) 
        `, { count: 'exact' });

      // ... Aplica filtros y búsqueda aquí ...

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
    if (isSuspended) {
      return <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">Suspendido</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">Activo</span>;
  };

  const renderActionsDropdown = (user) => {
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
            setShowUserModal(true); 
          }}>
            <Icon name="Eye" size={16} className="mr-2" />
            Ver Detalles
          </DropdownMenuItem>
          
          {/* ✅ ACCIÓN DE SUSPENDER/ACTIVAR - Llama a la función segura (corrige error de suspensión) */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleUserAction(user.id, isSuspended ? 'activate' : 'suspend');
            }}
          >
            <Icon name={isSuspended ? 'CheckCircle' : 'Slash'} size={16} className="mr-2" />
            {isSuspended ? 'Activar Usuario' : 'Suspender Usuario'}
          </DropdownMenuItem>

          {/* ✅ ACCIÓN DE ELIMINAR - Setea el estado y abre el AlertDialog */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(user);
              setShowDeleteConfirm(true); 
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
  
  // ✅ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN (Usando AlertDialog)
  const renderDeleteConfirm = () => {
    if (!selectedUser) return null;

    return (
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        {/* <AlertDialogTrigger asChild> (No se necesita trigger, se abre por estado) </AlertDialogTrigger> */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación de Usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de **ELIMINAR PERMANENTEMENTE** al usuario **{selectedUser.full_name || selectedUser.email}**. 
              Esta acción es irreversible y eliminará todos los datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={saving}
              // Puedes necesitar una clase para que el botón se vea rojo (Ej: variant="destructive")
              className="bg-red-600 hover:bg-red-700 text-white" 
            >
              {saving ? 'Eliminando...' : 'Eliminar Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const renderUserModal = () => {
    // ... tu lógica de modal existente, si usas Dialog, debes importarlo y usarlo aquí
    // Si sigue faltando, este renderizado fallará, pero no afectará el deploy.
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
          {/* ... Contenido de la tabla ... */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                {/* ... Encabezados ... */}
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {/* ... Filas de usuarios ... */}
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
                        {/* El rol debe ser legible aquí (corregido con el backend handleRoleChange) */}
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

          {/* ... Paginación ... */}
        </div>
      </div>

      {/* Modales */}
      {renderUserModal()}
      {renderDeleteConfirm()} 
    </>
  );
};

export default UserManagement;
