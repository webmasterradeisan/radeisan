// src/pages/user-profile-settings/index.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Image from '../../components/AppImage';
import useIsMobile from '../../hooks/useIsMobile';

// ✅ IMPORTAR COMPONENTE DE HISTORIAL DE COMPRAS
import UserOrdersTab from './components/UserOrdersTab';

const UserProfileSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  
  // Estados para contenido
  const [videos, setVideos] = useState([]);
  const [reels, setReels] = useState([]);
  const [photos, setPhotos] = useState([]); // ✅ Estado para fotos
  const [savedVideos, setSavedVideos] = useState([]);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    likes: 0,
    views: 0
  });

  // Estado para edición
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    website: ''
  });

  // Tabs de navegación
  const tabs = [
    { id: 'videos', label: 'Mis Videos', icon: 'Video' },
    { id: 'reels', label: 'Mis Reels', icon: 'Smartphone' },
    { id: 'photos', label: 'Mis Fotos', icon: 'Image' },
    // ✅ CAMBIO: 'Marketplace' ahora es 'Mis Compras'
    { id: 'orders', label: 'Mis Compras', icon: 'ShoppingBag' },
    { id: 'saved', label: 'Guardados', icon: 'Bookmark' },
    { id: 'settings', label: 'Configuración', icon: 'Settings' }
  ];

  useEffect(() => {
    if (user) {
      loadProfile();
      loadContent();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setEditForm({
        full_name: data.full_name || '',
        username: data.username || '',
        bio: data.bio || '',
        website: data.website || ''
      });
      
      // Cargar estadísticas reales
      setStats({
        followers: data.followers_count || 0,
        following: data.following_count || 0,
        likes: data.total_likes || 0,
        views: data.total_views || 0
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    try {
      // 1. Cargar Videos (Horizontales)
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_published', true)
        .neq('orientation', 'vertical') // Excluir verticales
        .order('created_at', { ascending: false });
      
      setVideos(videosData || []);

      // 2. Cargar Reels (Verticales)
      const { data: reelsData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_published', true)
        .eq('orientation', 'vertical') // Solo verticales
        .order('created_at', { ascending: false });
      
      setReels(reelsData || []);

      // 3. Cargar Fotos
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      setPhotos(photosData || []);

      // 4. Cargar Guardados
      const { data: savedData } = await supabase
        .from('saved_videos')
        .select('video:videos(*)')
        .eq('user_id', user.id);
      
      if (savedData) {
        setSavedVideos(savedData.map(item => item.video).filter(Boolean));
      }

    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error al actualizar la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editForm.full_name,
          username: editForm.username,
          bio: editForm.bio,
          website: editForm.website,
          updated_at: new Date()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error al actualizar perfil');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mi Perfil | Radeisan</title>
      </Helmet>
      <Header />
      
      <div className="min-h-screen bg-background pt-16 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar */}
              <div className="flex-shrink-0 relative group mx-auto md:mx-0">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-xl">
                  <Image 
                    src={profile?.avatar_url} 
                    alt={profile?.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Icon name="Camera" className="text-white w-8 h-8" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left w-full">
                <div className="flex flex-col md:flex-row items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">
                      {profile?.full_name || 'Usuario'}
                    </h1>
                    <p className="text-muted-foreground">@{profile?.username || 'usuario'}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant={isEditing ? "outline" : "default"}
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Icon name={isEditing ? "X" : "Edit2"} size={18} className="mr-2" />
                      {isEditing ? 'Cancelar' : 'Editar Perfil'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                      <Icon name="Settings" size={20} />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-center md:justify-start gap-6 mb-6 text-sm">
                  <div className="text-center md:text-left">
                    <span className="block font-bold text-lg text-foreground">{stats.followers}</span>
                    <span className="text-muted-foreground">Seguidores</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="block font-bold text-lg text-foreground">{stats.following}</span>
                    <span className="text-muted-foreground">Siguiendo</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="block font-bold text-lg text-foreground">{stats.likes}</span>
                    <span className="text-muted-foreground">Me gusta</span>
                  </div>
                </div>

                {/* Bio & Edit Form */}
                {isEditing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nombre completo</label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                        className="w-full p-2 rounded border bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Usuario</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={e => setEditForm({...editForm, username: e.target.value})}
                        className="w-full p-2 rounded border bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bio</label>
                      <textarea
                        value={editForm.bio}
                        onChange={e => setEditForm({...editForm, bio: e.target.value})}
                        className="w-full p-2 rounded border bg-background"
                        rows={3}
                      />
                    </div>
                    <Button type="submit" disabled={uploading}>
                      {uploading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </form>
                ) : (
                  <div className="max-w-2xl">
                    <p className="text-foreground whitespace-pre-wrap mb-4">
                      {profile?.bio || 'Sin biografía'}
                    </p>
                    {profile?.website && (
                      <a 
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center justify-center md:justify-start gap-2"
                      >
                        <Icon name="Link" size={16} />
                        {profile.website}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex overflow-x-auto pb-2 mb-6 border-b border-border gap-4 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'border-primary text-primary font-medium' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Grid */}
          <div className="min-h-[400px]">
            {activeTab === 'videos' && (
              videos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map(video => (
                    <div 
                      key={video.id}
                      onClick={() => navigate(`/video/${video.id}`)}
                      className="bg-card rounded-lg overflow-hidden cursor-pointer group border border-border"
                    >
                      <div className="aspect-video relative bg-muted">
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Icon name="Play" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={48} />
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {Math.floor(video.duration_seconds / 60)}:{String(Math.floor(video.duration_seconds % 60)).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-foreground truncate">{video.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {video.views_count} vistas • {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Video" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No has subido videos aún</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/upload')}>
                    Subir Video
                  </Button>
                </div>
              )
            )}

            {activeTab === 'reels' && (
              reels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {reels.map(reel => (
                    <div 
                      key={reel.id}
                      onClick={() => navigate('/dashboard', { state: { orientation: 'vertical', selectedReelId: reel.id }})}
                      className="aspect-[9/16] bg-muted rounded-lg overflow-hidden cursor-pointer relative group"
                    >
                      <img 
                        src={reel.thumbnail_url} 
                        alt={reel.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 flex flex-col justify-end p-3">
                        <p className="text-white text-sm font-medium truncate">{reel.title}</p>
                        <div className="flex items-center gap-2 text-white/80 text-xs mt-1">
                          <span className="flex items-center gap-1">
                            <Icon name="Play" size={10} /> {reel.views_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Smartphone" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No has subido reels aún</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/upload')}>
                    Crear Reel
                  </Button>
                </div>
              )
            )}

            {activeTab === 'photos' && (
              photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photos.map(photo => (
                    <div 
                      key={photo.id}
                      // Aquí deberías implementar el modal de foto o navegación
                      className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer relative group"
                    >
                      <img 
                        src={photo.image_url} 
                        alt={photo.title || 'Foto'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Image" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No has subido fotos aún</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/upload-photo')}>
                    Subir Foto
                  </Button>
                </div>
              )
            )}

            {/* ✅ PESTAÑA DE COMPRAS (REEMPLAZA MARKETPLACE) */}
            {activeTab === 'orders' && (
              <UserOrdersTab />
            )}

            {activeTab === 'saved' && (
              savedVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedVideos.map(video => (
                    <div 
                      key={video.id}
                      onClick={() => navigate(`/video/${video.id}`)}
                      className="bg-card rounded-lg overflow-hidden cursor-pointer group border border-border"
                    >
                      <div className="aspect-video relative bg-muted">
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {Math.floor(video.duration_seconds / 60)}:{String(Math.floor(video.duration_seconds % 60)).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-foreground truncate">{video.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Guardado recientemente
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Bookmark" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No tienes videos guardados</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>
                    Explorar Videos
                  </Button>
                </div>
              )
            )}

            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Icon name="Shield" /> Seguridad
                  </h3>
                  <Button variant="outline" fullWidth className="mb-3">Cambiar Contraseña</Button>
                  <Button variant="outline" fullWidth className="text-destructive border-destructive hover:bg-destructive/10">
                    Cerrar todas las sesiones
                  </Button>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Icon name="Bell" /> Notificaciones
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span>Correos promocionales</span>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Nuevos seguidores</span>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </label>
                  </div>
                </div>

                <Button 
                  variant="default" 
                  fullWidth 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12"
                  onClick={handleLogout}
                >
                  <Icon name="LogOut" className="mr-2" /> Cerrar Sesión
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfileSettings;
