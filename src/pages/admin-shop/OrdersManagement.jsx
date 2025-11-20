// src/pages/admin-shop/OrdersManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null); // Estado para ver errores en pantalla
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Cargar pedidos
  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // NOTA: Esta consulta requiere que shop_orders.user_id tenga Foreign Key a user_profiles
      let query = supabase
        .from('shop_orders')
        .select(`
          id, created_at, points_paid, status, shipping_info,
          user:user_profiles!user_id (full_name, username, avatar_url, email),
          product:shop_products!product_id (title, image_url)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
          console.error("Error detallado de Supabase:", error);
          throw error;
      }
      
      setOrders(data || []);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
      setErrorMsg(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  // Actualizar estado
  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('shop_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert('Error al actualizar estado');
    }
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
        pending: "bg-yellow-100 text-yellow-800",
        shipped: "bg-blue-100 text-blue-800",
        delivered: "bg-green-100 text-green-800"
    };
    const labels = {
        pending: "Pendiente",
        shipped: "Enviado",
        delivered: "Entregado"
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || "bg-gray-100"}`}>
            {labels[status] || status}
        </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-500">Administra los envíos de la tienda.</p>
        </div>
        
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
      
      {/* MENSAJE DE ERROR SI FALLA LA CARGA */}
      {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4 flex items-center gap-2">
              <Icon name="AlertTriangle" />
              <span>Error: {errorMsg}. Revisa la consola (F12) para más detalles.</span>
          </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Costo</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center"><Icon name="Loader" className="animate-spin inline mr-2"/> Cargando...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No hay pedidos registrados.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden">
                            {order.product?.image_url && <img src={order.product.image_url} className="w-full h-full object-cover" alt="" />}
                        </div>
                        <span className="font-medium text-gray-900">{order.product?.title || '(Producto Borrado)'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.user?.full_name || 'Usuario Desconocido'}</span>
                        <span className="text-xs text-gray-500">{order.user?.email || order.user?.username}</span>
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
                        Detalles
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALLES */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">Detalles del Pedido</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600"><Icon name="X" size={24} /></button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Producto */}
              <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                 {selectedOrder.product?.image_url && <img src={selectedOrder.product.image_url} className="w-16 h-16 rounded object-cover" alt="" />}
                 <div>
                    <p className="font-bold">{selectedOrder.product?.title}</p>
                    <p className="text-sm text-gray-500">ID: {selectedOrder.id.slice(0,8)}</p>
                 </div>
              </div>

              {/* Datos de Envío */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Datos de Envío</h4>
                <div className="text-sm space-y-2">
                    <div className="p-2 bg-blue-50 rounded border border-blue-100">
                        <span className="font-bold text-blue-800">Dirección:</span> {selectedOrder.shipping_info?.address}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-gray-50 rounded border">
                            <span className="font-bold text-gray-700">Ciudad:</span> {selectedOrder.shipping_info?.city}
                        </div>
                        <div className="p-2 bg-gray-50 rounded border">
                            <span className="font-bold text-gray-700">Teléfono:</span> {selectedOrder.shipping_info?.phone}
                        </div>
                    </div>
                    {selectedOrder.shipping_info?.notes && (
                        <div className="p-2 bg-yellow-50 rounded border border-yellow-100 text-yellow-800">
                            <span className="font-bold">Notas:</span> {selectedOrder.shipping_info.notes}
                        </div>
                    )}
                </div>
              </div>

              {/* Acciones */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-500 mb-2">Cambiar Estado:</p>
                <div className="flex gap-2">
                    <button onClick={() => updateStatus(selectedOrder.id, 'pending')} className={`flex-1 py-2 rounded text-sm font-medium border ${selectedOrder.status === 'pending' ? 'bg-yellow-100 border-yellow-300' : 'hover:bg-gray-50'}`}>Pendiente</button>
                    <button onClick={() => updateStatus(selectedOrder.id, 'shipped')} className={`flex-1 py-2 rounded text-sm font-medium border ${selectedOrder.status === 'shipped' ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}`}>Enviado</button>
                    <button onClick={() => updateStatus(selectedOrder.id, 'delivered')} className={`flex-1 py-2 rounded text-sm font-medium border ${selectedOrder.status === 'delivered' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}>Entregado</button>
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
