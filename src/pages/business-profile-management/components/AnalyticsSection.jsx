import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const AnalyticsSection = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('sales');

  const timeRangeOptions = [
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: '90d', label: 'Últimos 3 meses' },
    { value: '1y', label: 'Último año' }
  ];

  const metricOptions = [
    { value: 'sales', label: 'Ventas' },
    { value: 'views', label: 'Visualizaciones' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'revenue', label: 'Ingresos' }
  ];

  // Mock data for charts
  const salesData = [
    { name: 'Ene', ventas: 12, ingresos: 450, vistas: 1200 },
    { name: 'Feb', ventas: 19, ingresos: 680, vistas: 1800 },
    { name: 'Mar', ventas: 15, ingresos: 520, vistas: 1500 },
    { name: 'Abr', ventas: 25, ingresos: 890, vistas: 2200 },
    { name: 'May', ventas: 22, ingresos: 780, vistas: 2000 },
    { name: 'Jun', ventas: 30, ingresos: 1200, vistas: 2800 },
    { name: 'Jul', ventas: 28, ingresos: 1050, vistas: 2600 }
  ];

  const productPerformance = [
    { name: 'Camiseta Vintage', value: 35, color: '#E63946' },
    { name: 'Auriculares Pro', value: 25, color: '#457B9D' },
    { name: 'Set Pinceles', value: 20, color: '#F77F00' },
    { name: 'Maceta Artesanal', value: 12, color: '#28A745' },
    { name: 'Otros', value: 8, color: '#6C757D' }
  ];

  const videoMetrics = [
    { name: 'Sem 1', vistas: 850, engagement: 12.5, likes: 45 },
    { name: 'Sem 2', vistas: 1200, engagement: 15.2, likes: 68 },
    { name: 'Sem 3', vistas: 980, engagement: 11.8, likes: 52 },
    { name: 'Sem 4', vistas: 1450, engagement: 18.3, likes: 89 }
  ];

  const topProducts = [
    {
      id: 1,
      name: 'Camiseta Vintage Retro',
      sales: 23,
      revenue: 667.77,
      views: 1250,
      conversionRate: 1.84,
      trend: 'up'
    },
    {
      id: 2,
      name: 'Auriculares Bluetooth Pro',
      sales: 12,
      revenue: 1079.88,
      views: 890,
      conversionRate: 1.35,
      trend: 'up'
    },
    {
      id: 3,
      name: 'Set de Pinceles Profesionales',
      sales: 8,
      revenue: 360.00,
      views: 670,
      conversionRate: 1.19,
      trend: 'down'
    },
    {
      id: 4,
      name: 'Maceta Cerámica Artesanal',
      sales: 1,
      revenue: 24.50,
      views: 340,
      conversionRate: 0.29,
      trend: 'down'
    }
  ];

  const kpiData = [
    {
      title: 'Ventas Totales',
      value: '44',
      change: '+12.5%',
      trend: 'up',
      icon: 'ShoppingCart',
      color: 'text-success'
    },
    {
      title: 'Ingresos',
      value: '€2,132.15',
      change: '+8.3%',
      trend: 'up',
      icon: 'DollarSign',
      color: 'text-success'
    },
    {
      title: 'Tasa de Conversión',
      value: '1.42%',
      change: '-0.2%',
      trend: 'down',
      icon: 'Target',
      color: 'text-error'
    },
    {
      title: 'Engagement Promedio',
      value: '14.5%',
      change: '+2.1%',
      trend: 'up',
      icon: 'Heart',
      color: 'text-success'
    }
  ];

  const handleExportReport = () => {
    alert('Generando reporte... Se descargará en formato PDF');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    })?.format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Analytics del Negocio</h3>
          <p className="text-sm text-muted-foreground">
            Métricas de rendimiento y análisis de ventas
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Select
            options={timeRangeOptions}
            value={timeRange}
            onChange={setTimeRange}
            className="w-full sm:w-auto"
          />
          
          <Button
            variant="outline"
            onClick={handleExportReport}
            iconName="Download"
            iconPosition="left"
          >
            Exportar Reporte
          </Button>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData?.map((kpi, index) => (
          <div key={index} className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-primary/10`}>
                <Icon name={kpi?.icon} size={20} color="var(--color-primary)" />
              </div>
              <div className={`flex items-center space-x-1 ${kpi?.color}`}>
                <Icon 
                  name={kpi?.trend === 'up' ? 'TrendingUp' : 'TrendingDown'} 
                  size={16} 
                />
                <span className="text-sm font-medium">{kpi?.change}</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground mb-1">{kpi?.value}</p>
              <p className="text-sm text-muted-foreground">{kpi?.title}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-foreground">Ventas por Mes</h4>
            <Select
              options={metricOptions}
              value={selectedMetric}
              onChange={setSelectedMetric}
              className="w-32"
            />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey={selectedMetric === 'sales' ? 'ventas' : selectedMetric === 'revenue' ? 'ingresos' : 'vistas'} 
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Performance Pie Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h4 className="text-lg font-semibold text-foreground mb-6">Rendimiento por Producto</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productPerformance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productPerformance?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {productPerformance?.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item?.color }}
                />
                <span className="text-xs text-muted-foreground truncate">{item?.name}</span>
                <span className="text-xs font-medium text-foreground">{item?.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Video Performance Chart */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-lg font-semibold text-foreground mb-6">Rendimiento de Videos</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={videoMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--color-muted-foreground)"
                fontSize={12}
              />
              <YAxis 
                stroke="var(--color-muted-foreground)"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="vistas" 
                stroke="var(--color-primary)" 
                strokeWidth={2}
                dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="likes" 
                stroke="var(--color-accent)" 
                strokeWidth={2}
                dot={{ fill: 'var(--color-accent)', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Top Products Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h4 className="text-lg font-semibold text-foreground">Productos Más Vendidos</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-foreground">Producto</th>
                <th className="text-left p-4 font-medium text-foreground">Ventas</th>
                <th className="text-left p-4 font-medium text-foreground">Ingresos</th>
                <th className="text-left p-4 font-medium text-foreground">Vistas</th>
                <th className="text-left p-4 font-medium text-foreground">Conversión</th>
                <th className="text-left p-4 font-medium text-foreground">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {topProducts?.map((product) => (
                <tr key={product?.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-4">
                    <p className="font-medium text-foreground">{product?.name}</p>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-foreground">{product?.sales}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-foreground">
                      {formatCurrency(product?.revenue)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-foreground">{product?.views?.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-foreground">{product?.conversionRate}%</span>
                  </td>
                  <td className="p-4">
                    <div className={`flex items-center space-x-1 ${
                      product?.trend === 'up' ? 'text-success' : 'text-error'
                    }`}>
                      <Icon 
                        name={product?.trend === 'up' ? 'TrendingUp' : 'TrendingDown'} 
                        size={16} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="Users" size={20} color="var(--color-primary)" />
            <h4 className="font-semibold text-foreground">Audiencia</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Nuevos clientes</span>
              <span className="font-medium text-foreground">67%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Clientes recurrentes</span>
              <span className="font-medium text-foreground">33%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Edad promedio</span>
              <span className="font-medium text-foreground">28 años</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="MapPin" size={20} color="var(--color-primary)" />
            <h4 className="font-semibold text-foreground">Ubicaciones Top</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">España</span>
              <span className="font-medium text-foreground">45%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">México</span>
              <span className="font-medium text-foreground">23%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Argentina</span>
              <span className="font-medium text-foreground">18%</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="Clock" size={20} color="var(--color-primary)" />
            <h4 className="font-semibold text-foreground">Horarios Activos</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Mañana (6-12h)</span>
              <span className="font-medium text-foreground">25%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tarde (12-18h)</span>
              <span className="font-medium text-foreground">35%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Noche (18-24h)</span>
              <span className="font-medium text-foreground">40%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSection;