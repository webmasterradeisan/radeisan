// src/pages/admin-shop/OrdersManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null); // Para ver detalles de envío
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, shipped, delivered

  // Cargar pedidos con datos de usuario y producto
  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('shop_orders')
        .select(`
          *,
          user:user_profiles(full_name, username, avatar_url),
          product:shop_products(title, image_url)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  // Cambiar estado del pedido (Ej: De Pendiente a Enviado)
  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('shop_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Actualizar localmente
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) setShowDetailModal(false);
    } catch (err) {
      alert('Error al actualizar estado');
      console.error(err);
    }
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  // Helpers visuales
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">Pendiente</span>;
      case 'shipped': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">Enviado</span>;
      case 'delivered': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Entregado</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-500">Administra los canjes de la tienda de puntos.</p>
        </div>
        
        {/* Filtros */}
        <div className="flex bg-white rounded-lg shadow-sm p-1 border border-gray-200">
          {['all', 'pending', 'shipped', 'delivered'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterStatus === status ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'shipped' ? 'Enviados' : 'Entregados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Pedidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Costo</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center">Cargando pedidos...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No hay pedidos con este estado.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={order.product?.image_url} alt="" className="w-10 h-10 rounded bg-gray-200 object-cover" />
                        <span className="font-medium text-gray-900">{order.product?.title || 'Producto eliminado'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.user?.full_name || 'Usuario'}</span>
                        <span className="text-xs text-gray-500">@{order.user?.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-orange-600 font-bold">
                      {order.points_paid} pts
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => openDetails(order)}>
                        Ver Detalles
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalles de Envío */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">Detalles del Envío</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="X" size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info Producto */}
              <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                 <img src={selectedOrder.product?.image_url} className="w-16 h-16 rounded object-cover" />
                 <div>
                    <p className="font-bold">{selectedOrder.product?.title}</p>
                    <p className="text-sm text-gray-500">ID Pedido: {selectedOrder.id.slice(0,8)}</p>
                 </div>
              </div>

              {/* Info Envío (JSON Parseado) */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Datos del Cliente</h4>
                <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <span className="block text-blue-800 font-bold mb-1">Dirección:</span>
                        {selectedOrder.shipping_info?.address}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <span className="block text-gray-600 font-bold mb-1">Ciudad:</span>
                            {selectedOrder.shipping_info?.city}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <span className="block text-gray-600 font-bold mb-1">Teléfono:</span>
                            {selectedOrder.shipping_info?.phone}
                        </div>
                    </div>
                    {selectedOrder.shipping_info?.notes && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                            <span className="block text-yellow-800 font-bold mb-1">Notas:</span>
                            {selectedOrder.shipping_info.notes}
                        </div>
                    )}
                </div>
              </div>

              {/* Acciones de Estado */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-500 mb-3">Cambiar Estado:</p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => updateStatus(selectedOrder.id, 'pending')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border ${selectedOrder.status === 'pending' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        Pendiente
                    </button>
                    <button 
                        onClick={() => updateStatus(selectedOrder.id, 'shipped')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border ${selectedOrder.status === 'shipped' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        Enviado
                    </button>
                    <button 
                        onClick={() => updateStatus(selectedOrder.id, 'delivered')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border ${selectedOrder.status === 'delivered' ? 'bg-green-100 border-green-300 text-green-800' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        Entregado
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
