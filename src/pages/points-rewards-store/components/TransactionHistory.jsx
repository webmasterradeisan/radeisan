// src/pages/points-rewards-store/components/TransactionHistory.jsx
// ============================================================================
// ✅ FIX: Sincronizado con la tabla 'points_transactions'
// ✅ FIX: Añadida función 'getTransactionTitle' para traducir 'other'
// ✅ FIX 3: Corregido el typo en la etiqueta de cierre </Button>
// ============================================================================

import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TransactionHistory = ({ 
  transactions = [], 
  className = '' 
}) => {
  const [filter, setFilter] = useState('all'); // all, earned, spent
  const [isExpanded, setIsExpanded] = useState(false); // Estado para "Ver más"

  // Filtrar usando 'points_change'
  const filteredTransactions = transactions?.filter(transaction => {
    if (filter === 'earned') return transaction?.points_change > 0;
    if (filter === 'spent') return transaction?.points_change < 0;
    return true;
  });

  // Lógica para el botón "Ver más"
  const displayedTransactions = isExpanded ? 
    filteredTransactions : 
    filteredTransactions?.slice(0, 5); // Muestra solo los primeros 5

  // Función para 'traducir' el título de la transacción
  const getTransactionTitle = (transaction) => {
    const type = transaction?.transaction_type;
    const desc = transaction?.description;
    const points = transaction?.points_change;

    // Si la descripción es útil (ej: "Comentar"), la usamos
    if (desc && desc !== 'other' && desc !== type) {
      return desc;
    }

    // Si la descripción es 'other' o nula, traducimos el transaction_type
    if (type === 'other') {
      if (points < 0) return 'Canje de Recompensa'; // 'other' con puntos negativos
      if (points > 0) return 'Puntos Devueltos'; // 'other' con puntos positivos (reversión)
    }
    if (type === 'video_like') return 'Like en video';
    if (type === 'admin_adjustment') return 'Ajuste de Administrador';
    
    // Fallback para otros tipos de la DB que puedan no tener descripción
    if (type === 'video_view') return 'Vista en video';
    if (type === 'comment') return 'Comentario';
    if (type === 'share') return 'Compartir contenido';
    
    return type || 'Transacción'; // Fallback
  };

  // Icono basado en 'transaction_type' y 'points_change'
  const getTransactionIcon = (transaction) => {
    const type = transaction?.transaction_type;
    const points = transaction?.points_change;

    if (type === 'other' && points < 0) return 'Gift'; // Canje
    if (type === 'other' && points > 0) return 'RefreshCw'; // Reversión
    if (type === 'video_like') return 'Heart';
    if (type === 'admin_adjustment') return 'User';
    if (type === 'video_view') return 'Play';
    if (type === 'comment') return 'MessageCircle';
    if (type === 'share') return 'Share2';
    
    // Icono por defecto
    return (points > 0) ? 'Plus' : 'Minus';
  };

  // Color basado en 'points_change'
  const getTransactionColor = (transaction) => {
    return transaction?.points_change > 0 ? 'var(--color-success)' : 'var(--color-error)';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha inválida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'Hoy';
    if (diffDays === 2) return 'Ayer';
    if (diffDays <= 7) return `Hace ${diffDays - 1} días`;
    
    return date?.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date?.getFullYear() !== now?.getFullYear() ? 'numeric' : undefined
    });
  };

  // Totales basados en 'points_change'
  const totalEarned = transactions
    ?.filter(t => t?.points_change > 0)
    ?.reduce((sum, t) => sum + (t?.points_change || 0), 0);

  const totalSpent = transactions
    ?.filter(t => t?.points_change < 0)
    ?.reduce((sum, t) => sum + Math.abs(t?.points_change || 0), 0);

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`} id="transaction-history">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-foreground">
            Historial de Puntos
          </h2>
          <Icon name="History" size={20} color="var(--color-muted-foreground)" />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-success/10 border border-success/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Icon name="TrendingUp" size={16} color="var(--color-success)" />
              <span className="text-sm font-medium text-success">Ganados</span>
            </div>
            <p className="font-mono font-bold text-success mt-1">
              +{totalEarned?.toLocaleString()}
            </p>
          </div>
          <div className="bg-error/10 border border-error/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Icon name="TrendingDown" size={16} color="var(--color-error)" />
              <span className="text-sm font-medium text-error">Canjeados</span>
            </div>
            <p className="font-mono font-bold text-error mt-1">
              -{totalSpent?.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'earned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('earned')}
            iconName="Plus"
            iconPosition="left"
          >
            Ganados
          </Button>
          <Button
            variant={filter === 'spent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('spent')}
            iconName="Minus"
            iconPosition="left"
          >
            Canjeados
          </Button> {/* ✅✅✅ FIX AQUÍ: Corregida la etiqueta de cierre */}
        </div>
      </div>
      {/* Transaction List */}
      <div className="p-6">
        {filteredTransactions?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="History" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filter === 'all' ?'No hay transacciones aún'
                : filter === 'earned' ?'No hay puntos ganados aún' :'No hay puntos canjeados aún'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedTransactions?.map((transaction, index) => (
              <div key={transaction.id || index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${transaction?.points_change > 0 ? 'bg-success/10' : 'bg-error/10'}
                `}>
                  <Icon 
                    name={getTransactionIcon(transaction)} 
                    size={16} 
                    color={getTransactionColor(transaction)} 
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {getTransactionTitle(transaction)}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(transaction?.created_at)}
                    </span>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <span className={`
                    font-mono font-bold
                    ${transaction?.points_change > 0 ? 'text-success' : 'text-error'}
                  `}>
                    {transaction?.points_change > 0 ? '+' : ''}{transaction?.points_change?.toLocaleString()}
                  </span>
                  <p className="text-xs text-muted-foreground">puntos</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show More Button */}
        {filteredTransactions?.length > 5 && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
              iconPosition="right"
            >
              {isExpanded 
                ? 'Mostrar Menos' 
                : `Ver ${filteredTransactions?.length - 5} más`
              }
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
