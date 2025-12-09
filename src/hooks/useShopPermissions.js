// src/hooks/useShopPermissions.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useShopPermissions = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role_name, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      setUserRole(roleData?.role_name || null);
      setLoading(false);
    } catch (error) {
      console.error('Error checking role:', error);
      setLoading(false);
    }
  };

  return {
    userRole,
    loading,
    // ✅ Verifica si es admin o super_admin
    isAdmin: () => userRole === 'admin' || userRole === 'super_admin',
    isShopManager: () => userRole === 'shop_manager',
    // ✅ SOLO shop_manager ve "Gestionar Tienda" (admin accede desde /admin)
    canManageShop: () => userRole === 'shop_manager'
  };
};
