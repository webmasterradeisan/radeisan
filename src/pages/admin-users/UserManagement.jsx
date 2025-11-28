// src/pages/admin-users/UserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';

// --- COMPONENTES UI EXISTENTES ---
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox'; 
import UserContextMenu from '../../components/ui/UserContextMenu';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Icon from '../../components/AppIcon'; 

const UserManagement = () => {
  // --- ESTADOS ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estado de carga para acciones
  const [saving, setSaving] = useState(false);

  // Filtros y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 20;

  // --- 1. CARGA DE DATOS (Sincronizado con user_profiles) ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ CONSULTA SEGURA: Traemos solo lo que existe en user_profiles
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('email', `%${searchTerm}%`);
      }
      
      const from = (currentPage - 1) * usersPerPage;
      const { data, count, error } = await query
        .range(from, from + usersPerPage - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // ✅ MAPEO DEFENSIVO: Si la columna no está en el CSV, ponemos un valor por defecto
      // para que la tabla no se rompa visualmente.
      const mappedUsers = data.map(user => ({
        ...user,
        // Si tu tabla user_profiles no tiene 'role', asumimos 'user' visualmente
        role: user.role || 'user', 
        // Si tu tabla user_profiles no tiene 'status' (o suspended), asumimos 'active'
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


  // --- 2. ACCIONES (Suspender, Eliminar, Rol) ---
  
  const handleUserAction = async (userId, action, value = null) => {
    setSaving(true);
    try {
      // ⚠️ IMPORTANTE: Aquí se llama a tu Backend para evitar el error de permisos.
      // Si no tienes el backend listo, esto dará error, pero la lógica del Frontend es correcta.
      const response = await fetch('/api/admin/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      });

      if (!response.ok) {
        // Si falla la API, lanzamos error
        throw new Error('Error al conectar con el servidor de administración');
      }
      
      const result = await response.json();
      
      // ✅ ACTUALIZACIÓN OPTIMISTA (Para que la UI cambie inmediatamente)
      if (action === 'delete') {
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else if (action === 'change_role') {
         // Corregimos el rol visualmente en la tabla y en el modal
         const newRole = value; 
         setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
         if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, role: newRole }));
      } else if (action === 'suspend' || action === 'activate') {
         const newStatus = action === 'suspend' ? 'suspended' : 'active';
         setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      }
      
      alert(result.message || 'Acción realizada correctamente');

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


  // --- 3. MODALES Y RENDERIZADO ---

  // Modal de Detalles (Corregido el error de cambio de rol)
  const renderDetailsModal = () => (
    <Modal
      isOpen={showDetailsModal}
      onClose={() => setShowDetailsModal(false)}
      title="Detalles y Edición"
      footer={<Button onClick={() => setShowDetailsModal(false)}>Cerrar</Button>}
    >
      {selectedUser && (
        <div className="space-y-4">
          {/* Info Básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                <p className="text-sm font-medium">{selectedUser.full_name || 'N/A'}</p>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Puntos</label>
                <p className="text-sm font-medium">{selectedUser.points || 0}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <Input value={selectedUser.email} readOnly disabled className="bg-gray-100" />
          </div>
          
          {/* ✅ SELECT DE ROL CORREGIDO: Asegura enviar el valor simple */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rol del Sistema</label>
            <Select
              value={selectedUser.role} 
              onChange={(e) => handleUserAction(selectedUser.id, 'change_role', e.target.value)}
              options={[
                { value: 'user', label: 'Usuario Estándar' },
                { value: 'premium', label: 'Premium' },
                { value: 'admin', label: 'Administrador' }
              ]}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t mt-4">
             <Checkbox checked={selectedUser.is_verified} disabled />
             <span className="text-sm text-gray-700">Cuenta Verificada</span>
          </div>
        </div>
      )}
    </Modal>
  );

  // Modal de Eliminar (Nuevo requerimiento)
  const renderDeleteModal = () => (
    <Modal
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      title="Confirmar Eliminación"
      footer={
        <>
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
          <Button 
            onClick={() => handleUserAction(selectedUser.id, 'delete')} 
            disabled={saving}
            // Estilo manual rojo si tu componente Button no soporta 'danger'
            className="bg-red-600 text-white hover:bg-red-700 border-red-600"
          >
            {saving ? 'Eliminando...' : 'Eliminar Usuario'}
          </Button>
        </>
      }
    >
      <div className="text-gray-600">
        <p className="mb-2">¿Estás seguro que deseas eliminar a <strong>{selectedUser?.email}</strong>?</p>
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100 mt-2">
            ⚠️ Se borrará el perfil, puntos y datos de autenticación permanentemente.
        </p>
      </div>
    </Modal>
  );

  return (
    <>
      <Helmet><title>Gestión de Usuarios | Admin</title></Helmet>
      
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Gestión de Usuarios</h1>

        {/* Buscador */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/3 relative">
                <Input 
                    placeholder="Buscar por email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Icon name="Search" size={18} />
                </div>
            </div>
            <Button onClick={fetchUsers} variant="outline" size="sm">
                <Icon name="RefreshCw" size={16} className="mr-2" /> Actualizar
            </Button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puntos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verif.</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">Cargando usuarios...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No se encontraron usuarios.</td></tr>
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
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.points || 0} pts
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
                        {/* ✅ CONTEXT MENU: Conecta las acciones solicitadas */}
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
