// src/pages/points-rewards-store/components/TransactionHistory.jsx
// ============================================================================
// ✅ FIX: Sincronizado con la tabla 'points_transactions'
// ⭐️ FIX FINAL: Títulos amigables para TODAS las misiones de contenido:
//    upload_reel, upload_video, give_like, like_videos.
// ============================================================================

import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TransactionHistory = ({ 
  transactions = [],
  loading = false,
  className = '',
  // Props para filtros y paginación
  dateFilter,
  onDateFilterChange,
  hasMore,
  onLoadMore,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {
  const [filter, setFilter] = useState('all'); // all, earned, spent

  // Aseguramos que 'transactions' sea un array iterable
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // Filtrar usando 'points_change'
  const filteredTransactions = safeTransactions.filter(transaction => {
    // Usamos ?. para safe access y asumimos 0 si points_change es null/undefined
    const pointsChange = transaction?.points_change || 0; 
    
    if (filter === 'earned') return pointsChange > 0;
    if (filter === 'spent') return pointsChange < 0;
    return true;
  });

  // Ya no cortamos la lista, la paginación se maneja en el componente padre
  const displayedTransactions = filteredTransactions; 

  // Función para 'traducir' el título de la transacción
  const getTransactionTitle = (transaction) => {
    const type = transaction?.transaction_type; 
    const desc = transaction?.description;     
    const points = transaction?.points_change;

    // 1. Manejo de Descripciones Explícitas (e.g., Regalo, Compras Admin)
    if (desc && desc !== 'other' && desc !== type) {
      // Si la descripción no es genérica, la usamos (e.g., "Envío regalo: Flor a @pedromolina2023", "Compra de Puntos Premium (Admin)")
      return desc;
    }
    
    // 2. Traducción de Misiones/Acciones Comunes (Usando 'type' o 'desc')
    const key = desc || type;
    
    switch (key) {
      // ⭐️ FIX: Unificamos todas las acciones de 'Me Gusta'
      case 'give_like':
      case 'like_videos':
      case 'video_like':
        return 'Puntos por Me Gusta';
        
      case 'comment':
      case 'comment_videos':
        return 'Puntos por Comentar';
        
      case 'share':
      case 'share_content':
        return 'Puntos por Compartir';
        
      // ⭐️ FIX: Unificamos todas las acciones de 'Subir Contenido'
      case 'video_upload':
      case 'upload_video': 
      case 'upload_reel':  
      case 'photo_upload':
      case 'content_upload':
        return 'Puntos por Subir Contenido';
        
      case 'video_view':
        return 'Puntos por Vista';
        
      case 'purchase':
        return 'Compra de Paquete de Puntos Premium (Admin)';
        
      case 'admin_adjustment':
        return 'Ajuste de Administrador';

      case 'other':
        if ((points || 0) < 0) return 'Canje de Recompensa (Gasto)';
        if ((points || 0) > 0) return 'Devolución/Reembolso de Puntos';
        break;

      default:
        // Fallback si no se reconoce el tipo
        return (points > 0) ? `Ganancia: ${type}` : `Transacción: ${type}`;
    }
    
    return type || 'Transacción Desconocida';
  };

  // Icono basado en 'transaction_type' y 'points_change'
  const getTransactionIcon = (transaction) => {
    const type = transaction?.transaction_type;
    const points = transaction?.points_change || 0; // Usamos 0 si es nulo

    if (type === 'other' && points < 0) return 'Gift'; // Canje
    if (type === 'other' && points > 0) return 'RefreshCw'; // Reversión
    if (type === 'video_like' || type === 'give_like' || type === 'like_videos') return 'Heart';
    if (type === 'admin_adjustment') return 'Shield'; 
    if (type === 'video_view') return 'Play';
    if (type === 'comment' || type === 'comment_videos') return 'MessageCircle';
    if (type === 'share' || type === 'share_content') return 'Share2';
    // ⭐️ FIX: Incluimos todos los uploads
    if (type === 'video_upload' || type === 'upload_video' || type === 'upload_reel' || type === 'photo_upload') return 'Upload';
    
    return (points > 0) ? 'TrendingUp' : 'TrendingDown';
  };

  // Color basado en 'points_change'
  const getTransactionColor = (transaction) => {
    // Usamos 0 si es nulo
    return (transaction?.points_change || 0) > 0 ? 'var(--color-success)' : 'var(--color-error)';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha inválida';
    // Intentamos parsear la fecha de forma segura
    try {
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
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  // Totales basados en 'points_change' (ahora usa la lista COMPLETA de transacciones)
  const totalEarned = safeTransactions
    .filter(t => (t?.points_change || 0) > 0)
    .reduce((sum, t) => sum + (t?.points_change || 0), 0);

  const totalSpent = safeTransactions
    .filter(t => (t?.points_change || 0) < 0)
    .reduce((sum, t) => sum + Math.abs(t?.points_change || 0), 0);
  
  // Helper para convertir fechas para el input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      // Si ya es un formato YYYY-MM-DD (como viene de los estados), devolverlo
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
      
      const date = new Date(dateString);
      // Solo si es una fecha válida, la formateamos
      if (!isNaN(date.getTime())) {
         return date.toISOString().split('T')[0];
      }
      return '';
    } catch (e) {
      return '';
    }
  };
  
  // Condición de carga para el botón "Cargar más"
  const isLoadingMore = loading && displayedTransactions.length > 0;

  return (
    <div className={`bg-card ${className}`} id="transaction-history">
      {/* Header (ya no tiene borde inferior) */}
      <div className="p-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-foreground">
            Historial de Puntos
          </h2>
          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={onLoadMore}>
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

        {/* ✅ NUEVO: Filtros de Fecha (Rápidos) */}
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

        {/* ✅ NUEVO: Filtros de Fecha (Personalizados) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
                <input
                    type="date"
                    // Si el filtro no es 'custom', limpiamos el input visualmente
                    value={dateFilter === 'custom' ? formatDateForInput(startDate) : ''}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    max={formatDateForInput(new Date().toISOString())} // No se puede seleccionar fecha futura
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta</label>
                <input
                    type="date"
                     // Si el filtro no es 'custom', limpiamos el input visualmente
                    value={dateFilter === 'custom' ? formatDateForInput(endDate) : ''}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    max={formatDateForInput(new Date().toISOString())}
                />
            </div>
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
              {dateFilter !== 'all' && dateFilter !== 'custom' && (
                dateFilter === 'today' ? ' hoy' :
                dateFilter === 'week' ? ' esta semana' : ' este mes'
              )}
              {dateFilter === 'custom' && ' en este rango de fechas'}
            </p>
          </div>
        ) : (
          // Lista
          <div className="space-y-4">
            {displayedTransactions?.map((transaction, index) => (
              // Garantizamos que transaction.id exista o usamos el índice como fallback
              <div key={transaction?.id || index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${(transaction?.points_change || 0) > 0 ? 'bg-success/10' : 'bg-error/10'}
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
                    ${(transaction?.points_change || 0) > 0 ? 'text-success' : 'text-error'}
                  `}>
                    {(transaction?.points_change || 0) > 0 ? '+' : ''}
                    {(transaction?.points_change || 0)?.toLocaleString()}
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
              loading={isLoadingMore} // Muestra 'loading' solo si ya hay items
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
