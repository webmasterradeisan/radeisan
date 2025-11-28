// src/pages/admin-users/UserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';

// --- 1. COMPONENTES UI EXISTENTES ---
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox'; 
import UserContextMenu from '../../components/ui/UserContextMenu';

// --- 2. COMPONENTES NUEVOS (Recién creados) ---
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

// --- 3. ICONOS ---
import Icon from '../../components/AppIcon'; 

const UserManagement = () => {
  // --- ESTADOS ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Interfaz (Modales y Selección)
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtros y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 20;

  // --- LÓGICA DE BACKEND (API SEGURA) ---
  
  const handleUserAction = async (userId, action, value = null) => {
    setSaving(true);
    try {
      // Llamada al endpoint seguro (Edge Function)
      const response = await fetch('/api/admin/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la operación del servidor');
      }
      
      const result = await response.json();
      
      // Actualización optimista de la UI (Feedback inmediato)
      if (action === 'delete') {
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else if (action === 'change_role') {
         setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: value } : u));
         // Actualizamos también el usuario seleccionado para que el modal refleje el cambio
         if (selectedUser?.id === userId) {
            setSelectedUser(prev => ({ ...prev, role: value }));
         }
      } else if (action === 'suspend' || action === 'activate') {
         const newStatus = action === 'suspend' ? 'suspended' : 'active';
         setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      }
      
      alert(result.message || 'Acción completada exitosamente');

    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- CARGA DE DATOS ---

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Consulta a user_profiles con join a admin_roles (si aplica)
      let query = supabase
        .from('user_profiles')
        .select(`
            *,
            admin_roles ( role )
        `, { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('email', `%${searchTerm}%`);
      }
      
      const from = (currentPage - 1) * usersPerPage;
      const { data, count, error } = await query
        .range(from, from + usersPerPage - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapeo de datos para aplanar la estructura
      const mappedUsers = data.map(user => {
        let userRole = 'user';
        // Lógica defensiva para extraer el rol desde la relación
        if (user.admin_roles) {
            if (Array.isArray(user.admin_roles) && user.admin_roles.length > 0) userRole = user.admin_roles[0].role;
            else if (typeof user.admin_roles === 'object') userRole = user.admin_roles.role;
        }

        return {
            ...user,
            role: userRole || 'user',
            status: user.status || 'active' 
        };
      });

      setUsers(mappedUsers);
      setTotalUsers(count || 0);
    } catch (error) {
      console.error('Error cargando usuarios:', error.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Manejadores de Paginación
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalUsers / usersPerPage)));
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  // --- RENDERIZADO DE MODALES ---

  const renderDeleteModal = () => (
    <Modal
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      title="Confirmar Eliminación"
      footer={
        <>
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
          <Button 
            variant="danger" // Asegúrate de que tu Button soporte esta variante, si no, usa style manual
            onClick={() => handleUserAction(selectedUser.id, 'delete')} 
            disabled={saving}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {saving ? 'Eliminando...' : 'Eliminar Permanentemente'}
          </Button>
        </>
      }
    >
      <div className="text-gray-600">
        <p className="mb-2">¿Estás seguro que deseas eliminar al usuario <strong>{selectedUser?.email}</strong>?</p>
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">
            ⚠️ Esta acción es irreversible y eliminará todos los datos, puntos y fotos asociados.
        </p>
      </div>
    </Modal>
  );

  const renderDetailsModal = () => (
    <Modal
      isOpen={showDetailsModal}
      onClose={() => setShowDetailsModal(false)}
      title="Detalles del Usuario"
      footer={
        <Button onClick={() => setShowDetailsModal(false)}>Cerrar</Button>
      }
    >
      {selectedUser && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <Input value={selectedUser.email} readOnly disabled className="bg-gray-100" />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rol del Sistema</label>
            <Select
              value={selectedUser.role}
              onChange={(e) => handleUserAction(selectedUser.id, 'change_role', e.target.value)}
              options={[
                { value: 'user', label: 'Usuario Estándar' },
                { value: 'premium', label: 'Usuario Premium' },
                { value: 'admin', label: 'Administrador' }
              ]}
            />
            <p className="text-xs text-gray-500 mt-1">
                Cambiar el rol actualizará los permisos inmediatamente.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t mt-4">
             <Checkbox checked={selectedUser.is_verified} disabled />
             <span className="text-sm text-gray-700">Cuenta Verificada</span>
          </div>
        </div>
      )}
    </Modal>
  );

  return (
    <>
      <Helmet><title>Gestión de Usuarios - Admin</title></Helmet>
      
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Gestión de Usuarios</h1>

        {/* Barra de Herramientas */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/3 relative">
                <Input 
                    placeholder="Buscar por email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
                <Icon name="Search" size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <Button onClick={fetchUsers} variant="outline" size="sm">
                <Icon name="RefreshCw" size={16} className="mr-2" /> Actualizar Lista
            </Button>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verificado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-500">Cargando usuarios...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-500">No se encontraron usuarios.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.full_name || 'Sin Nombre'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.role === 'admin' ? 'info' : (user.role === 'premium' ? 'warning' : 'default')}>
                            {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.status === 'suspended' ? 'danger' : 'success'}>
                            {user.status === 'suspended' ? 'Suspendido' : 'Activo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_verified 
                            ? <Icon name="Check" className="text-green-500" size={18} /> 
                            : <Icon name="X" className="text-gray-300" size={18} />
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <UserContextMenu 
                            user={user}
                            onEdit={() => { setSelectedUser(user); setShowDetailsModal(true); }}
                            onSuspend={() => handleUserAction(user.id, user.status === 'suspended' ? 'activate' : 'suspend')}
                            onDelete={() => { setSelectedUser(user); setShowDeleteConfirm(true); }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                  <Icon name="ChevronLeft" size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                  <Icon name="ChevronRight" size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Renderizado de Modales */}
      {renderDetailsModal()}
      {renderDeleteModal()}
    </>
  );
};

export default UserManagement;
