import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import FilterChips from './components/FilterChips';
import VideoFeedGrid from './components/VideoFeedGrid';
import TrendingSidebar from './components/TrendingSidebar';
import PointsFloatingAnimation from './components/PointsFloatingAnimation';
import PullToRefresh from './components/PullToRefresh';
import PointsBalanceIndicator from '../../components/ui/PointsBalanceIndicator';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const VideoFeedDashboard = () => {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [layout, setLayout] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [userPoints, setUserPoints] = useState(2847);
  const [pointsAnimation, setPointsAnimation] = useState(null);
  const [page, setPage] = useState(1);

  // Mock video data
  const mockVideos = [
    {
      id: 1,
      title: "Receta fácil de paella valenciana en 30 minutos",
      thumbnail: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      duration: 1847,
      views: 125000,
      likes: 3200,
      comments: 156,
      timeAgo: "hace 2 horas",
      pointsReward: 25,
      creator: {
        id: 1,
        name: "María González",
        username: "@mariag_chef",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150"
      },
      category: "food",
      isLiked: false,
      isSaved: false
    },
    {
      id: 2,
      title: "Review completo del iPhone 15 Pro Max - ¿Vale la pena?",
      thumbnail: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
      duration: 892,
      views: 89000,
      likes: 2100,
      comments: 89,
      timeAgo: "hace 4 horas",
      pointsReward: 20,
      creator: {
        id: 2,
        name: "Carlos Tech",
        username: "@carlostech",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
      },
      category: "tech",
      isLiked: true,
      isSaved: false
    },
    {
      id: 3,
      title: "Rutina de ejercicios en casa - 15 minutos para principiantes",
      thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      duration: 945,
      views: 203000,
      likes: 5600,
      comments: 234,
      timeAgo: "hace 6 horas",
      pointsReward: 30,
      creator: {
        id: 3,
        name: "Ana Fitness",
        username: "@anafitness",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
      },
      category: "entertainment",
      isLiked: false,
      isSaved: true
    },
    {
      id: 4,
      title: "Los mejores lugares secretos de Barcelona que debes visitar",
      thumbnail: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
      duration: 1234,
      views: 67000,
      likes: 1800,
      comments: 92,
      timeAgo: "hace 8 horas",
      pointsReward: 22,
      creator: {
        id: 4,
        name: "David Viajes",
        username: "@davidviajes",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
      },
      category: "travel",
      isLiked: false,
      isSaved: false
    },
    {
      id: 5,
      title: "Cómo tocar guitarra: Acordes básicos para principiantes",
      thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      duration: 1567,
      views: 145000,
      likes: 4200,
      comments: 178,
      timeAgo: "hace 12 horas",
      pointsReward: 28,
      creator: {
        id: 5,
        name: "Luis Música",
        username: "@luismusica",
        avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150"
      },
      category: "music",
      isLiked: true,
      isSaved: false
    },
    {
      id: 6,
      title: "Gaming: Estrategias avanzadas para Fortnite Battle Royale",
      thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400",
      videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
      duration: 2134,
      views: 312000,
      likes: 8900,
      comments: 445,
      timeAgo: "hace 1 día",
      pointsReward: 35,
      creator: {
        id: 6,
        name: "Gamer Pro",
        username: "@gamerpro",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
      },
      category: "gaming",
      isLiked: false,
      isSaved: true
    }
  ];

  // Initialize videos on component mount
  useEffect(() => {
    const loadInitialVideos = async () => {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVideos(mockVideos);
      setFilteredVideos(mockVideos);
      setLoading(false);
    };

    loadInitialVideos();
  }, []);

  // Filter videos based on active filter
  useEffect(() => {
    if (activeFilter === 'todos') {
      setFilteredVideos(videos);
    } else if (activeFilter === 'trending') {
      const trending = videos?.filter(video => video?.views > 100000)?.sort((a, b) => b?.views - a?.views);
      setFilteredVideos(trending);
    } else if (activeFilter === 'following') {
      // Mock following filter - show videos from followed creators
      const following = videos?.filter(video => [1, 3, 5]?.includes(video?.creator?.id));
      setFilteredVideos(following);
    } else {
      const filtered = videos?.filter(video => video?.category === activeFilter);
      setFilteredVideos(filtered);
    }
  }, [activeFilter, videos]);

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  const handleLayoutChange = () => {
    setLayout(layout === 'grid' ? 'list' : 'grid');
  };

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    // Simulate loading more videos
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate more mock videos
    const newVideos = mockVideos?.map(video => ({
      ...video,
      id: video?.id + (page * 10),
      timeAgo: `hace ${page + 1} día${page > 0 ? 's' : ''}`
    }));

    setVideos(prev => [...prev, ...newVideos]);
    setPage(prev => prev + 1);
    
    // Stop loading more after 3 pages
    if (page >= 3) {
      setHasMore(false);
    }
    
    setLoading(false);
  }, [hasMore, loading, page, mockVideos]);

  const handlePointsEarned = (points) => {
    setUserPoints(prev => prev + points);
    setPointsAnimation({ points, id: Date.now() });
  };

  const handleAnimationComplete = () => {
    setPointsAnimation(null);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Shuffle videos to simulate new content
    const shuffledVideos = [...mockVideos]?.sort(() => Math.random() - 0.5);
    setVideos(shuffledVideos);
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Radeisan - Feed de Videos</title>
        <meta name="description" content="Descubre videos increíbles y gana puntos mientras disfrutas del mejor contenido de creadores españoles en Radeisan." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <PrimaryNavigation />
        
        {/* Main Content */}
        <main className="pt-16 lg:pt-30 pb-16 lg:pb-0">
          <FilterChips 
            onFilterChange={handleFilterChange}
            activeFilter={activeFilter}
          />
          
          <div className="container mx-auto px-4 py-6">
            <div className="flex gap-6">
              {/* Main Feed */}
              <div className="flex-1">
                {/* Feed Controls */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold text-foreground">
                      {activeFilter === 'todos' ? 'Para ti' : 
                       activeFilter === 'trending' ? 'Tendencias' :
                       activeFilter === 'following' ? 'Siguiendo' :
                       activeFilter?.charAt(0)?.toUpperCase() + activeFilter?.slice(1)}
                    </h1>
                    <div className="hidden sm:block">
                      <PointsBalanceIndicator 
                        points={userPoints} 
                        showAnimation={true}
                        size="default"
                        variant="prominent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleLayoutChange}
                      className="hidden md:flex"
                      title={layout === 'grid' ? 'Vista de lista' : 'Vista de cuadrícula'}
                    >
                      <Icon name={layout === 'grid' ? 'List' : 'Grid3X3'} size={20} />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={loading}
                      title="Actualizar feed"
                    >
                      <Icon 
                        name="RefreshCw" 
                        size={20} 
                        className={loading ? 'animate-spin' : ''}
                      />
                    </Button>
                  </div>
                </div>

                {/* Video Feed with Pull to Refresh */}
                <PullToRefresh onRefresh={handleRefresh}>
                  <VideoFeedGrid
                    videos={filteredVideos}
                    layout={layout}
                    onLoadMore={handleLoadMore}
                    onPointsEarned={handlePointsEarned}
                    hasMore={hasMore}
                    loading={loading}
                  />
                </PullToRefresh>
              </div>

              {/* Desktop Sidebar */}
              <div className="hidden xl:block">
                <TrendingSidebar onPointsEarned={handlePointsEarned} />
              </div>
            </div>
          </div>
        </main>

        {/* Points Animation */}
        {pointsAnimation && (
          <PointsFloatingAnimation
            points={pointsAnimation?.points}
            onAnimationComplete={handleAnimationComplete}
          />
        )}

        {/* Mobile Points Indicator */}
        <div className="fixed top-20 right-4 z-40 sm:hidden">
          <PointsBalanceIndicator 
            points={userPoints} 
            showAnimation={true}
            size="sm"
            variant="prominent"
          />
        </div>
      </div>
    </>
  );
};

export default VideoFeedDashboard;