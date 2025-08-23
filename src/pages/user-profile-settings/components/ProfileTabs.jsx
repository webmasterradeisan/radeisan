import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const ProfileTabs = ({ activeTab, onTabChange, tabCounts = {} }) => {
  const tabs = [
    {
      id: 'videos',
      label: 'Videos',
      icon: 'Video',
      count: tabCounts?.videos || 0
    },
    {
      id: 'liked',
      label: 'Me Gusta',
      icon: 'Heart',
      count: tabCounts?.liked || 0
    },
    {
      id: 'playlists',
      label: 'Listas',
      icon: 'List',
      count: tabCounts?.playlists || 0
    },
    {
      id: 'purchases',
      label: 'Compras',
      icon: 'ShoppingBag',
      count: tabCounts?.purchases || 0
    },
    {
      id: 'points',
      label: 'Puntos',
      icon: 'Star',
      count: null
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'Settings',
      count: null
    }
  ];

  return (
    <div className="bg-card border-b border-border sticky top-16 lg:top-30 z-20">
      <div className="px-4 sm:px-6">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs?.map((tab) => (
            <button
              key={tab?.id}
              onClick={() => onTabChange(tab?.id)}
              className={`
                flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors flex-shrink-0
                ${activeTab === tab?.id
                  ? 'border-primary text-primary bg-primary/5' :'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <Icon 
                name={tab?.icon} 
                size={16} 
                color={activeTab === tab?.id ? 'var(--color-primary)' : 'currentColor'} 
              />
              <span>{tab?.label}</span>
              {tab?.count !== null && (
                <span className={`
                  px-1.5 py-0.5 text-xs rounded-full
                  ${activeTab === tab?.id
                    ? 'bg-primary/20 text-primary' :'bg-muted text-muted-foreground'
                  }
                `}>
                  {tab?.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileTabs;