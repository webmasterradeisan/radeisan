// src/contexts/NotificationContext.jsx
// ============================================================================
// NOTIFICATION CONTEXT - GESTIÓN GLOBAL DEL SISTEMA DE NOTIFICACIONES
// ============================================================================
// ✅ PATRÓN: Sigue la misma arquitectura que PointsContext.jsx
// ✅ CENTRALIZADO: Una sola fuente de verdad para todas las notificaciones
// ✅ REUTILIZABLE: Se puede usar desde cualquier componente
// ✅ FLEXIBLE: Soporta múltiples tipos y posiciones
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe ser usado dentro de un NotificationProvider');
  }
  return context;
};

// ============================================================================
// TIPOS DE NOTIFICACIONES
// ============================================================================
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',    // Verde - Acciones exitosas
  ERROR: 'error',        // Rojo - Errores
  WARNING: 'warning',    // Amarillo - Advertencias
  INFO: 'info',          // Azul - Información general
  POINTS: 'points'       // Dorado - Puntos ganados
};

// ============================================================================
// POSICIONES DE NOTIFICACIONES
// ============================================================================
export const NOTIFICATION_POSITIONS = {
  TOP_RIGHT: 'top-right',       // Esquina superior derecha (default)
  TOP_LEFT: 'top-left',         // Esquina superior izquierda
  TOP_CENTER: 'top-center',     // Centro superior
  BOTTOM_RIGHT: 'bottom-right', // Esquina inferior derecha
  BOTTOM_LEFT: 'bottom-left',   // Esquina inferior izquierda
  BOTTOM_CENTER: 'bottom-center', // Centro inferior
  CENTER: 'center'              // Centro de la pantalla
};

// ============================================================================
// PROVEEDOR DEL CONTEXTO
// ============================================================================
export const NotificationProvider = ({ children }) => {
  // Estado central de notificaciones (array de notificaciones activas)
  const [notifications, setNotifications] = useState([]);
  
  // Referencia para evitar memory leaks (igual que PointsContext)
  const mountedRef = useRef(true);
  
  // Contador de IDs únicos para cada notificación
  const notificationIdRef = useRef(0);

  // ============================================================================
  // FUNCIÓN PRINCIPAL: MOSTRAR NOTIFICACIÓN
  // ============================================================================
  /**
   * Muestra una notificación en pantalla
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación (success, error, warning, info, points)
   * @param {object} options - Opciones adicionales
   * @returns {number} ID de la notificación creada
   */
  const notify = useCallback((message, type = NOTIFICATION_TYPES.SUCCESS, options = {}) => {
    if (!mountedRef.current) return null;
    
    const {
      duration = 3000,                              // Duración por defecto: 3 segundos
      position = NOTIFICATION_POSITIONS.TOP_RIGHT,  // Posición por defecto
      icon = null,                                  // Ícono personalizado (opcional)
      points = null,                                // Cantidad de puntos (para tipo 'points')
      autoClose = true,                             // Auto cerrar después de 'duration'
      onClick = null                                // Callback al hacer click
    } = options;

    // Generar ID único
    const id = ++notificationIdRef.current;
    
    // Crear objeto de notificación
    const notification = {
      id,
      message,
      type,
      duration,
      position,
      icon,
      points,
      autoClose,
      onClick,
      createdAt: Date.now()
    };

    console.log('🔔 [NotificationContext] Nueva notificación:', notification);

    // Agregar notificación al estado
    setNotifications(prev => [...prev, notification]);

    // Auto cerrar si está habilitado
    if (autoClose) {
      setTimeout(() => {
        if (mountedRef.current) {
          removeNotification(id);
        }
      }, duration);
    }

    return id;
  }, []);

  // ============================================================================
  // FUNCIÓN: REMOVER NOTIFICACIÓN
  // ============================================================================
  const removeNotification = useCallback((id) => {
    if (!mountedRef.current) return;
    
    console.log('🗑️ [NotificationContext] Removiendo notificación:', id);
    
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // ============================================================================
  // FUNCIÓN: LIMPIAR TODAS LAS NOTIFICACIONES
  // ============================================================================
  const clearAll = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log('🧹 [NotificationContext] Limpiando todas las notificaciones');
    
    setNotifications([]);
  }, []);

  // ============================================================================
  // ATAJOS PARA TIPOS ESPECÍFICOS (para facilitar el uso)
  // ============================================================================
  
  const success = useCallback((message, options = {}) => {
    return notify(message, NOTIFICATION_TYPES.SUCCESS, options);
  }, [notify]);

  const error = useCallback((message, options = {}) => {
    return notify(message, NOTIFICATION_TYPES.ERROR, options);
  }, [notify]);

  const warning = useCallback((message, options = {}) => {
    return notify(message, NOTIFICATION_TYPES.WARNING, options);
  }, [notify]);

  const info = useCallback((message, options = {}) => {
    return notify(message, NOTIFICATION_TYPES.INFO, options);
  }, [notify]);

  const points = useCallback((amount, options = {}) => {
    return notify(
      `+${amount} puntos`, 
      NOTIFICATION_TYPES.POINTS, 
      { 
        ...options, 
        points: amount,
        icon: '🎉' 
      }
    );
  }, [notify]);

  // ============================================================================
  // LIMPIEZA AL DESMONTAR
  // ============================================================================
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ============================================================================
  // VALOR DEL CONTEXTO
  // ============================================================================
  const value = {
    // Estado
    notifications,
    
    // Función principal
    notify,
    
    // Atajos por tipo
    success,
    error,
    warning,
    info,
    points,
    
    // Funciones de control
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
