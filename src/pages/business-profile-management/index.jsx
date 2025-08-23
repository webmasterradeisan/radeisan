import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';

// Import components
import ProfileSetupSection from './components/ProfileSetupSection';
import ProductManagementSection from './components/ProductManagementSection';
import VideoContentSection from './components/VideoContentSection';
import AnalyticsSection from './components/AnalyticsSection';
import SettingsSection from './components/SettingsSection';

const BusinessProfileManagement = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [businessData, setBusinessData] = useState({
    businessName: 'Mi Negocio Online',
    description: 'Tienda especializada en productos únicos y de calidad',
    category: 'fashion',
    phone: '+34 600 123 456',
    email: 'contacto@minegocio.com',
    website: 'https://www.minegocio.com',
    address: 'Calle Principal 123, 28001 Madrid',
    city: 'Madrid',
    country: 'es',
    logo: '',
    banner: '',
    isVerified: false
  });

  const [isBusinessAccount, setIsBusinessAccount] = useState(true);

  useEffect(() => {
    // Check if user has business account
    const hasBusinessAccount = localStorage.getItem('hasBusinessAccount') === 'true';
    setIsBusinessAccount(hasBusinessAccount);
  }, []);

  const tabs = [
    {
      id: 'profile',
      label: 'Configuración del Perfil',
      icon: 'Building2',
      description: 'Información básica y verificación'
    },
    {
      id: 'products',
      label: 'Gestión de Productos',
      icon: 'Package',
      description: 'Inventario y catálogo'
    },
    {
      id: 'videos',
      label: 'Contenido de Video',
      icon: 'Video',
      description: 'Videos promocionales y tutoriales'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart3',
      description: 'Métricas y rendimiento'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'Settings',
      description: 'Preferencias y ajustes'
    }
  ];

  const handleBusinessDataUpdate = (updatedData) => {
    setBusinessData(updatedData);
  };

  const handleCreateBusinessAccount = () => {
    localStorage.setItem('hasBusinessAccount', 'true');
    setIsBusinessAccount(true);
    alert('¡Cuenta de negocio creada exitosamente! Ahora puedes comenzar a vender tus productos.');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <ProfileSetupSection
            businessData={businessData}
            onUpdate={handleBusinessDataUpdate}
          />
        );
      case 'products':
        return (
          <ProductManagementSection
            products={[]}
            onProductUpdate={() => {}}
          />
        );
      case 'videos':
        return (
          <VideoContentSection
            videos={[]}
            products={[]}
            onVideoUpdate={() => {}}
          />
        );
      case 'analytics':
        return <AnalyticsSection />;
      case 'settings':
        return (
          <SettingsSection
            settings={{}}
            onSettingsUpdate={() => {}}
          />
        );
      default:
        return (
          <ProfileSetupSection
            businessData={businessData}
            onUpdate={handleBusinessDataUpdate}
          />
        );
    }
  };

  // If user doesn't have business account, show creation flow
  if (!isBusinessAccount) {
    return (
      <>
        <Helmet>
          <title>Crear Cuenta de Negocio - VideoRewards</title>
          <meta name="description" content="Crea tu cuenta de negocio en VideoRewards y comienza a vender productos a través de videos." />
        </Helmet>

        <div className="min-h-screen bg-background">
          <Header />
          <PrimaryNavigation />
          
          <main className="pt-32 lg:pt-28 pb-20 lg:pb-8">
            <div className="max-w-4xl mx-auto px-4 lg:px-6">
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="Building2" size={48} color="var(--color-primary)" />
                </div>
                
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Crea tu Cuenta de Negocio
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Transforma tu pasión en un negocio rentable. Vende productos únicos, 
                  crea contenido atractivo y conecta con clientes que valoran tu trabajo.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon name="Video" size={24} color="var(--color-accent)" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Contenido Atractivo</h3>
                    <p className="text-sm text-muted-foreground">
                      Crea videos promocionales que muestren tus productos en acción
                    </p>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon name="ShoppingCart" size={24} color="var(--color-success)" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Ventas Directas</h3>
                    <p className="text-sm text-muted-foreground">
                      Vende directamente a través de la plataforma sin intermediarios
                    </p>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon name="TrendingUp" size={24} color="var(--color-secondary)" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Analytics Detallados</h3>
                    <p className="text-sm text-muted-foreground">
                      Analiza el rendimiento de tus productos y optimiza tus ventas
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-border p-8 mb-8">
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    ¿Qué incluye tu cuenta de negocio?
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="flex items-center space-x-3">
                      <Icon name="Check" size={16} color="var(--color-success)" />
                      <span className="text-sm text-foreground">Perfil de negocio verificado</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Icon name="Check" size={16} color="var(--color-success)" />
                      <span className="text-sm text-foreground">Gestión ilimitada de productos</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Icon name="Check" size={16} color="var(--color-success)" />
                      <span className="text-sm text-foreground">Herramientas de video marketing</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Icon name="Check" size={16} color="var(--color-success)" />
                      <span className="text-sm text-foreground">Analytics avanzados</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Icon name="Check" size={16} color="var(--color-success)" />
                      <span className="text-sm text-foreground">Procesamiento de pagos integrado</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Icon name="Check" size={16} color="var(--color-success)" />
                      <span className="text-sm text-foreground">Soporte prioritario</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="default"
                  size="lg"
                  onClick={handleCreateBusinessAccount}
                  iconName="ArrowRight"
                  iconPosition="right"
                  className="px-8"
                >
                  Crear Cuenta de Negocio Gratis
                </Button>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Sin costos mensuales • Solo comisión por venta • Cancela cuando quieras
                </p>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestión de Negocio - VideoRewards</title>
        <meta name="description" content="Gestiona tu negocio en VideoRewards: productos, videos, analytics y configuración." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32 lg:pt-28 pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="Building2" size={20} color="var(--color-primary)" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Gestión de Negocio</h1>
                  <p className="text-muted-foreground">
                    Administra tu tienda, productos y contenido desde un solo lugar
                  </p>
                </div>
              </div>

              {/* Business Status */}
              <div className="flex items-center space-x-4 p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-sm font-medium text-foreground">Cuenta Activa</span>
                </div>
                {businessData?.isVerified && (
                  <div className="flex items-center space-x-2">
                    <Icon name="CheckCircle" size={16} color="var(--color-success)" />
                    <span className="text-sm font-medium text-success">Verificado</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Icon name="Package" size={16} color="var(--color-muted-foreground)" />
                  <span className="text-sm text-muted-foreground">4 productos activos</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-8">
              <div className="border-b border-border">
                <nav className="flex space-x-8 overflow-x-auto">
                  {tabs?.map((tab) => (
                    <button
                      key={tab?.id}
                      onClick={() => setActiveTab(tab?.id)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === tab?.id
                          ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                      }`}
                    >
                      <Icon 
                        name={tab?.icon} 
                        size={16} 
                        color={activeTab === tab?.id ? 'var(--color-primary)' : 'currentColor'}
                      />
                      <span>{tab?.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              
              {/* Tab Description */}
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {tabs?.find(tab => tab?.id === activeTab)?.description}
                </p>
              </div>
            </div>

            {/* Tab Content */}
            <div className="mb-8">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default BusinessProfileManagement;