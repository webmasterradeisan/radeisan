// useAdminRole.js - Hook para gestión de roles y permisos de admin
// Ruta: src/hooks/useAdminRole.js

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================
// CONFIGURACIÓN DE ROLES Y PERMISOS
// ============================================

const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  editor: 1,
  user: 0
};

const ROLE_NAMES = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  moderator: 'Moderador',
  editor: 'Editor',
  user: 'Usuario'
};

const PERMISSIONS = {
  // Gestión de usuarios
  manage_users: ['super_admin', 'admin'],
  view_users: ['super_admin', 'admin', 'moderator'],
  ban_users: ['super_admin', 'admin'],
  
  // Gestión de contenido
  manage_content: ['super_admin', 'admin', 'moderator'],
  delete_content: ['super_admin', 'admin'],
  moderate_content: ['super_admin', 'admin', 'moderator'],
  
  // Gestión de categorías
  manage_categories: ['super_admin', 'admin'],
  
  // Sistema de puntos y recompensas
  manage_points: ['super_admin', 'admin'],
  manage_rewards: ['super_admin', 'admin'],
  
  // Analytics y reportes
  view_analytics: ['super_admin', 'admin', 'moderator'],
  export_data: ['super_admin', 'admin'],
  
  // Configuración del sistema
  manage_settings: ['super_admin', 'admin'],
  manage_branding: ['super_admin', 'admin'],
  
  // Moderación
  view_reports: ['super_admin', 'admin', 'moderator'],
  resolve_reports: ['super_admin', 'admin', 'moderator']
};

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook personalizado para gestionar roles y permisos de administrador
 * @returns {Object} - Información de rol y funciones de verificación
 */
export const useAdminRole = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    // Verificación de permisos
    const checkPermissions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verificar que el usuario existe
        if (!user) {
          setLoading(false);
          return;
        }

        // Verificar que tiene el campo role
        if (!user.role) {
          console.warn('Usuario sin rol asignado, asignando rol "user" por defecto');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking permissions:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    checkPermissions();
  }, [user]);

  // ============================================
  // VALORES COMPUTADOS
  // ============================================

  const roleType = useMemo(() => {
    // Primero intenta obtener de admin_role (relación con admin_roles)
    if (user?.admin_role?.role_name) {
      return user.admin_role.role_name;
    }
    // Fallback a user.role si existe
    if (user?.role) {
      return user.role;
    }
    // Default a 'user'
    return 'user';
  }, [user]);

  const roleName = useMemo(() => {
    return ROLE_NAMES[roleType] || 'Usuario';
  }, [roleType]);

  const roleLevel = useMemo(() => {
    return ROLE_HIERARCHY[roleType] || 0;
  }, [roleType]);

  const permissions = useMemo(() => {
    const perms = user?.admin_role?.permissions || user?.permissions || [];
    // Convertir array a objeto para compatibilidad
    if (Array.isArray(perms)) {
      // Si contiene "all", retornar objeto con todos los permisos en true
      if (perms.includes('all')) {
        return Object.keys(PERMISSIONS).reduce((acc, perm) => {
          acc[perm] = true;
          return acc;
        }, {});
      }
      // Convertir array a objeto
      return perms.reduce((acc, perm) => {
        acc[perm] = true;
        return acc;
      }, {});
    }
    return perms;
  }, [user]);

  const isActive = useMemo(() => {
    // Verificar que el rol esté activo
    return user?.admin_role?.is_active !== false;
  }, [user]);

  const isAdmin = useMemo(() => {
    const hasAdminRole = ['super_admin', 'admin', 'moderator'].includes(roleType);
    return hasAdminRole && isActive;
  }, [roleType, isActive]);

  const isSuperAdmin = useMemo(() => {
    return roleType === 'super_admin';
  }, [roleType]);

  const isModerator = useMemo(() => {
    return roleType === 'moderator';
  }, [roleType]);

  // ============================================
  // FUNCIONES DE VERIFICACIÓN
  // ============================================

  /**
   * Verificar si el usuario tiene un permiso específico
   * @param {string} permission - Nombre del permiso
   * @returns {boolean}
   */
  const canAccess = (permission) => {
    if (!permission || !user || !isActive) return false;
    
    // Verificar si el rol está activo
    if (!isActive) return false;
    
    // Si tiene permisos ["all"], puede acceder a todo
    const rawPermissions = user?.admin_role?.permissions || user?.permissions || [];
    if (Array.isArray(rawPermissions) && rawPermissions.includes('all')) {
      return true;
    }
    
    // Verificar si el permiso está en los permisos procesados
    if (permissions && typeof permissions === 'object') {
      const hasPermission = permissions[permission];
      if (hasPermission !== undefined) {
        return hasPermission === true;
      }
    }
    
    // Fallback: verificar por rol
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) {
      console.warn(`Permiso desconocido: ${permission}`);
      return false;
    }
    
    return allowedRoles.includes(roleType);
  };

  /**
   * Verificar si el usuario es de un tipo de rol específico
   * @param {string} role - Tipo de rol
   * @returns {boolean}
   */
  const isRoleType = (role) => {
    return roleType === role;
  };

  /**
   * Verificar si el usuario tiene un nivel de rol igual o superior
   * @param {string} minimumRole - Rol mínimo requerido
   * @returns {boolean}
   */
  const hasMinimumRole = (minimumRole) => {
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
    return roleLevel >= requiredLevel;
  };

  /**
   * Obtener lista de todos los permisos del usuario
   * @returns {Array<string>}
   */
  const getUserPermissions = () => {
    return Object.entries(PERMISSIONS)
      .filter(([_, allowedRoles]) => allowedRoles.includes(roleType))
      .map(([permission]) => permission);
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    // Información del rol
    roleType,
    roleName,
    roleLevel,
    permissions,
    isActive,
    
    // Estados booleanos
    isAdmin,
    isSuperAdmin,
    isModerator,
    
    // Estados de carga
    loading,
    error,
    
    // Funciones de verificación
    canAccess,
    isRoleType,
    hasMinimumRole,
    getUserPermissions,
    
    // Datos raw del usuario
    user
  };
};

export default useAdminRole;
