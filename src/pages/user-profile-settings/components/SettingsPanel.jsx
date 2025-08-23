import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const SettingsPanel = ({ user, onUpdateSettings }) => {
  const [activeSection, setActiveSection] = useState('account');
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      marketing: false,
      social: true
    },
    privacy: {
      profilePublic: true,
      showFollowers: true,
      showLikes: true,
      allowMessages: true
    },
    preferences: {
      language: 'es',
      theme: 'system',
      autoplay: true,
      quality: 'auto'
    }
  });

  const sections = [
    {
      id: 'account',
      label: 'Cuenta',
      icon: 'User'
    },
    {
      id: 'privacy',
      label: 'Privacidad',
      icon: 'Shield'
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: 'Bell'
    },
    {
      id: 'preferences',
      label: 'Preferencias',
      icon: 'Settings'
    },
    {
      id: 'security',
      label: 'Seguridad',
      icon: 'Lock'
    }
  ];

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [key]: value
      }
    }));
  };

  const renderAccountSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Información Personal</h3>
        <div className="space-y-4">
          <Input
            label="Nombre completo"
            type="text"
            value={user?.name}
            placeholder="Tu nombre completo"
          />
          <Input
            label="Nombre de usuario"
            type="text"
            value={user?.username}
            placeholder="@usuario"
            description="Tu nombre de usuario único"
          />
          <Input
            label="Email"
            type="email"
            value={user?.email}
            placeholder="tu@email.com"
          />
          <Input
            label="Biografía"
            type="text"
            value={user?.bio || ''}
            placeholder="Cuéntanos sobre ti..."
            description="Máximo 160 caracteres"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <h4 className="font-medium text-foreground mb-3">Cuenta de Negocio</h4>
        {user?.isBusinessAccount ? (
          <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
            <div className="flex items-center space-x-3">
              <Icon name="Building2" size={20} color="var(--color-accent)" />
              <div>
                <p className="font-medium text-foreground">Cuenta Business Activa</p>
                <p className="text-sm text-muted-foreground">Puedes vender productos en el marketplace</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Gestionar
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Upgrade a Business</p>
              <p className="text-sm text-muted-foreground">Comienza a vender productos y gana más puntos</p>
            </div>
            <Button variant="default" size="sm">
              Actualizar
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Configuración de Privacidad</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Perfil público</p>
              <p className="text-sm text-muted-foreground">Permite que otros usuarios vean tu perfil</p>
            </div>
            <Checkbox
              checked={settings?.privacy?.profilePublic}
              onChange={(e) => handleSettingChange('privacy', 'profilePublic', e?.target?.checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Mostrar seguidores</p>
              <p className="text-sm text-muted-foreground">Otros pueden ver tu lista de seguidores</p>
            </div>
            <Checkbox
              checked={settings?.privacy?.showFollowers}
              onChange={(e) => handleSettingChange('privacy', 'showFollowers', e?.target?.checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Mostrar me gusta</p>
              <p className="text-sm text-muted-foreground">Otros pueden ver los videos que te gustan</p>
            </div>
            <Checkbox
              checked={settings?.privacy?.showLikes}
              onChange={(e) => handleSettingChange('privacy', 'showLikes', e?.target?.checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Permitir mensajes</p>
              <p className="text-sm text-muted-foreground">Otros usuarios pueden enviarte mensajes</p>
            </div>
            <Checkbox
              checked={settings?.privacy?.allowMessages}
              onChange={(e) => handleSettingChange('privacy', 'allowMessages', e?.target?.checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Preferencias de Notificación</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Notificaciones por email</p>
              <p className="text-sm text-muted-foreground">Recibe actualizaciones importantes por correo</p>
            </div>
            <Checkbox
              checked={settings?.notifications?.email}
              onChange={(e) => handleSettingChange('notifications', 'email', e?.target?.checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Notificaciones push</p>
              <p className="text-sm text-muted-foreground">Alertas en tiempo real en tu dispositivo</p>
            </div>
            <Checkbox
              checked={settings?.notifications?.push}
              onChange={(e) => handleSettingChange('notifications', 'push', e?.target?.checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Actividad social</p>
              <p className="text-sm text-muted-foreground">Nuevos seguidores, me gusta y comentarios</p>
            </div>
            <Checkbox
              checked={settings?.notifications?.social}
              onChange={(e) => handleSettingChange('notifications', 'social', e?.target?.checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Marketing y promociones</p>
              <p className="text-sm text-muted-foreground">Ofertas especiales y nuevas funciones</p>
            </div>
            <Checkbox
              checked={settings?.notifications?.marketing}
              onChange={(e) => handleSettingChange('notifications', 'marketing', e?.target?.checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Seguridad de la Cuenta</h3>
        <div className="space-y-4">
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">Cambiar contraseña</p>
                <p className="text-sm text-muted-foreground">Actualiza tu contraseña regularmente</p>
              </div>
              <Button variant="outline" size="sm">
                Cambiar
              </Button>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">Autenticación de dos factores</p>
                <p className="text-sm text-muted-foreground">Añade una capa extra de seguridad</p>
              </div>
              <Button variant="default" size="sm">
                Activar
              </Button>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">Sesiones activas</p>
                <p className="text-sm text-muted-foreground">Gestiona dispositivos conectados</p>
              </div>
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </div>
          </div>

          <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Icon name="AlertTriangle" size={20} color="var(--color-error)" />
              <div>
                <p className="font-medium text-error">Eliminar cuenta</p>
                <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <Button variant="destructive" size="sm">
              Eliminar cuenta
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return renderAccountSection();
      case 'privacy':
        return renderPrivacySection();
      case 'notifications':
        return renderNotificationsSection();
      case 'security':
        return renderSecuritySection();
      default:
        return renderAccountSection();
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-card border border-border rounded-lg p-2">
            {sections?.map((section) => (
              <button
                key={section?.id}
                onClick={() => setActiveSection(section?.id)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${activeSection === section?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                <Icon 
                  name={section?.icon} 
                  size={16} 
                  color={activeSection === section?.id ? 'white' : 'currentColor'} 
                />
                <span>{section?.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="bg-card border border-border rounded-lg p-6">
            {renderContent()}
            
            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-border mt-6">
              <Button
                variant="default"
                onClick={() => onUpdateSettings(settings)}
                iconName="Save"
                iconPosition="left"
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;