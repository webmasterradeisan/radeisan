// src/pages/admin-users/UserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';

// --- COMPONENTES UI (Tu sistema de diseño) ---
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox'; // Importación correcta
import UserContextMenu from '../../components/ui/UserContextMenu';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

// --- ICONOS ---
import Icon from '../../components/AppIcon'; 

const UserManagement = () => {
  // --- ESTADOS ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Modales
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estado para acciones de servidor
  const [saving, setSaving] = useState(false);

  // Filtros y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 20;

  // --- 1. CARGA DE DATOS (Recuperando la lógica que SÍ funciona) ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // ⚠️ VOLVEMOS A LA CONSULTA SIMPLE para asegurar que carguen los datos.
      // Si la relación con admin_roles falla, esto no devolverá nada, así que mejor consultamos solo el perfil.
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });

      // Filtro de búsqueda
      if (searchTerm) {
        query = query.ilike('email', `%${searchTerm}%`);
      }
      
      // Paginación
      const from = (currentPage - 1) * usersPerPage;
      const { data, count, error } = await query
        .range(from, from + usersPerPage - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapeo seguro de datos
      const mappedUsers = data.map(user => ({
        ...user,
        // Si no tienes columna de rol en user_profiles, asignamos 'user' por defecto para que no falle.
        role: user.role || 'user', 
        // Si no tienes columna status, asumimos 'active'.
        status: user.status || 'active'
      }));

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


  // --- 2. ACCIONES DEL SERVIDOR (Seguridad) ---
  const handleUserAction = async (userId, action, value = null) => {
    setSaving(true);
    try {
      // Llamada a tu Backend seguro
      const response = await fetch('/api/admin/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el servidor');
      }
      
      const result = await response.json();
      
      // Actualización local de la UI (Optimista)
      if (action === 'delete') {
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else if (action === 'change_role') {
         setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: value } : u));
         if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, role: value }));
      } else if (action === 'suspend' || action === 'activate') {
         const newStatus = action === 'suspend' ? 'suspended' : 'active';
         setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      }
      
      alert(result.message || 'Acción exitosa');

    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Paginación
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalUsers / usersPerPage)));
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const totalPages = Math.ceil(totalUsers / usersPerPage);


  // --- 3. RENDERIZADO DE MODALES (Usando tus nuevos componentes) ---
  
  // Modal para confirmar eliminación
  const renderDeleteModal = () => (
    <Modal
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      title="Confirmar Eliminación"
      footer={
        <>
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
          <Button 
            variant="danger" 
            onClick={() => handleUserAction(selectedUser.id, 'delete')} 
            disabled={saving}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {saving ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </>
      }
    >
      <div className="text-gray-600">
        <p className="mb-2">¿Estás seguro que deseas eliminar a <strong>{selectedUser?.email}</strong>?</p>
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">
            ⚠️ Esta acción borrará todos los datos del usuario y no se puede deshacer.
        </p>
      </div>
    </Modal>
  );

  // Modal de detalles y edición
  const renderDetailsModal = () => (
    <Modal
      isOpen={showDetailsModal}
      onClose={() => setShowDetailsModal(false)}
      title="Editar Usuario"
      footer={<Button onClick={() => setShowDetailsModal(false)}>Cerrar</Button>}
    >
      {selectedUser && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <Input value={selectedUser.email} readOnly disabled className="bg-gray-100" />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rol</label>
            <Select
              value={selectedUser.role}
              onChange={(e) => handleUserAction(selectedUser.id, 'change_role', e.target.value)}
              options={[
                { value: 'user', label: 'Usuario' },
                { value: 'premium', label: 'Premium' },
                { value: 'admin', label: 'Administrador' }
              ]}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t mt-4">
             <Checkbox checked={selectedUser.is_verified} disabled />
             <span className="text-sm text-gray-700">Verificado</span>
          </div>
        </div>
      )}
    </Modal>
  );

  return (
    <>
      <Helmet><title>Usuarios | Admin</title></Helmet>
      
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Gestión de Usuarios</h1>

        {/* Barra de Búsqueda */}
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
                <Icon name="RefreshCw" size={16} className="mr-2" /> Actualizar
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verif.</th>
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
                        <div className="text-sm font-medium text-gray-900">{user.full_name || 'Sin Nombre'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
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
                        {/* Menú de Acciones usando tu componente existente */}
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

      {renderDetailsModal()}
      {renderDeleteModal()}
    </>
  );
};

export default UserManagement;
