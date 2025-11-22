// src/pages/user-profile-settings/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AvatarUpload from '../../components/ui/AvatarUpload'; // Re-añadido si no estaba
import { useUser } from '../../contexts/UserContext'; // Asumiendo que UserContext maneja la información del perfil
import { usePoints } from '../../contexts/PointsContext'; // Para obtener el historial de puntos

// ===========================================
// Sub-componentes (extraídos para claridad)
// ===========================================

// --- UserProfileForm ---
const UserProfileForm = ({ userProfile, onUpdate, loading, user }) => {
  const [formData, setFormData] = useState({
    username: userProfile?.username || '',
    full_name: userProfile?.full_name || '',
    website: userProfile?.website || '',
    bio: userProfile?.bio || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || '');

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || '',
        full_name: userProfile.full_name || '',
        website: userProfile.website || '',
        bio: userProfile.bio || '',
      });
      setAvatarUrl(userProfile.avatar_url || '');
    }
  }, [userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (file, previewUrl) => {
    setAvatarFile(file);
    setAvatarUrl(previewUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onUpdate(formData, avatarFile);
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-foreground mb-6">Mi Perfil</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            onAvatarChange={handleAvatarChange}
            userId={user?.id}
            username={userProfile?.username}
          />
          <div className="flex-1 space-y-4 w-full">
            <Input
              label="Nombre de usuario"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Ej: juanito_perez"
              required
              disabled={loading}
            />
            <Input
              label="Nombre completo"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez García"
              disabled={loading}
            />
          </div>
        </div>
        <Input
          label="Sitio web"
          name="website"
          value={formData.website}
          onChange={handleChange}
          placeholder="Ej: https://misitioweb.com"
          disabled={loading}
        />
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
            Biografía
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows="4"
            placeholder="Cuéntanos algo sobre ti..."
            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
            disabled={loading}
          ></textarea>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Icon name="Loader2" className="animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            'Guardar cambios'
          )}
        </Button>
      </form>
    </div>
  );
};

// --- UserSecuritySettings ---
const UserSecuritySettings = ({ loading, onUpdatePassword }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      await onUpdatePassword(newPassword);
      setSuccess('Contraseña actualizada exitosamente.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña.');
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-foreground mb-6">Seguridad</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Ingresa tu nueva contraseña"
          required
          disabled={loading}
        />
        <Input
          label="Confirmar nueva contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirma tu nueva contraseña"
          required
          disabled={loading}
        />
        {error && (
          <p className="text-destructive text-sm flex items-center gap-1">
            <Icon name="AlertCircle" size={16} /> {error}
          </p>
        )}
        {success && (
          <p className="text-success text-sm flex items-center gap-1">
            <Icon name="CheckCircle" size={16} /> {success}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading || !newPassword || !confirmPassword}>
          {loading ? (
            <>
              <Icon name="Loader2" className="animate-spin mr-2" />
              Actualizando...
            </>
          ) : (
            'Cambiar contraseña'
          )}
        </Button>
      </form>
    </div>
  );
};

// --- UserNotificationsSettings ---
const UserNotificationsSettings = ({ loading }) => {
  const [notificationSettings, setNotificationSettings] = useState({
    email_updates: true,
    new_followers: true,
    comment_mentions: false,
    daily_digest: false,
  });

  // Placeholder para cargar y guardar configuraciones
  useEffect(() => {
    // Aquí cargarías las configuraciones actuales del usuario
    // setNotificationSettings(fetchedSettings);
  }, []);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSave = () => {
    // Aquí guardarías las configuraciones actualizadas
    console.log('Guardando configuraciones de notificación:', notificationSettings);
    // Simula una acción de guardado
    alert('Configuraciones guardadas (simulado)');
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-foreground mb-6">Notificaciones</h2>
      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="email_updates"
              checked={notificationSettings.email_updates}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary bg-input border-border"
              disabled={loading}
            />
            <span className="text-foreground text-sm font-medium">Actualizaciones por correo</span>
          </label>
          <p className="text-muted-foreground text-xs ml-8">Recibe noticias importantes y actualizaciones del sistema.</p>
        </div>
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="new_followers"
              checked={notificationSettings.new_followers}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary bg-input border-border"
              disabled={loading}
            />
            <span className="text-foreground text-sm font-medium">Nuevos seguidores</span>
          </label>
          <p className="text-muted-foreground text-xs ml-8">Notificación cuando alguien te sigue.</p>
        </div>
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="comment_mentions"
              checked={notificationSettings.comment_mentions}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary bg-input border-border"
              disabled={loading}
            />
            <span className="text-foreground text-sm font-medium">Menciones y comentarios</span>
          </label>
          <p className="text-muted-foreground text-xs ml-8">Recibe notificaciones sobre actividad en tus posts.</p>
        </div>
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="daily_digest"
              checked={notificationSettings.daily_digest}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary bg-input border-border"
              disabled={loading}
            />
            <span className="text-foreground text-sm font-medium">Resumen diario</span>
          </label>
          <p className="text-muted-foreground text-xs ml-8">Un resumen diario de lo más destacado.</p>
        </div>
        <Button onClick={handleSave} className="w-full mt-4" disabled={loading}>
          Guardar configuraciones
        </Button>
      </div>
    </div>
  );
};

