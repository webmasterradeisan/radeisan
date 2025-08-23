import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import ProfileHeader from './components/ProfileHeader';
import ProfileTabs from './components/ProfileTabs';
import VideoGrid from './components/VideoGrid';
import PointsHistory from './components/PointsHistory';
import SettingsPanel from './components/SettingsPanel';
import PurchaseHistory from './components/PurchaseHistory';

const UserProfileSettings = () => {
  const [activeTab, setActiveTab] = useState('videos');
  const [loading, setLoading] = useState(false);

  // Mock user data
  const userData = {
    id: 1,
    name: "María González",
    username: "maria_creator",
    email: "maria@ejemplo.com",
    bio: "Creadora de contenido apasionada por la tecnología y el lifestyle. Compartiendo mi día a día y tips útiles 🌟",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
    coverImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
    isVerified: true,
    isBusinessAccount: false,
    followersCount: 15420,
    followingCount: 892,
    videosCount: 127,
    totalPoints: 8547,
    achievements: [
      {
        id: 1,
        name: "Creador Estrella",
        icon: "Star",
        description: "Alcanzaste 10K seguidores"
      },
      {
        id: 2,
        name: "Video Viral",
        icon: "TrendingUp",
        description: "Un video superó 1M de visualizaciones"
      },
      {
        id: 3,
        name: "Constancia",
        icon: "Calendar",
        description: "30 días consecutivos subiendo contenido"
      },
      {
        id: 4,
        name: "Comunidad",
        icon: "Users",
        description: "Respondiste 1000 comentarios"
      },
      {
        id: 5,
        name: "Pionero",
        icon: "Zap",
        description: "Usuario de los primeros 1000"
      }
    ]
  };

  // Mock videos data
  const videosData = [
    {
      id: 1,
      title: "Mi rutina matutina para ser más productiva",
      thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
      duration: 245,
      views: 45200,
      likes: 3420,
      type: "long",
      uploadedAt: "hace 2 días"
    },
    {
      id: 2,
      title: "Outfit del día - Look casual chic",
      thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop",
      duration: 30,
      views: 12800,
      likes: 890,
      type: "short",
      uploadedAt: "hace 1 día"
    },
    {
      id: 3,
      title: "Receta rápida: Smoothie energético",
      thumbnail: "https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400&h=600&fit=crop",
      duration: 60,
      views: 8900,
      likes: 567,
      type: "short",
      uploadedAt: "hace 3 días"
    },
    {
      id: 4,
      title: "Tour por mi nuevo setup de trabajo",
      thumbnail: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=600&fit=crop",
      duration: 180,
      views: 23400,
      likes: 1890,
      type: "long",
      uploadedAt: "hace 5 días"
    },
    {
      id: 5,
      title: "Tips para organizar tu día",
      thumbnail: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=600&fit=crop",
      duration: 45,
      views: 15600,
      likes: 1200,
      type: "short",
      uploadedAt: "hace 1 semana"
    },
    {
      id: 6,
      title: "Haul de productos de belleza",
      thumbnail: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=600&fit=crop",
      duration: 320,
      views: 67800,
      likes: 5400,
      type: "long",
      uploadedAt: "hace 1 semana"
    }
  ];

  // Mock points history data
  const pointsHistoryData = [
    {
      id: 1,
      type: "video_upload",
      title: "Video subido",
      description: "Subiste \'Mi rutina matutina para ser más productiva'",
      points: 50,
      date: "2025-08-15T10:30:00Z",
      multiplier: 2
    },
    {
      id: 2,
      type: "daily_login",
      title: "Inicio de sesión diario",
      description: "Bonus por iniciar sesión 7 días consecutivos",
      points: 25,
      date: "2025-08-15T08:00:00Z"
    },
    {
      id: 3,
      type: "social_interaction",
      title: "Interacción social",
      description: "Recibiste 100 me gusta en tus videos",
      points: 30,
      date: "2025-08-14T16:45:00Z"
    },
    {
      id: 4,
      type: "achievement",
      title: "Logro desbloqueado",
      description: "Alcanzaste el logro \'Video Viral'",
      points: 200,
      date: "2025-08-14T14:20:00Z"
    },
    {
      id: 5,
      type: "video_watch",
      title: "Tiempo de visualización",
      description: "Viste videos por más de 2 horas",
      points: 15,
      date: "2025-08-13T20:15:00Z"
    },
    {
      id: 6,
      type: "referral",
      title: "Referido exitoso",
      description: "Un amigo se unió usando tu código",
      points: 100,
      date: "2025-08-12T12:30:00Z"
    }
  ];

  // Mock purchases data
  const purchasesData = [
    {
      id: 1,
      product: {
        name: "Cámara DSLR Canon EOS 90D",
        image: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=400&fit=crop"
      },
      seller: {
        name: "TechStore Madrid"
      },
      totalAmount: 899.99,
      pointsUsed: 500,
      status: "delivered",
      purchaseDate: "2025-08-10T14:30:00Z",
      trackingNumber: "ES1234567890"
    },
    {
      id: 2,
      product: {
        name: "Micrófono Blue Yeti",
        image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=400&fit=crop"
      },
      seller: {
        name: "AudioPro Barcelona"
      },
      totalAmount: 129.99,
      pointsUsed: 200,
      status: "pending",
      purchaseDate: "2025-08-14T09:15:00Z",
      trackingNumber: "ES0987654321"
    },
    {
      id: 3,
      product: {
        name: "Ring Light LED 18 pulgadas",
        image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop"
      },
      seller: {
        name: "LightingPro"
      },
      totalAmount: 79.99,
      pointsUsed: 0,
      status: "delivered",
      purchaseDate: "2025-08-05T16:45:00Z",
      trackingNumber: "ES5555666677"
    }
  ];

  const tabCounts = {
    videos: videosData?.length,
    liked: 234,
    playlists: 12,
    purchases: purchasesData?.length
  };

  const handleEditProfile = () => {
    setActiveTab('settings');
  };

  const handleUpgradeAccount = () => {
    console.log('Upgrade to business account');
  };

  const handleUpdateSettings = (newSettings) => {
    console.log('Settings updated:', newSettings);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'videos':
        return <VideoGrid videos={videosData} loading={loading} />;
      case 'liked':
        return <VideoGrid videos={videosData?.slice(0, 3)} loading={loading} />;
      case 'playlists':
        return <VideoGrid videos={[]} loading={loading} />;
      case 'purchases':
        return <PurchaseHistory purchases={purchasesData} loading={loading} />;
      case 'points':
        return <PointsHistory pointsData={pointsHistoryData} totalPoints={userData?.totalPoints} />;
      case 'settings':
        return <SettingsPanel user={userData} onUpdateSettings={handleUpdateSettings} />;
      default:
        return <VideoGrid videos={videosData} loading={loading} />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Mi Perfil - VideoRewards</title>
        <meta name="description" content="Gestiona tu perfil, configuración y contenido en VideoRewards. Ve tu historial de puntos, videos subidos y configuración de cuenta." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        <main className="pt-16 lg:pt-30 pb-16 lg:pb-0">
          <div className="max-w-6xl mx-auto">
            {/* Profile Header */}
            <ProfileHeader 
              user={userData}
              onEditProfile={handleEditProfile}
              onUpgradeAccount={handleUpgradeAccount}
            />

            {/* Profile Tabs */}
            <ProfileTabs 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabCounts={tabCounts}
            />

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default UserProfileSettings;