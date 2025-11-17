// src/components/notifications/Notification.jsx
// ============================================================================
// NOTIFICATION COMPONENT - COMPONENTE VISUAL INDIVIDUAL
// ============================================================================
// ✅ ANIMACIONES: Entrada y salida suaves con CSS
// ✅ TIPOS: Soporta success, error, warning, info, points
// ✅ PERSONALIZABLE: Iconos, colores y comportamiento
// ✅ RESPONSIVE: Se adapta a mobile y desktop
// ============================================================================

import React from 'react';
import Icon from 'components/AppIcon';
import { NOTIFICATION_TYPES } from 'contexts/NotificationContext';

const Notification = ({ 
  id,
  message, 
  type = 'success', 
  icon = null,
  points = null,
  onClick = null,
  onClose 
}) => {
  
  // ============================================================================
  // CONFIGURACIÓN DE ESTILOS POR TIPO
  // ============================================================================
  const typeConfig = {
    success: {
      bgColor: 'bg-green-500',
      textColor: 'text-white',
      icon: 'CheckCircle',
      borderColor: 'border-green-600'
    },
    error: {
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      icon: 'XCircle',
      borderColor: 'border-red-600'
    },
    warning: {
      bgColor: 'bg-yellow-500',
      textColor: 'text-black',
      icon: 'AlertTriangle',
      borderColor: 'border-yellow-600'
    },
    info: {
      bgColor: 'bg-blue-500',
      textColor: 'text-white',
      icon: 'Info',
      borderColor: 'border-blue-600'
    },
    points: {
      bgColor: 'bg-gradient-to-r from-yellow-400 to-orange-500',
      textColor: 'text-white',
      icon: 'Award',
      borderColor: 'border-yellow-600'
    }
  };

  const config = typeConfig[type] || typeConfig.success;
  const displayIcon = icon || config.icon;

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleClose = (e) => {
    e.stopPropagation();
    onClose(id);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div
      className={`
        notification-item
        ${config.bgColor} 
        ${config.textColor}
        border-l-4 ${config.borderColor}
        rounded-lg shadow-lg
        p-3 md:p-4
        min-w-[280px] max-w-[400px]
        flex items-start gap-3
        cursor-pointer
        transform transition-all duration-300 ease-in-out
        hover:scale-105 hover:shadow-xl
        animate-slide-in
      `}
      onClick={handleClick}
      role="alert"
      aria-live="polite"
    >
      {/* ÍCONO */}
      <div className="flex-shrink-0 mt-0.5">
        {typeof displayIcon === 'string' && displayIcon.length <= 2 ? (
          // Emoji
          <span className="text-2xl">{displayIcon}</span>
        ) : (
          // Componente Icon
          <Icon 
            name={displayIcon} 
            size={24} 
            className={config.textColor}
          />
        )}
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 min-w-0">
        <p className="text-sm md:text-base font-medium leading-tight">
          {message}
        </p>
        
        {/* PUNTOS (si aplica) */}
        {type === NOTIFICATION_TYPES.POINTS && points && (
          <p className="text-lg md:text-xl font-bold mt-1">
            +{points} puntos
          </p>
        )}
      </div>

      {/* BOTÓN CERRAR */}
      <button
        onClick={handleClose}
        className={`
          flex-shrink-0
          ${config.textColor}
          hover:opacity-70
          transition-opacity
          p-1
          rounded-full
          hover:bg-white/20
        `}
        aria-label="Cerrar notificación"
      >
        <Icon name="X" size={18} />
      </button>
    </div>
  );
};

export default Notification;
