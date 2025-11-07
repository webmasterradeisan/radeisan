// src/pages/points-rewards-store/components/TransactionHistory.jsx
// ============================================================================
// ✅ FIX: Sincronizado con la tabla 'points_transactions'
// ✅ FIX: Añadida función 'getTransactionTitle' para traducir 'other'
// ✅ NUEVO: Añadidos filtros de fecha ('dateFilter', 'onDateFilterChange')
// ✅ NUEVO: Añadido botón 'Cargar Más' ('hasMore', 'onLoadMore')
// ============================================================================

import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TransactionHistory = ({ 
  transactions = [],
  loading = false,
  className = '',
  // Nuevos props para filtros y paginación
  dateFilter,
  onDateFilterChange,
  hasMore,
  onLoadMore
}) => {
  const [filter, setFilter] = useState('all'); // all, earned, spent

  // Filtrar usando 'points_change'
  const filteredTransactions = transactions?.filter(transaction => {
    if (filter === 'earned') return transaction?.points_change > 0;
    if (filter === 'spent') return transaction?.points_change < 0;
    return true;
  });

  // Ya no cortamos la lista, la paginación se maneja en el componente padre
  const displayedTransactions = filteredTransactions; 

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

  // Totales basados en 'points_change' (ahora usa la lista COMPLETA de transacciones)
  const totalEarned = transactions
    ?.filter(t => t?.points_change > 0)
    ?.reduce((sum, t) => sum + (t?.points_change || 0), 0);

  const totalSpent = transactions
    ?.filter(t => t?.points_change < 0)
    ?.reduce((sum, t) => sum + Math.abs(t?.points_change || 0), 0);

  return (
    <div className={`bg-card ${className}`} id="transaction-history">
      {/* Header (ya no tiene borde inferior) */}
      <div className="p-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-foreground">
            Historial de Puntos
          </h2>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
             <Icon name="RefreshCw" size={16} />
          </Button>
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

        {/* ✅ NUEVO: Filtros de Fecha */}
        <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
          {['all', 'today', 'week', 'month'].map((filter) => (
            <Button
              key={filter}
              variant={dateFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDateFilterChange(filter)}
              className="flex-shrink-0"
            >
              {filter === 'all' && 'Todos'}
              {filter === 'today' && 'Hoy'}
              {filter === 'week' && 'Esta Semana'}
              {filter === 'month' && 'Este Mes'}
            </Button>
          ))}
        </div>

        {/* Filter Buttons (Tipo) */}
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
          </Button>
        </div>
      </div>
      
      {/* Transaction List (ya no tiene padding superior) */}
      <div className="pt-6">
        {loading && displayedTransactions?.length === 0 ? (
          // Loading spinner
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando historial...</p>
          </div>
        ) : displayedTransactions?.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <Icon name="History" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filter === 'all' ?'No hay transacciones'
                : filter === 'earned' ?'No hay puntos ganados' :'No hay puntos canjeados'
              }
              {dateFilter !== 'all' && (
                dateFilter === 'today' ? ' hoy' :
                dateFilter === 'week' ? ' esta semana' : ' este mes'
              )}
            </p>
          </div>
        ) : (
          // Lista
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

        {/* ✅ NUEVO: Botón 'Cargar Más' para Paginación */}
        {hasMore && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={onLoadMore}
              loading={loading && displayedTransactions.length > 0} // Muestra 'loading' solo si ya hay items
            >
              Cargar más
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
