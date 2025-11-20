// src/pages/user-profile-settings/components/UserOrdersTab.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';

const UserOrdersTab = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Traemos el pedido y los datos del producto asociado
        const { data, error } = await supabase
          .from('shop_orders')
          .select(`
            id,
            created_at,
            points_paid,
            status,
            shipping_info,
            product:shop_products (
              title,
              image_url,
              description
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error cargando compras:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // OPCIONAL: Suscripción en Tiempo Real para ver cambios de estado al instante
    const subscription = supabase
      .channel('my-orders')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'shop_orders',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Actualizar el estado localmente si cambia en la BD
        setOrders(current => current.map(order => 
          order.id === payload.new.id ? { ...order, status: payload.new.status } : order
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pendiente', icon: 'Clock' },
      shipped: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Enviado', icon: 'Truck' },
      delivered: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Entregado', icon: 'CheckCircle' },
      cancelled: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Cancelado', icon: 'XCircle' },
    };
    
    const style = config[status] || config['pending'];
    
    return (
      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${style.color}`}>
        <Icon name={style.icon} size={12} />
        {style.label}
      </span>
    );
  };

  if (loading) {
    return <div className="py-10 text-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-xl border border-dashed">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon name="ShoppingBag" size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Aún no has hecho canjes</h3>
        <p className="text-sm text-muted-foreground mb-4">Visita la tienda y usa tus puntos.</p>
        <a href="/shop" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
          Ir a la Tienda
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
          {/* Imagen Producto */}
          <div className="w-full sm:w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
            <img 
              src={order.product?.image_url || '/placeholder.jpg'} 
              alt={order.product?.title} 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-lg line-clamp-1">{order.product?.title || 'Producto no disponible'}</h4>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pedido el {new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
               <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Dirección:</span> {order.shipping_info?.address}, {order.shipping_info?.city}
               </div>
               <div className="flex items-center gap-1 text-orange-500 font-mono font-bold">
                  <Icon name="Star" size={14} className="fill-current" />
                  -{order.points_paid}
               </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserOrdersTab;