// --- UserPointsHistory (Reparado) ---
const UserPointsHistory = () => {
  const { pointsHistory, missions } = usePoints(); // Asumiendo que usePoints devuelve también las misiones

  // console.log("pointsHistory:", pointsHistory); // Debugging
  // console.log("missions:", missions); // Debugging

  const getMissionName = useCallback((missionId) => {
    // ✅ Comprobación de seguridad para evitar errores si `missions` es undefined o no es un array
    if (!missions || !Array.isArray(missions)) return missionId;
    const mission = missions.find(m => m.id === missionId);
    return mission ? mission.name : missionId;
  }, [missions]);

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-foreground mb-6">Historial de Puntos</h2>

      {(!pointsHistory || pointsHistory.length === 0) ? (
        <div className="text-center py-8 text-muted-foreground">
          <Icon name="Star" size={48} className="mx-auto mb-4" />
          <p>Aún no tienes movimientos de puntos.</p>
          <p className="text-sm">¡Completa misiones para empezar a ganar!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actividad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Puntos
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {pointsHistory.map((entry, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {entry.type === 'mission_reward' ? getMissionName(entry.mission_id) : entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={entry.points > 0 ? 'text-success' : 'text-destructive'}>
                      {entry.points > 0 ? `+${entry.points}` : entry.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


// --- UserPurchases (NUEVO - Integrado desde index (90).jsx) ---
const UserPurchases = () => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    const fetchPurchases = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('user_purchases') // Asume que tienes una tabla llamada 'user_purchases'
                .select(`
                    id,
                    created_at,
                    item_name,
                    item_type,
                    price_points,
                    status
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPurchases(data || []);
        } catch (err) {
            console.error("Error fetching purchases:", err);
            setError("No se pudieron cargar tus compras. Intenta de nuevo más tarde.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchPurchases();
    }, [fetchPurchases]);

    if (!user) {
        return (
            <div className="bg-card p-6 rounded-lg shadow-sm border text-center text-muted-foreground">
                <Icon name="Lock" size={48} className="mx-auto mb-4" />
                <p>Inicia sesión para ver tus compras.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-card p-6 rounded-lg shadow-sm border text-center text-muted-foreground">
                <Icon name="Loader2" size={48} className="mx-auto mb-4 animate-spin" />
                <p>Cargando tus compras...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-card p-6 rounded-lg shadow-sm border text-center text-destructive">
                <Icon name="AlertCircle" size={48} className="mx-auto mb-4" />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-card p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-bold text-foreground mb-6">Mis Compras</h2>

            {purchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Icon name="ShoppingCart" size={48} className="mx-auto mb-4" />
                    <p>Aún no has realizado ninguna compra.</p>
                    <p className="text-sm">Explora nuestra tienda para empezar.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Artículo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Costo (Puntos)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {purchases.map((purchase) => (
                                <tr key={purchase.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {new Date(purchase.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                        {purchase.item_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {purchase.item_type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-destructive">
                                        -{purchase.price_points}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            purchase.status === 'completed' ? 'bg-success/10 text-success' :
                                            purchase.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                            'bg-destructive/10 text-destructive'
                                        }`}>
                                            {purchase.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


// --- SettingsSidebar ---
const SettingsSidebar = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border h-full">
      <nav className="space-y-2">
        <button
          onClick={() => onTabChange('profile')}
          className={`w-full flex items-center p-3 rounded-md transition-colors text-left ${
            activeTab === 'profile'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Icon name="User" size={20} className="mr-3" />
          Perfil
        </button>
        <button
          onClick={() => onTabChange('security')}
          className={`w-full flex items-center p-3 rounded-md transition-colors text-left ${
            activeTab === 'security'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Icon name="Lock" size={20} className="mr-3" />
          Seguridad
        </button>
        <button
          onClick={() => onTabChange('notifications')}
          className={`w-full flex items-center p-3 rounded-md transition-colors text-left ${
            activeTab === 'notifications'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Icon name="Bell" size={20} className="mr-3" />
          Notificaciones
        </button>
        <button
          onClick={() => onTabChange('points')}
          className={`w-full flex items-center p-3 rounded-md transition-colors text-left ${
            activeTab === 'points'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Icon name="Star" size={20} className="mr-3" />
          Puntos
        </button>
        {/* ✅ NUEVO: Pestaña Mis Compras */}
        <button
          onClick={() => onTabChange('purchases')}
          className={`w-full flex items-center p-3 rounded-md transition-colors text-left ${
            activeTab === 'purchases'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Icon name="ShoppingCart" size={20} className="mr-3" />
          Mis Compras
        </button>
      </nav>
    </div>
  );
};


// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================

const UserProfileSettings = () => {
  const { user, signOut, refreshUserSession } = useAuth();
  const { userProfile, loading: profileLoading, fetchUserProfile, updateProfile } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Redirigir si no hay usuario
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      fetchUserProfile(user.id);
    }
  }, [user, navigate, fetchUserProfile]);

  // Manejar el activeTab desde la URL (si se envía)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && ['profile', 'security', 'notifications', 'points', 'purchases'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  const handleUpdateProfile = async (formData, avatarFile) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile(user.id, formData, avatarFile);
      setSuccess('Perfil actualizado exitosamente.');
      await refreshUserSession(); // Asegura que el estado del usuario esté actualizado
    } catch (err) {
      setError(err.message || 'Error al actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (newPassword) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('Contraseña actualizada con éxito. Por favor, inicia sesión de nuevo.');
      await signOut(); // Forzar re-login por seguridad
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña.');
      throw err; // Re-lanza para que el componente de seguridad lo capture
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading || !userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={48} className="animate-spin text-primary" />
        <p className="ml-4 text-foreground">Cargando ajustes del perfil...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Ajustes de Perfil - {userProfile?.username || 'Usuario'} | RADEISAN</title>
        <meta name="description" content="Gestiona la configuración de tu perfil, seguridad, notificaciones y más." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-32 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-foreground mb-10">Ajustes</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar de Navegación */}
              <div className="lg:col-span-1">
                <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
              </div>

              {/* Contenido Principal de la Pestaña */}
              <div className="lg:col-span-3">
                {error && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-3">
                    <Icon name="AlertCircle" size={20} className="text-destructive flex-shrink-0" />
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center space-x-3">
                    <Icon name="CheckCircle" size={20} className="text-success flex-shrink-0" />
                    <p className="text-success text-sm">{success}</p>
                  </div>
                )}

                {activeTab === 'profile' && (
                  <UserProfileForm
                    userProfile={userProfile}
                    onUpdate={handleUpdateProfile}
                    loading={loading}
                    user={user}
                  />
                )}
                {activeTab === 'security' && (
                  <UserSecuritySettings
                    loading={loading}
                    onUpdatePassword={handleUpdatePassword}
                  />
                )}
                {activeTab === 'notifications' && (
                  <UserNotificationsSettings loading={loading} />
                )}
                {activeTab === 'points' && (
                  <UserPointsHistory />
                )}
                {/* ✅ NUEVO: Renderizado de Mis Compras */}
                {activeTab === 'purchases' && (
                    <UserPurchases />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default UserProfileSettings;
