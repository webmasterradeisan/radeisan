import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import TransactionStats from '../../components/admin/TransactionStats';
import TransactionFilters from '../../components/admin/TransactionFilters';
import TransactionsList from '../../components/admin/TransactionsList';
import TransactionDetails from '../../components/admin/TransactionDetails';
import { getTransactions, getStats } from '../../services/transactionsService';

const TransactionsManagement = () => {
  // Estados principales
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Filtros
  const [filters, setFilters] = useState({
    status: 'all',
    user_id: null,
    date_from: null,
    date_to: null,
    search: ''
  });

  // Paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20
  });

  // Modal de detalles
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Período de estadísticas
  const [statsPeriod, setStatsPeriod] = useState('week');

  // Cargar transacciones
  const loadTransactions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      
      const params = {
        status: filters.status !== 'all' ? filters.status : null,
        user_id: filters.user_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
        limit: pagination.limit,
        offset: (page - 1) * pagination.limit
      };

      const result = await getTransactions(params);
      
      if (result.success) {
        setTransactions(result.data.transactions);
        setPagination(prev => ({
          ...prev,
          currentPage: page,
          totalPages: result.data.pagination.total_pages,
          totalCount: result.data.pagination.total_count
        }));
      } else {
        toast.error('Error al cargar transacciones');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Error al cargar transacciones');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const result = await getStats(statsPeriod);
      
      if (result.success) {
        setStats(result.data);
      } else {
        toast.error('Error al cargar estadísticas');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setStatsLoading(false);
    }
  }, [statsPeriod]);

  // Cargar datos iniciales
  useEffect(() => {
    loadTransactions(1);
  }, [filters]);

  useEffect(() => {
    loadStats();
  }, [statsPeriod]);

  // Manejar cambio de filtros
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Manejar cambio de página
  const handlePageChange = useCallback((page) => {
    loadTransactions(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadTransactions]);

  // Abrir modal de detalles
  const handleViewDetails = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  }, []);

  // Cerrar modal de detalles
  const handleCloseDetails = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedTransaction(null);
  }, []);

  // Refrescar datos después de una acción
  const handleActionComplete = useCallback(() => {
    loadTransactions(pagination.currentPage);
    loadStats();
    handleCloseDetails();
    toast.success('Acción completada exitosamente');
  }, [loadTransactions, loadStats, pagination.currentPage, handleCloseDetails]);

  // Refrescar manualmente
  const handleRefresh = useCallback(() => {
    loadTransactions(pagination.currentPage);
    loadStats();
    toast.success('Datos actualizados');
  }, [loadTransactions, loadStats, pagination.currentPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestión de Transacciones
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Administra pagos, compras y reembolsos de la plataforma
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading || statsLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(loading || statsLoading) ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Estadísticas */}
        <TransactionStats
          stats={stats}
          loading={statsLoading}
          period={statsPeriod}
          onPeriodChange={setStatsPeriod}
        />

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <TransactionFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Lista de transacciones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TransactionsList
            transactions={transactions}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* Modal de detalles */}
      {showDetailsModal && selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          onClose={handleCloseDetails}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TransactionsManagement;
