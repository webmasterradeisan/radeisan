import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const PurchaseHistory = ({ purchases, loading = false }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'Todas', count: purchases?.length || 0 },
    { id: 'delivered', label: 'Entregadas', count: purchases?.filter(p => p?.status === 'delivered')?.length || 0 },
    { id: 'pending', label: 'Pendientes', count: purchases?.filter(p => p?.status === 'pending')?.length || 0 },
    { id: 'cancelled', label: 'Canceladas', count: purchases?.filter(p => p?.status === 'cancelled')?.length || 0 }
  ];

  const getStatusColor = (status) => {
    const colorMap = {
      'delivered': 'var(--color-success)',
      'pending': 'var(--color-warning)',
      'processing': 'var(--color-secondary)',
      'cancelled': 'var(--color-error)',
      'refunded': 'var(--color-muted-foreground)'
    };
    return colorMap?.[status] || 'var(--color-muted-foreground)';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'delivered': 'CheckCircle',
      'pending': 'Clock',
      'processing': 'Loader',
      'cancelled': 'XCircle',
      'refunded': 'RotateCcw'
    };
    return iconMap?.[status] || 'Package';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      'delivered': 'Entregado',
      'pending': 'Pendiente',
      'processing': 'Procesando',
      'cancelled': 'Cancelado',
      'refunded': 'Reembolsado'
    };
    return labelMap?.[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredPurchases = purchases?.filter(purchase => {
    if (selectedFilter === 'all') return true;
    return purchase?.status === selectedFilter;
  }) || [];

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="space-y-4">
          {Array.from({ length: 3 })?.map((_, index) => (
            <div key={index} className="bg-card border border-border rounded-lg p-4">
              <div className="flex space-x-4">
                <div className="w-16 h-16 bg-muted rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!purchases || purchases?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon name="ShoppingBag" size={24} color="var(--color-muted-foreground)" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No hay compras</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          Tus compras aparecerán aquí. ¡Explora el marketplace para encontrar productos increíbles!
        </p>
        <Button variant="default" iconName="ShoppingBag" iconPosition="left">
          Ir al Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto scrollbar-hide">
        {filters?.map((filter) => (
          <button
            key={filter?.id}
            onClick={() => setSelectedFilter(filter?.id)}
            className={`
              flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors
              ${selectedFilter === filter?.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            <span>{filter?.label}</span>
            <span className={`
              px-1.5 py-0.5 text-xs rounded-full
              ${selectedFilter === filter?.id
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-background text-muted-foreground'
              }
            `}>
              {filter?.count}
            </span>
          </button>
        ))}
      </div>
      {/* Purchase List */}
      <div className="space-y-4">
        {filteredPurchases?.map((purchase) => (
          <div key={purchase?.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-elevation-1 transition-shadow">
            <div className="flex space-x-4">
              {/* Product Image */}
              <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={purchase?.product?.image}
                  alt={purchase?.product?.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Purchase Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-foreground line-clamp-1">
                      {purchase?.product?.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Vendido por {purchase?.seller?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">
                      €{purchase?.totalAmount?.toFixed(2)}
                    </p>
                    {purchase?.pointsUsed > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-accent">
                        <Icon name="Star" size={10} />
                        <span>-{purchase?.pointsUsed} pts</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getStatusColor(purchase?.status) }}
                    />
                    <span className="text-sm font-medium" style={{ color: getStatusColor(purchase?.status) }}>
                      {getStatusLabel(purchase?.status)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(purchase?.purchaseDate)}
                  </span>
                </div>

                {/* Tracking Info */}
                {purchase?.trackingNumber && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    <span className="text-muted-foreground">Seguimiento: </span>
                    <span className="font-mono text-foreground">{purchase?.trackingNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex space-x-2">
                {purchase?.status === 'delivered' && (
                  <Button variant="outline" size="sm" iconName="Star" iconPosition="left">
                    Valorar
                  </Button>
                )}
                {purchase?.status === 'pending' && (
                  <Button variant="outline" size="sm" iconName="XCircle" iconPosition="left">
                    Cancelar
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" iconName="MessageCircle" iconPosition="left">
                  Contactar
                </Button>
                <Button variant="ghost" size="sm" iconName="Eye" iconPosition="left">
                  Ver detalles
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Load More */}
      {filteredPurchases?.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button variant="outline">
            Cargar más compras
          </Button>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;