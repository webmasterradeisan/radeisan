// src/pages/user-profile-settings/components/ProfileTabs.jsx
// Profile tabs con integración del sistema de fotos
import React from 'react';
import Icon from '../../../components/AppIcon';

const ProfileTabs = ({ 
  activeTab, 
  onTabChange, 
  tabCounts = {},
  user = null,
  showPhotosTab = true 
}) => {
  
  // Configuración de tabs
  const tabs = [
    {
      id: 'videos',
      label: 'Videos',
      icon: 'Video',
      count: tabCounts?.videos || 0,
      description: 'Videos subidos'
    },
    // Tab de fotos (nuevo)
    ...(showPhotosTab ? [{
      id: 'photos',
      label: 'Fotos',
      icon: 'Image',
      count: tabCounts?.photos || 0,
      description: 'Galería de fotos',
      isNew: true // Indicador de funcionalidad nueva
    }] : []),
    {
      id: 'liked',
      label: 'Me Gusta',
      icon: 'Heart',
      count: tabCounts?.liked || 0,
      description: 'Contenido favorito'
    },
    {
      id: 'playlists',
      label: 'Listas',
      icon: 'List',
      count: tabCounts?.playlists || 0,
      description: 'Listas de reproducción'
    },
    {
      id: 'purchases',
      label: 'Compras',
      icon: 'ShoppingBag',
      count: tabCounts?.purchases || 0,
      description: 'Historial de compras'
    },
    {
      id: 'points',
      label: 'Puntos',
      icon: 'Star',
      count: null,
      description: 'Historial de puntos'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'Settings',
      count: null,
      description: 'Ajustes del perfil'
    }
  ];

  // Calcular si hay contenido en cada tab
  const getTabStatus = (tab) => {
    if (tab.count === null) return 'default';
    if (tab.count === 0) return 'empty';
    if (tab.count > 0) return 'hasContent';
    return 'default';
  };

  return (
    <div className="bg-card border-b border-border sticky top-16 lg:top-30 z-20">
      <div className="px-4 sm:px-6">
        
        {/* Tabs principales */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const status = getTabStatus(tab);
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-all duration-200 flex-shrink-0 min-w-0
                  ${isActive
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
                title={tab.description}
              >
                
                {/* Icono del tab */}
                <div className="relative">
                  <Icon 
                    name={tab.icon} 
                    size={16} 
                    color={isActive ? 'var(--color-primary)' : 'currentColor'} 
                  />
                  
                  {/* Indicador "nuevo" para fotos */}
                  {tab.isNew && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
                
                {/* Etiqueta del tab */}
                <span className="truncate">{tab.label}</span>
                
                {/* Contador */}
                {tab.count !== null && (
                  <span className={`
                    px-1.5 py-0.5 text-xs rounded-full transition-colors
                    ${isActive
                      ? 'bg-primary/20 text-primary' 
                      : status === 'empty' 
                        ? 'bg-muted text-muted-foreground/60'
                        : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
                
                {/* Indicador de estado vacío */}
                {status === 'empty' && !isActive && (
                  <div className="absolute inset-0 bg-muted/20 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                      <div className="bg-popover border rounded-md px-2 py-1 text-xs text-muted-foreground shadow-md">
                        Sin contenido
                      </div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Indicadores adicionales */}
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          
          {/* Información del tab activo */}
          <div className="flex items-center space-x-2">
            {(() => {
              const currentTab = tabs.find(t => t.id === activeTab);
              if (!currentTab) return null;

              if (currentTab.count !== null) {
                return (
                  <span>
                    {currentTab.count} {currentTab.label.toLowerCase()}
                    {currentTab.count === 0 && (
                      <span className="ml-1 text-muted-foreground/60">
                        - {getEmptyStateMessage(currentTab.id)}
                      </span>
                    )}
                  </span>
                );
              }
              
              return <span>{currentTab.description}</span>;
            })()}
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center space-x-2">
            {activeTab === 'videos' && (
              <button
                onClick={() => window.location.href = '/video-upload'}
                className="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors"
              >
                <Icon name="Plus" size={12} />
                <span>Subir video</span>
              </button>
            )}
            
            {activeTab === 'photos' && (
              <button
                onClick={() => window.location.href = '/photo-upload'}
                className="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors"
              >
                <Icon name="Plus" size={12} />
                <span>Subir fotos</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Función auxiliar para mensajes de estado vacío
const getEmptyStateMessage = (tabId) => {
  switch (tabId) {
    case 'videos':
      return 'Comparte tu primer video';
    case 'photos':
      return 'Comparte tu primera foto';
    case 'liked':
      return 'Dale like a contenido que te guste';
    case 'playlists':
      return 'Crea tu primera lista';
    case 'purchases':
      return 'Realiza tu primera compra';
    default:
      return 'Sin contenido';
  }
};

export default ProfileTabs;
