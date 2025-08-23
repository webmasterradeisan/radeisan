import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const SettingsSection = ({ settings, onSettingsUpdate }) => {
  const [formData, setFormData] = useState({
    // Business Settings
    businessHours: settings?.businessHours || {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true }
    },
    
    // Notification Settings
    notifications: settings?.notifications || {
      newOrders: true,
      lowStock: true,
      customerMessages: true,
      videoComments: true,
      weeklyReports: true,
      marketingUpdates: false
    },
    
    // Payment Settings
    paymentMethods: settings?.paymentMethods || {
      creditCard: true,
      paypal: true,
      bankTransfer: false,
      cashOnDelivery: false
    },
    
    // Shipping Settings
    shipping: settings?.shipping || {
      freeShippingThreshold: 50,
      standardShippingCost: 5.99,
      expressShippingCost: 12.99,
      internationalShipping: false,
      processingTime: '1-2'
    },
    
    // Privacy Settings
    privacy: settings?.privacy || {
      showBusinessHours: true,
      showContactInfo: true,
      allowReviews: true,
      showSalesCount: true,
      publicProfile: true
    },
    
    // Tax Settings
    tax: settings?.tax || {
      taxRate: 21,
      taxIncluded: true,
      taxNumber: '',
      invoicePrefix: 'INV-'
    }
  });

  const [activeSection, setActiveSection] = useState('business');

  const processingTimeOptions = [
    { value: '1-2', label: '1-2 días laborables' },
    { value: '3-5', label: '3-5 días laborables' },
    { value: '1-2w', label: '1-2 semanas' },
    { value: 'custom', label: 'Personalizado' }
  ];

  const dayNames = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  const handleInputChange = (section, field, value) => {
    const updatedData = {
      ...formData,
      [section]: {
        ...formData?.[section],
        [field]: value
      }
    };
    setFormData(updatedData);
    if (onSettingsUpdate) {
      onSettingsUpdate(updatedData);
    }
  };

  const handleBusinessHoursChange = (day, field, value) => {
    const updatedData = {
      ...formData,
      businessHours: {
        ...formData?.businessHours,
        [day]: {
          ...formData?.businessHours?.[day],
          [field]: value
        }
      }
    };
    setFormData(updatedData);
    if (onSettingsUpdate) {
      onSettingsUpdate(updatedData);
    }
  };

  const handleSaveSettings = () => {
    alert('Configuración guardada exitosamente');
  };

  const settingSections = [
    { id: 'business', label: 'Negocio', icon: 'Building2' },
    { id: 'notifications', label: 'Notificaciones', icon: 'Bell' },
    { id: 'payments', label: 'Pagos', icon: 'CreditCard' },
    { id: 'shipping', label: 'Envíos', icon: 'Truck' },
    { id: 'privacy', label: 'Privacidad', icon: 'Shield' },
    { id: 'tax', label: 'Impuestos', icon: 'Receipt' }
  ];

  const renderBusinessSettings = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">Horarios de Atención</h4>
        <div className="space-y-4">
          {Object.entries(formData?.businessHours)?.map(([day, hours]) => (
            <div key={day} className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
              <div className="w-24">
                <span className="font-medium text-foreground">{dayNames?.[day]}</span>
              </div>
              
              <Checkbox
                label="Cerrado"
                checked={hours?.closed}
                onChange={(e) => handleBusinessHoursChange(day, 'closed', e?.target?.checked)}
              />
              
              {!hours?.closed && (
                <>
                  <Input
                    type="time"
                    value={hours?.open}
                    onChange={(e) => handleBusinessHoursChange(day, 'open', e?.target?.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">a</span>
                  <Input
                    type="time"
                    value={hours?.close}
                    onChange={(e) => handleBusinessHoursChange(day, 'close', e?.target?.value)}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">Preferencias de Notificación</h4>
        <div className="space-y-4">
          <Checkbox
            label="Nuevos pedidos"
            description="Recibir notificaciones cuando lleguen nuevos pedidos"
            checked={formData?.notifications?.newOrders}
            onChange={(e) => handleInputChange('notifications', 'newOrders', e?.target?.checked)}
          />
          
          <Checkbox
            label="Stock bajo"
            description="Alertas cuando los productos tengan poco inventario"
            checked={formData?.notifications?.lowStock}
            onChange={(e) => handleInputChange('notifications', 'lowStock', e?.target?.checked)}
          />
          
          <Checkbox
            label="Mensajes de clientes"
            description="Notificaciones de consultas y mensajes de clientes"
            checked={formData?.notifications?.customerMessages}
            onChange={(e) => handleInputChange('notifications', 'customerMessages', e?.target?.checked)}
          />
          
          <Checkbox
            label="Comentarios en videos"
            description="Nuevos comentarios en tus videos promocionales"
            checked={formData?.notifications?.videoComments}
            onChange={(e) => handleInputChange('notifications', 'videoComments', e?.target?.checked)}
          />
          
          <Checkbox
            label="Reportes semanales"
            description="Resumen semanal de ventas y métricas"
            checked={formData?.notifications?.weeklyReports}
            onChange={(e) => handleInputChange('notifications', 'weeklyReports', e?.target?.checked)}
          />
          
          <Checkbox
            label="Actualizaciones de marketing"
            description="Consejos y novedades para hacer crecer tu negocio"
            checked={formData?.notifications?.marketingUpdates}
            onChange={(e) => handleInputChange('notifications', 'marketingUpdates', e?.target?.checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">Métodos de Pago Aceptados</h4>
        <div className="space-y-4">
          <Checkbox
            label="Tarjetas de crédito/débito"
            description="Visa, Mastercard, American Express"
            checked={formData?.paymentMethods?.creditCard}
            onChange={(e) => handleInputChange('paymentMethods', 'creditCard', e?.target?.checked)}
          />
          
          <Checkbox
            label="PayPal"
            description="Pagos seguros a través de PayPal"
            checked={formData?.paymentMethods?.paypal}
            onChange={(e) => handleInputChange('paymentMethods', 'paypal', e?.target?.checked)}
          />
          
          <Checkbox
            label="Transferencia bancaria"
            description="Pago directo a cuenta bancaria"
            checked={formData?.paymentMethods?.bankTransfer}
            onChange={(e) => handleInputChange('paymentMethods', 'bankTransfer', e?.target?.checked)}
          />
          
          <Checkbox
            label="Pago contra entrega"
            description="Pago en efectivo al recibir el producto"
            checked={formData?.paymentMethods?.cashOnDelivery}
            onChange={(e) => handleInputChange('paymentMethods', 'cashOnDelivery', e?.target?.checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderShippingSettings = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">Configuración de Envíos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Envío gratuito desde (€)"
            type="number"
            placeholder="50"
            value={formData?.shipping?.freeShippingThreshold}
            onChange={(e) => handleInputChange('shipping', 'freeShippingThreshold', parseFloat(e?.target?.value))}
          />
          
          <Input
            label="Costo envío estándar (€)"
            type="number"
            placeholder="5.99"
            value={formData?.shipping?.standardShippingCost}
            onChange={(e) => handleInputChange('shipping', 'standardShippingCost', parseFloat(e?.target?.value))}
          />
          
          <Input
            label="Costo envío express (€)"
            type="number"
            placeholder="12.99"
            value={formData?.shipping?.expressShippingCost}
            onChange={(e) => handleInputChange('shipping', 'expressShippingCost', parseFloat(e?.target?.value))}
          />
          
          <Select
            label="Tiempo de procesamiento"
            options={processingTimeOptions}
            value={formData?.shipping?.processingTime}
            onChange={(value) => handleInputChange('shipping', 'processingTime', value)}
          />
        </div>
        
        <div className="mt-4">
          <Checkbox
            label="Envíos internacionales"
            description="Permitir envíos fuera del país"
            checked={formData?.shipping?.internationalShipping}
            onChange={(e) => handleInputChange('shipping', 'internationalShipping', e?.target?.checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">Configuración de Privacidad</h4>
        <div className="space-y-4">
          <Checkbox
            label="Mostrar horarios de atención"
            description="Los clientes pueden ver tus horarios de atención"
            checked={formData?.privacy?.showBusinessHours}
            onChange={(e) => handleInputChange('privacy', 'showBusinessHours', e?.target?.checked)}
          />
          
          <Checkbox
            label="Mostrar información de contacto"
            description="Teléfono y email visibles en el perfil público"
            checked={formData?.privacy?.showContactInfo}
            onChange={(e) => handleInputChange('privacy', 'showContactInfo', e?.target?.checked)}
          />
          
          <Checkbox
            label="Permitir reseñas"
            description="Los clientes pueden dejar reseñas de productos"
            checked={formData?.privacy?.allowReviews}
            onChange={(e) => handleInputChange('privacy', 'allowReviews', e?.target?.checked)}
          />
          
          <Checkbox
            label="Mostrar número de ventas"
            description="Mostrar cuántas veces se ha vendido cada producto"
            checked={formData?.privacy?.showSalesCount}
            onChange={(e) => handleInputChange('privacy', 'showSalesCount', e?.target?.checked)}
          />
          
          <Checkbox
            label="Perfil público"
            description="Tu negocio aparece en búsquedas y directorios"
            checked={formData?.privacy?.publicProfile}
            onChange={(e) => handleInputChange('privacy', 'publicProfile', e?.target?.checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderTaxSettings = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4">Configuración de Impuestos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Tasa de impuesto (%)"
            type="number"
            placeholder="21"
            value={formData?.tax?.taxRate}
            onChange={(e) => handleInputChange('tax', 'taxRate', parseFloat(e?.target?.value))}
          />
          
          <Input
            label="Número de identificación fiscal"
            type="text"
            placeholder="ESB12345678"
            value={formData?.tax?.taxNumber}
            onChange={(e) => handleInputChange('tax', 'taxNumber', e?.target?.value)}
          />
          
          <Input
            label="Prefijo de factura"
            type="text"
            placeholder="INV-"
            value={formData?.tax?.invoicePrefix}
            onChange={(e) => handleInputChange('tax', 'invoicePrefix', e?.target?.value)}
          />
        </div>
        
        <div className="mt-4">
          <Checkbox
            label="Precios incluyen impuestos"
            description="Los precios mostrados ya incluyen los impuestos"
            checked={formData?.tax?.taxIncluded}
            onChange={(e) => handleInputChange('tax', 'taxIncluded', e?.target?.checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'business':
        return renderBusinessSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'payments':
        return renderPaymentSettings();
      case 'shipping':
        return renderShippingSettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'tax':
        return renderTaxSettings();
      default:
        return renderBusinessSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Configuración del Negocio</h3>
          <p className="text-sm text-muted-foreground">
            Personaliza la configuración de tu negocio y preferencias
          </p>
        </div>
        
        <Button
          variant="default"
          onClick={handleSaveSettings}
          iconName="Save"
          iconPosition="left"
        >
          Guardar Cambios
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border border-border p-4">
            <nav className="space-y-2">
              {settingSections?.map((section) => (
                <button
                  key={section?.id}
                  onClick={() => setActiveSection(section?.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon 
                    name={section?.icon} 
                    size={16} 
                    color={activeSection === section?.id ? 'white' : 'currentColor'}
                  />
                  <span className="font-medium">{section?.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-lg border border-border p-6">
            {renderActiveSection()}
          </div>
        </div>
      </div>
      {/* Danger Zone */}
      <div className="bg-card rounded-lg border border-error p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Icon name="AlertTriangle" size={20} color="var(--color-error)" />
          <h4 className="text-lg font-semibold text-error">Zona de Peligro</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="font-medium text-foreground">Desactivar cuenta de negocio</p>
              <p className="text-sm text-muted-foreground">
                Tu perfil de negocio será ocultado temporalmente
              </p>
            </div>
            <Button variant="outline" size="sm">
              Desactivar
            </Button>
          </div>
          
          <div className="border-t border-error/20 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div>
                <p className="font-medium text-foreground">Eliminar cuenta de negocio</p>
                <p className="text-sm text-muted-foreground">
                  Esta acción no se puede deshacer. Todos los datos se perderán permanentemente.
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Eliminar Cuenta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;