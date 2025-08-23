import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const TrendingSidebar = ({ onPointsEarned }) => {
  const trendingTopics = [
    { id: 1, tag: '#RecetasFáciles', posts: '2.3M', growth: '+15%' },
    { id: 2, tag: '#TechReview', posts: '1.8M', growth: '+22%' },
    { id: 3, tag: '#FitnessMotivation', posts: '1.5M', growth: '+8%' },
    { id: 4, tag: '#TravelSpain', posts: '987K', growth: '+31%' },
    { id: 5, tag: '#DIYProjects', posts: '756K', growth: '+12%' }
  ];

  const suggestedCreators = [
    {
      id: 1,
      name: 'María González',
      username: '@mariag_chef',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
      followers: '125K',
      category: 'Cocina',
      isVerified: true
    },
    {
      id: 2,
      name: 'Carlos Tech',
      username: '@carlostech',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      followers: '89K',
      category: 'Tecnología',
      isVerified: false
    },
    {
      id: 3,
      name: 'Ana Fitness',
      username: '@anafitness',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      followers: '203K',
      category: 'Fitness',
      isVerified: true
    },
    {
      id: 4,
      name: 'David Viajes',
      username: '@davidviajes',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      followers: '67K',
      category: 'Viajes',
      isVerified: false
    }
  ];

  const handleFollowCreator = (creatorId) => {
    onPointsEarned && onPointsEarned(10);
  };

  return (
    <div className="w-80 flex-shrink-0 space-y-6">
      {/* Trending Topics */}
      <div className="bg-card rounded-lg shadow-elevation-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Tendencias</h3>
          <Icon name="TrendingUp" size={20} color="var(--color-primary)" />
        </div>
        
        <div className="space-y-3">
          {trendingTopics?.map((topic, index) => (
            <div key={topic?.id} className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {topic?.tag}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {topic?.posts} publicaciones
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-success">
                <Icon name="ArrowUp" size={12} />
                <span className="text-xs font-medium">{topic?.growth}</span>
              </div>
            </div>
          ))}
        </div>
        
        <Button variant="ghost" className="w-full mt-4 text-primary hover:bg-primary/10">
          Ver más tendencias
        </Button>
      </div>
      {/* Suggested Creators */}
      <div className="bg-card rounded-lg shadow-elevation-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Creadores sugeridos</h3>
          <Icon name="Users" size={20} color="var(--color-secondary)" />
        </div>
        
        <div className="space-y-4">
          {suggestedCreators?.map((creator) => (
            <div key={creator?.id} className="flex items-center space-x-3">
              <Link to={`/creator/${creator?.id}`} className="flex-shrink-0">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={creator?.avatar}
                      alt={creator?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {creator?.isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Icon name="Check" size={12} color="white" />
                    </div>
                  )}
                </div>
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link to={`/creator/${creator?.id}`} className="block">
                  <p className="font-medium text-foreground hover:text-primary transition-colors truncate">
                    {creator?.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {creator?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {creator?.followers} • {creator?.category}
                  </p>
                </Link>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFollowCreator(creator?.id)}
                className="flex-shrink-0"
              >
                Seguir
              </Button>
            </div>
          ))}
        </div>
        
        <Button variant="ghost" className="w-full mt-4 text-secondary hover:bg-secondary/10">
          Ver más creadores
        </Button>
      </div>
      {/* Points Earning Tips */}
      <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg p-6 border border-accent/20">
        <div className="flex items-center space-x-2 mb-3">
          <Icon name="Star" size={20} color="var(--color-accent)" />
          <h3 className="font-semibold text-foreground">Gana más puntos</h3>
        </div>
        
        <div className="space-y-2 text-sm text-foreground">
          <div className="flex items-center space-x-2">
            <Icon name="Play" size={14} color="var(--color-accent)" />
            <span>Ver videos completos: +20 puntos</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="Heart" size={14} color="var(--color-accent)" />
            <span>Dar me gusta: +2 puntos</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="Share" size={14} color="var(--color-accent)" />
            <span>Compartir contenido: +3 puntos</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="Users" size={14} color="var(--color-accent)" />
            <span>Seguir creadores: +10 puntos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendingSidebar;