// src/components/notifications/NotificationContainer.jsx
// ============================================================================
// NOTIFICATION CONTAINER - RENDERIZADOR Y POSICIONADOR DE NOTIFICACIONES
// ============================================================================
// ✅ POSICIONAMIENTO: Soporta 7 posiciones diferentes
// ✅ STACKING: Apila múltiples notificaciones correctamente
// ✅ ANIMACIONES: Entrada y salida suaves
// ✅ RESPONSIVE: Se adapta a mobile y desktop
// ============================================================================

import React from 'react';
import { useNotification, NOTIFICATION_POSITIONS } from 'contexts/NotificationContext';
import Notification from './Notification';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  // ============================================================================
  // AGRUPAR NOTIFICACIONES POR POSICIÓN
  // ============================================================================
  const notificationsByPosition = notifications.reduce((acc, notification) => {
    const position = notification.position || NOTIFICATION_POSITIONS.TOP_RIGHT;
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(notification);
    return acc;
  }, {});

  // ============================================================================
  // CONFIGURACIÓN DE POSICIONAMIENTO POR UBICACIÓN
  // ============================================================================
  const positionStyles = {
    'top-right': 'top-4 right-4 items-end',
    'top-left': 'top-4 left-4 items-start',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-left': 'bottom-4 left-4 items-start',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center'
  };

  // ============================================================================
  // SI NO HAY NOTIFICACIONES, NO RENDERIZAR NADA
  // ============================================================================
  if (notifications.length === 0) {
    return null;
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      {/* RENDERIZAR UN CONTENEDOR POR CADA POSICIÓN QUE TENGA NOTIFICACIONES */}
      {Object.entries(notificationsByPosition).map(([position, positionNotifications]) => (
        <div
          key={position}
          className={`
            fixed 
            ${positionStyles[position]}
            flex flex-col gap-3
            z-[9999]
            pointer-events-none
            max-h-screen overflow-hidden
            px-4
          `}
          style={{
            // Asegurar que las notificaciones no salgan de la pantalla
            maxWidth: 'calc(100vw - 2rem)'
          }}
        >
          {positionNotifications.map((notification) => (
            <div
              key={notification.id}
              className="pointer-events-auto"
              style={{
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              <Notification
                {...notification}
                onClose={removeNotification}
              />
            </div>
          ))}
        </div>
      ))}

      {/* ESTILOS DE ANIMACIÓN */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.8);
          }
        }

        .notification-item {
          animation: slideIn 0.3s ease-out;
        }

        /* Responsive: En mobile, notificaciones más pequeñas */
        @media (max-width: 768px) {
          .notification-item {
            min-width: 250px;
            max-width: calc(100vw - 2rem);
          }
        }

        /* Ajuste para posición centro */
        .fixed.items-center .notification-item {
          width: 100%;
          max-width: 400px;
        }

        /* Animación de hover más sutil en mobile */
        @media (hover: none) {
          .notification-item:hover {
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default NotificationContainer;
