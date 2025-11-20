// src/pages/user-profile-settings/index.jsx
// ============================================================================
// PERFIL DE USUARIO (EDICIÓN) - VERSIÓN COMPLETA
// ============================================================================
// ✅ DISEÑO RESTAURADO: Incluye Portada (Cover Image) estilo Perfil Público.
// ✅ FUNCIONALIDAD: Subida de Avatar y Portada.
// ✅ PESTAÑA: 'Mis Compras' integrada correctamente.
// ✅ CONTENIDO: Videos, Reels, Fotos, Guardados.
// ============================================================================

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
  
  // Refs para inputs de archivos
  const fileInputRef = useRef(null);     // Para Avatar
  const coverInputRef = useRef(null);    // Para Portada

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  
  // Estados para contenido
  const [videos, setVideos] = useState([]);
  const [reels, setReels] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    likes: 0,
    views: 0
  });

  // Estado para edición de texto
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    website: ''
  });

  // Tabs de navegación
  const tabs = [
    { id: 'videos', label: 'Videos', icon: 'Monitor' },
    { id: 'reels', label: 'Reels', icon: 'Smartphone' },
    { id: 'photos', label: 'Fotos', icon: 'Image' },
    { id: 'orders', label: 'Mis Compras', icon: 'ShoppingBag' }, // ✅ Pestaña de Compras
    { id: 'saved', label: 'Guardados', icon: 'Bookmark' },
    { id: 'settings', label: 'Ajustes', icon: 'Settings' }
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
      // 1. Videos (Horizontales)
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_published', true)
        .neq('orientation', 'vertical')
        .order('created_at', { ascending: false });
      setVideos(videosData || []);

      // 2. Reels (Verticales)
      const { data: reelsData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_published', true)
        .eq('orientation', 'vertical')
        .order('created_at', { ascending: false });
      setReels(reelsData || []);

      // 3. Fotos
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      setPhotos(photosData || []);

      // 4. Guardados
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

  // Subir Avatar
  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
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
      alert('Error al subir avatar');
    } finally {
      setUploading(false);
    }
  };

  // ✅ NUEVO: Subir Portada
  const handleCoverUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`; // Asegúrate de tener el bucket 'covers' o usa 'avatars'

      // Usamos el bucket 'avatars' o 'general' si 'covers' no existe, o crea 'covers' en Supabase
      // Asumiré 'avatars' por simplicidad o 'covers' si ya lo creaste.
      const bucketName = 'avatars'; // Cambia a 'covers' si tienes ese bucket específico

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ cover_image_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, cover_image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading cover:', error);
      alert('Error al subir portada. Verifica que el bucket exista.');
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
      
      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-6xl mx-auto">
            
            {/* ============================================= */}
            {/* ✅ HEADER DE PERFIL (DISEÑO CON PORTADA)   */}
            {/* ============================================= */}
            <div className="bg-card border-b border-border mb-6">
              
              {/* PORTADA */}
              <div className="relative h-48 sm:h-64 bg-gradient-to-r from-primary/20 to-secondary/20 group">
                {profile?.cover_image_url ? (
                  <Image 
                    src={profile.cover_image_url} 
                    alt="Portada"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center">
                      <Icon name="Image" className="text-muted-foreground/30 w-16 h-16" />
                  </div>
                )}
                
                {/* Botón Editar Portada (Solo visible al hover) */}
                <button 
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  <Icon name="Camera" size={14} />
                  Editar Portada
                </button>
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              {/* INFO DEL PERFIL (Debajo de la portada) */}
              <div className="px-4 sm:px-6 pb-6">
                <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12 sm:-mt-16 relative z-10">
                  
                  {/* AVATAR */}
                  <div className="flex-shrink-0 relative group mx-auto sm:mx-0">
                    <div className="w-32 h-32 rounded-full border-4 border-card bg-card overflow-hidden shadow-lg">
                      <Image 
                        src={profile?.avatar_url} 
                        alt={profile?.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Botón Editar Avatar */}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                    >
                      <Icon name="Camera" size={24} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>

                  {/* DATOS DE USUARIO */}
                  <div className="flex-1 text-center sm:text-left mt-2 sm:mt-16 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
                                {profile?.full_name || 'Usuario'}
                                {profile?.is_verified && <Icon name="BadgeCheck" className="text-blue-500" size={20} />}
                            </h1>
                            <p className="text-muted-foreground">@{profile?.username || 'usuario'}</p>
                        </div>
                        
                        <div className="flex gap-2 justify-center sm:justify-end">
                             <Button 
                                variant={isEditing ? "outline" : "default"}
                                onClick={() => setIsEditing(!isEditing)}
                                size="sm"
                              >
                                <Icon name={isEditing ? "X" : "Edit2"} size={16} className="mr-2" />
                                {isEditing ? 'Cancelar' : 'Editar Perfil'}
                              </Button>
                        </div>
                    </div>

                    {/* ESTADÍSTICAS */}
                    <div className="flex justify-center sm:justify-start gap-6 mt-4 text-sm border-y sm:border-none py-3 sm:py-0 border-border/50">
                        <div className="text-center sm:text-left">
                            <span className="font-bold block text-lg text-foreground">{stats.followers}</span>
                            <span className="text-muted-foreground">Seguidores</span>
                        </div>
                        <div className="text-center sm:text-left">
                            <span className="font-bold block text-lg text-foreground">{stats.following}</span>
                            <span className="text-muted-foreground">Siguiendo</span>
                        </div>
                        <div className="text-center sm:text-left">
                            <span className="font-bold block text-lg text-foreground">{stats.likes}</span>
                            <span className="text-muted-foreground">Likes</span>
                        </div>
                    </div>

                    {/* BIO / FORMULARIO */}
                    <div className="mt-4 max-w-2xl">
                        {isEditing ? (
                            <form onSubmit={handleUpdateProfile} className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Nombre</label>
                                        <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full p-2 rounded border bg-background text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Usuario</label>
                                        <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full p-2 rounded border bg-background text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Bio</label>
                                    <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} className="w-full p-2 rounded border bg-background text-sm" rows={3} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Sitio Web</label>
                                    <input type="url" value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})} className="w-full p-2 rounded border bg-background text-sm" placeholder="https://" />
                                </div>
                                <Button type="submit" disabled={uploading} fullWidth size="sm">
                                    {uploading ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </form>
                        ) : (
                            <>
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{profile?.bio || 'Sin biografía aún.'}</p>
                                {profile?.website && (
                                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline flex items-center gap-1 mt-1">
                                        <Icon name="Link" size={14} /> {profile.website}
                                    </a>
                                )}
                            </>
                        )}
                    </div>

                  </div>
                </div>
              </div>
            </div>


          {/* TABS DE NAVEGACIÓN */}
          <div className="flex overflow-x-auto pb-2 mb-6 border-b border-border gap-2 scrollbar-hide px-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm font-medium
                  ${activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* CONTENIDO DE LOS TABS */}
          <div className="min-h-[400px] px-4 pb-12">
            
            {activeTab === 'videos' && (
              videos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map(video => (
                    <div key={video.id} onClick={() => navigate(`/video/${video.id}`)} className="bg-card rounded-lg overflow-hidden cursor-pointer group border border-border">
                      <div className="aspect-video relative bg-muted">
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Icon name="Play" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={48} />
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {Math.floor(video.duration_seconds / 60)}:{String(Math.floor(video.duration_seconds % 60)).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-foreground truncate">{video.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{video.views_count} vistas</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <Icon name="Video" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No has subido videos aún</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/upload')}>Subir Video</Button>
                </div>
              )
            )}

            {activeTab === 'reels' && (
              reels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {reels.map(reel => (
                    <div key={reel.id} onClick={() => navigate('/dashboard', { state: { orientation: 'vertical', selectedReelId: reel.id }})} className="aspect-[9/16] bg-muted rounded-lg overflow-hidden cursor-pointer relative group">
                      <img src={reel.thumbnail_url} alt={reel.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 flex flex-col justify-end p-3">
                        <p className="text-white text-sm font-medium truncate">{reel.title}</p>
                        <span className="text-white/80 text-xs flex items-center gap-1"><Icon name="Play" size={10} /> {reel.views_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <Icon name="Smartphone" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No has subido reels aún</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/upload')}>Crear Reel</Button>
                </div>
              )
            )}

            {activeTab === 'photos' && (
              photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photos.map(photo => (
                    <div key={photo.id} className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer relative group">
                      <img src={photo.image_url} alt={photo.title || 'Foto'} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <Icon name="Image" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No has subido fotos aún</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/upload-photo')}>Subir Foto</Button>
                </div>
              )
            )}

            {/* ✅ PESTAÑA DE COMPRAS INTEGRADA */}
            {activeTab === 'orders' && (
              <UserOrdersTab />
            )}

            {activeTab === 'saved' && (
              savedVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedVideos.map(video => (
                    <div key={video.id} onClick={() => navigate(`/video/${video.id}`)} className="bg-card rounded-lg overflow-hidden cursor-pointer group border border-border">
                      <div className="aspect-video relative bg-muted">
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {Math.floor(video.duration_seconds / 60)}:{String(Math.floor(video.duration_seconds % 60)).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-foreground truncate">{video.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Guardado recientemente</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <Icon name="Bookmark" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No tienes videos guardados</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>Explorar Videos</Button>
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
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Correos promocionales</span>
                      <input type="checkbox" className="toggle accent-primary" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Nuevos seguidores</span>
                      <input type="checkbox" className="toggle accent-primary" defaultChecked />
                    </label>
                  </div>
                </div>

                <Button variant="default" fullWidth className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 font-bold shadow-lg shadow-destructive/20" onClick={handleLogout}>
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
