// src/contexts/GiftNotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Creamos el contexto con un nombre único
const GiftNotificationContext = createContext();

// Hook personalizado con nombre único
export const useGiftNotifications = () => useContext(GiftNotificationContext);

export const GiftNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [giftNotifications, setGiftNotifications] = useState([]);
  const [unreadGiftCount, setUnreadGiftCount] = useState(0);
  
  // Estado para el Modal Sorpresa (Pop-up)
  const [latestGift, setLatestGift] = useState(null); 

  useEffect(() => {
    if (!user) {
      setGiftNotifications([]);
      setUnreadGiftCount(0);
      return;
    }

    // 1. Cargar notificaciones de regalos existentes
    const fetchGiftNotifications = async () => {
      // Filtramos por tipo 'gift_received' para no mezclar con otras notificaciones
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'gift_received') 
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setGiftNotifications(data);
        setUnreadGiftCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchGiftNotifications();

    // 2. Suscribirse a NUEVOS regalos en tiempo real
    const subscription = supabase
      .channel('public:gift_notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        }, 
        (payload) => {
          const newNotif = payload.new;
          
          // Solo nos interesan los regalos aquí
          if (newNotif.type === 'gift_received') {
            setGiftNotifications(prev => [newNotif, ...prev]);
            setUnreadGiftCount(prev => prev + 1);
            setLatestGift(newNotif); // Activar Modal Sorpresa
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Marcar regalo como visto
  const markGiftAsRead = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setGiftNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadGiftCount(prev => Math.max(0, prev - 1));
    }
  };

  // Marcar todos los regalos como vistos
  const markAllGiftsAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('type', 'gift_received')
      .eq('is_read', false);

    if (!error) {
      setGiftNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadGiftCount(0);
    }
  };

  // Cerrar el modal sorpresa
  const closeGiftModal = () => {
    if (latestGift) {
      markGiftAsRead(latestGift.id); 
      setLatestGift(null);
    }
  };

  return (
    <GiftNotificationContext.Provider value={{ 
      giftNotifications, 
      unreadGiftCount, 
      latestGift, 
      markGiftAsRead, 
      markAllGiftsAsRead, 
      closeGiftModal 
    }}>
      {children}
    </GiftNotificationContext.Provider>
  );
};
