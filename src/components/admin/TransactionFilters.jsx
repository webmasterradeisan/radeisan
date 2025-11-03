import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter, Calendar } from 'lucide-react';

const TransactionFilters = ({ filters, onFilterChange }) => {
  // Estados locales para búsqueda con debounce
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [localUserId, setLocalUserId] = useState(filters.user_id || '');

  // Contador de filtros activos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.date_from) count++;
    if (filters.date_to) count++;
    if (filters.search) count++;
    if (filters.user_id) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  // Debounce para búsqueda de texto
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFilterChange({ search: localSearch });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch]);

  // Debounce para búsqueda de usuario
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localUserId !== filters.user_id) {
        onFilterChange({ user_id: localUserId || null });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localUserId]);

  // Manejar cambio de estado
  const handleStatusChange = (e) => {
    const value = e.target.value;
    onFilterChange({ status: value });
  };

  // Manejar cambio de fecha desde
  const handleDateFromChange = (e) => {
    const value = e.target.value;
    // Validar que date_from no sea mayor que date_to
    if (filters.date_to && value && new Date(value) > new Date(filters.date_to)) {
      alert('La fecha "desde" no puede ser posterior a la fecha "hasta"');
      return;
    }
    onFilterChange({ date_from: value || null });
  };

  // Manejar cambio de fecha hasta
  const handleDateToChange = (e) => {
    const value = e.target.value;
    // Validar que date_to no sea menor que date_from
    if (filters.date_from && value && new Date(value) < new Date(filters.date_from)) {
      alert('La fecha "hasta" no puede ser anterior a la fecha "desde"');
      return;
    }
    onFilterChange({ date_to: value || null });
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setLocalSearch('');
    setLocalUserId('');
    onFilterChange({
      status: 'all',
      user_id: null,
      date_from: null,
      date_to: null,
      search: ''
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {activeFiltersCount} activo{activeFiltersCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro por estado */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Estado
          </label>
          <select
            value={filters.status || 'all'}
            onChange={handleStatusChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completado</option>
            <option value="failed">Fallido</option>
            <option value="refunded">Reembolsado</option>
          </select>
        </div>

        {/* Filtro por fecha desde */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Fecha desde
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={handleDateFromChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Filtro por fecha hasta */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Fecha hasta
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={filters.date_to || ''}
              onChange={handleDateToChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Búsqueda por usuario */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Buscar usuario
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={localUserId}
              onChange={(e) => setLocalUserId(e.target.value)}
              placeholder="Email o nombre..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Búsqueda por ID de transacción (ancho completo) */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
          Buscar por ID de transacción
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Ingresa el ID de la transacción..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-gray-400"
          />
        </div>
      </div>

      {/* Indicadores de filtros activos */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          {filters.status && filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Estado: {filters.status}
              <button
                onClick={() => onFilterChange({ status: 'all' })}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.date_from && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Desde: {new Date(filters.date_from).toLocaleDateString('es-CO')}
              <button
                onClick={() => onFilterChange({ date_from: null })}
                className="hover:bg-green-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.date_to && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Hasta: {new Date(filters.date_to).toLocaleDateString('es-CO')}
              <button
                onClick={() => onFilterChange({ date_to: null })}
                className="hover:bg-green-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.user_id && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Usuario: {filters.user_id}
              <button
                onClick={() => {
                  setLocalUserId('');
                  onFilterChange({ user_id: null });
                }}
                className="hover:bg-purple-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.search && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              ID: {filters.search.substring(0, 8)}...
              <button
                onClick={() => {
                  setLocalSearch('');
                  onFilterChange({ search: '' });
                }}
                className="hover:bg-orange-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;
