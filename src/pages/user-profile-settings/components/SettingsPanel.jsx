import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';
import ProfileImageEditor from '../../../components/ProfileImageEditor';

const SettingsPanel = ({ 
  user, 
  onUpdateSettings, 
  loading = false,
  onUploadAvatar,
  onUploadCover,
  onSignOut,
  editing = false,
  onCancelEdit
}) => {
  const [activeSection, setActiveSection] = useState('account');
  
  // ✅ Estado para datos del perfil (información personal)
  const [profileData, setProfileData] = useState({
    full_name: '',
    username: '',
    email: '',
    bio: ''
  });

  // Estado para configuraciones (notificaciones, privacidad, etc)
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

  // ✅ Cargar datos del usuario cuando cambia
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.name || user.fullName || user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

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

  // ✅ Handler para cambios en datos de perfil
  const handleProfileDataChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [key]: value
      }
    }));
  };

  // 🆕 Handlers para el ProfileImageEditor
  const handleAvatarChange = async (url) => {
    if (onUploadAvatar) {
      // El ProfileImageEditor ya maneja la compresión y crop
      // Solo necesitamos crear un File object mock para mantener compatibilidad
      console.log('Avatar updated:', url);
    }
  };

  const handleCoverChange = async (url) => {
    if (onUploadCover) {
      // El ProfileImageEditor ya maneja la compresión y crop
      // Solo necesitamos crear un File object mock para mantener compatibilidad
      console.log('Cover updated:', url);
    }
  };

  const renderAccountSection = () => (
    <div className="space-y-6">
      {/* Imágenes de Perfil */}
      <div className="border-b border-border pb-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Imágenes de Perfil</h3>
        <div className="bg-muted/30 rounded-lg p-4">
          <ProfileImageEditor
            currentAvatar={user?.avatar}
            currentCover={user?.coverImage}
            onAvatarChange={handleAvatarChange}
            onCoverChange={handleCoverChange}
            loading={loading}
          />
        </div>
      </div>

      {/* Información Personal */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Información Personal</h3>
        <div className="space-y-4">
          <Input
            label="Nombre completo"
            type="text"
            value={profileData.full_name}
            onChange={(e) => handleProfileDataChange('full_name', e.target.value)}
            placeholder="Tu nombre completo"
            disabled={loading}
          />
          <Input
            label="Nombre de usuario"
            type="text"
            value={profileData.username}
            onChange={(e) => handleProfileDataChange('username', e.target.value)}
            placeholder="@usuario"
            description="Tu nombre de usuario único"
            disabled={loading}
          />
          <Input
            label="Email"
            type="email"
            value={profileData.email}
            onChange={(e) => handleProfileDataChange('email', e.target.value)}
            placeholder="tu@email.com"
            disabled={loading}
          />
          
          {/* ✅ BIOGRAFÍA MEJORADA - Textarea con contador */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-1">
              Biografía
            </label>
            <textarea
              id="bio"
              name="bio"
              value={profileData.bio}
              onChange={(e) => {
                const value = e.target.value;
                // Limitar a 160 caracteres
                if (value.length <= 160) {
                  handleProfileDataChange('bio', value);
                }
              }}
              rows={3}
              maxLength={160}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Cuéntanos sobre ti..."
              disabled={loading}
            />
            <div className="mt-1 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Máximo 160 caracteres
              </p>
              <p className="text-xs text-muted-foreground">
                {profileData.bio.length}/160
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ❌ ELIMINADO: Sección "Cuenta de Negocio" */}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // 🆕 Nueva sección de preferencias mejorada
  const renderPreferencesSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Preferencias de la Aplicación</h3>
        <div className="space-y-4">
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">Idioma</p>
                <p className="text-sm text-muted-foreground">Selecciona tu idioma preferido</p>
              </div>
              <select 
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                value={settings?.preferences?.language}
                onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                disabled={loading}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">Tema</p>
                <p className="text-sm text-muted-foreground">Personaliza la apariencia</p>
              </div>
              <select 
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                value={settings?.preferences?.theme}
                onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                disabled={loading}
              >
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Reproducción automática</p>
              <p className="text-sm text-muted-foreground">Los videos se reproducen automáticamente</p>
            </div>
            <Checkbox
              checked={settings?.preferences?.autoplay}
              onChange={(e) => handleSettingChange('preferences', 'autoplay', e?.target?.checked)}
              disabled={loading}
            />
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">Calidad de video</p>
                <p className="text-sm text-muted-foreground">Calidad por defecto para reproducción</p>
              </div>
              <select 
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                value={settings?.preferences?.quality}
                onChange={(e) => handleSettingChange('preferences', 'quality', e.target.value)}
                disabled={loading}
              >
                <option value="auto">Automática</option>
                <option value="1080p">1080p HD</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
              </select>
            </div>
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
              <Button variant="outline" size="sm" disabled={loading}>
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
              <Button variant="default" size="sm" disabled={loading}>
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
              <Button variant="outline" size="sm" disabled={loading}>
                Ver todas
              </Button>
            </div>
          </div>

          {/* 🆕 Sección de cerrar sesión */}
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Icon name="LogOut" size={20} color="var(--color-warning)" />
                <div>
                  <p className="font-medium text-warning">Cerrar sesión</p>
                  <p className="text-sm text-muted-foreground">Cierra sesión en este dispositivo</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={loading}
                onClick={onSignOut}
              >
                Cerrar sesión
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
            <Button variant="destructive" size="sm" disabled={loading}>
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
      case 'preferences':
        return renderPreferencesSection(); // 🆕 Mejorada
      case 'security':
        return renderSecuritySection();
      default:
        return renderAccountSection();
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* 🆕 Header con indicador de carga */}
      {loading && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-primary font-medium">Actualizando perfil...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-card border border-border rounded-lg p-2">
            {sections?.map((section) => (
              <button
                key={section?.id}
                onClick={() => setActiveSection(section?.id)}
                disabled={loading}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${activeSection === section?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
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
            <div className="flex justify-between pt-6 border-t border-border mt-6">
              {/* Botón cancelar edición */}
              {editing && onCancelEdit && (
                <Button
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              )}
              
              <Button
                variant="default"
                onClick={() => {
                  // ✅ Enviar solo profileData (sin settings que no existen en DB)
                  onUpdateSettings(profileData);
                }}
                iconName="Save"
                iconPosition="left"
                disabled={loading}
                className="ml-auto"
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
