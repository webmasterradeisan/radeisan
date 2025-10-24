// src/hooks/useAdminRole.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * Hook personalizado para gestionar roles y permisos de administrador
 * 
 * @returns {Object} Objeto con información del rol y funciones de utilidad
 * - isAdmin: boolean - Si el usuario tiene algún rol de admin
 * - adminRole: object | null - Información completa del rol (tipo, permisos, etc.)
 * - loading: boolean - Estado de carga
 * - error: string | null - Error si ocurre
 * - permissions: object - Permisos específicos del rol
 * - canAccess: function - Función para verificar permisos específicos
 * - refreshRole: function - Refrescar permisos manualmente
 */
export const useAdminRole = () => {
  const { user } = useAuth();
  const [adminRole, setAdminRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================
  // VERIFICAR ROL DE ADMIN EN LA BASE DE DATOS
  // ============================================
  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setAdminRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Consultar la tabla admin_roles
      const { data, error: fetchError } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No se encontró rol de admin (usuario normal)
          setAdminRole(null);
        } else {
          throw fetchError;
        }
      } else {
        setAdminRole(data);
      }
    } catch (err) {
      console.error('Error al verificar rol de admin:', err);
      setError(err.message);
      setAdminRole(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ============================================
  // EFECTO PARA CARGAR ROL AL MONTAR/CAMBIAR USUARIO
  // ============================================
  useEffect(() => {
    checkAdminRole();
  }, [checkAdminRole]);

  // ============================================
  // FUNCIÓN PARA REFRESCAR PERMISOS MANUALMENTE
  // ============================================
  const refreshRole = useCallback(() => {
    checkAdminRole();
  }, [checkAdminRole]);

  // ============================================
  // OBTENER PERMISOS ESPECÍFICOS DEL ROL
  // ============================================
  const permissions = adminRole?.permissions || {};

  // ============================================
  // VERIFICAR SI EL USUARIO TIENE UN PERMISO ESPECÍFICO
  // ============================================
  const canAccess = useCallback((permission) => {
    if (!adminRole) return false;
    
    // Super admin tiene todos los permisos
    if (adminRole.role_type === 'super_admin') return true;
    
    // Verificar permiso específico en el objeto de permisos
    return permissions[permission] === true;
  }, [adminRole, permissions]);

  // ============================================
  // VERIFICAR SI ES UN TIPO DE ROL ESPECÍFICO
  // ============================================
  const isRoleType = useCallback((roleType) => {
    return adminRole?.role_type === roleType;
  }, [adminRole]);

  // ============================================
  // VERIFICAR PERMISOS POR CATEGORÍA
  // ============================================
  const canManageUsers = canAccess('manage_users');
  const canManageContent = canAccess('manage_content');
  const canManageCategories = canAccess('manage_categories');
  const canManagePoints = canAccess('manage_points');
  const canManageMissions = canAccess('manage_missions');
  const canManageRewards = canAccess('manage_rewards');
  const canManageSettings = canAccess('manage_settings');
  const canViewAnalytics = canAccess('view_analytics');
  const canViewLogs = canAccess('view_logs');
  const canModerateContent = canAccess('moderate_content');

  // ============================================
  // RETORNAR OBJETO CON TODA LA INFORMACIÓN
  // ============================================
  return {
    // Estado básico
    isAdmin: !!adminRole,
    adminRole,
    loading,
    error,
    
    // Información del rol
    roleType: adminRole?.role_type || null,
    roleName: adminRole?.role_name || null,
    permissions,
    
    // Funciones de utilidad
    canAccess,
    isRoleType,
    refreshRole,
    
    // Permisos específicos (shortcuts)
    isSuperAdmin: isRoleType('super_admin'),
    isAdmin: isRoleType('admin'),
    isModerator: isRoleType('moderator'),
    isEditor: isRoleType('editor'),
    
    // Permisos por categoría
    canManageUsers,
    canManageContent,
    canManageCategories,
    canManagePoints,
    canManageMissions,
    canManageRewards,
    canManageSettings,
    canViewAnalytics,
    canViewLogs,
    canModerateContent,
  };
};

// ============================================
// MAPEO DE PERMISOS POR ROL (Referencia)
// ============================================
export const ROLE_PERMISSIONS = {
  super_admin: {
    manage_users: true,
    manage_content: true,
    manage_categories: true,
    manage_points: true,
    manage_missions: true,
    manage_rewards: true,
    manage_settings: true,
    view_analytics: true,
    view_logs: true,
    moderate_content: true,
  },
  admin: {
    manage_users: true,
    manage_content: true,
    manage_categories: true,
    manage_points: true,
    manage_missions: true,
    manage_rewards: true,
    manage_settings: false,
    view_analytics: true,
    view_logs: true,
    moderate_content: true,
  },
  moderator: {
    manage_users: false,
    manage_content: true,
    manage_categories: false,
    manage_points: false,
    manage_missions: false,
    manage_rewards: false,
    manage_settings: false,
    view_analytics: true,
    view_logs: false,
    moderate_content: true,
  },
  editor: {
    manage_users: false,
    manage_content: true,
    manage_categories: false,
    manage_points: false,
    manage_missions: false,
    manage_rewards: false,
    manage_settings: false,
    view_analytics: false,
    view_logs: false,
    moderate_content: false,
  },
};

export default useAdminRole;
