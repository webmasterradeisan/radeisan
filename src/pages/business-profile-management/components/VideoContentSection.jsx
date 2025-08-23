import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const VideoContentSection = ({ videos, products, onVideoUpdate }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const mockVideos = [
    {
      id: 1,
      title: 'Unboxing Auriculares Bluetooth Pro',
      description: 'Revisión completa de nuestros nuevos auriculares con cancelación de ruido',
      thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      duration: '5:32',
      views: 1247,
      likes: 89,
      type: 'product-review',
      linkedProducts: [2],
      uploadDate: '2025-01-12',
      status: 'published',
      engagement: 7.2
    },
    {
      id: 2,
      title: 'Tutorial: Cómo usar pinceles profesionales',
      description: 'Guía paso a paso para aplicar maquillaje con nuestro set de pinceles',
      thumbnail: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
      duration: '8:15',
      views: 892,
      likes: 156,
      type: 'tutorial',
      linkedProducts: [4],
      uploadDate: '2025-01-10',
      status: 'published',
      engagement: 17.5
    },
    {
      id: 3,
      title: 'Detrás de escenas: Creando macetas artesanales',
      description: 'Proceso de creación de nuestras macetas de cerámica hechas a mano',
      thumbnail: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400',
      duration: '12:45',
      views: 634,
      likes: 78,
      type: 'behind-scenes',
      linkedProducts: [3],
      uploadDate: '2025-01-08',
      status: 'published',
      engagement: 12.3
    },
    {
      id: 4,
      title: 'Lookbook Primavera 2025',
      description: 'Nuevas tendencias en moda vintage para la temporada',
      thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      duration: '6:28',
      views: 2156,
      likes: 234,
      type: 'showcase',
      linkedProducts: [1],
      uploadDate: '2025-01-15',
      status: 'published',
      engagement: 10.9
    }
  ];

  const mockProducts = [
    { id: 1, name: 'Camiseta Vintage Retro', price: 29.99 },
    { id: 2, name: 'Auriculares Bluetooth Pro', price: 89.99 },
    { id: 3, name: 'Maceta Cerámica Artesanal', price: 24.50 },
    { id: 4, name: 'Set de Pinceles Profesionales', price: 45.00 }
  ];

  const typeOptions = [
    { value: 'all', label: 'Todos los Tipos' },
    { value: 'product-review', label: 'Reseña de Producto' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'behind-scenes', label: 'Detrás de Escenas' },
    { value: 'showcase', label: 'Showcase' },
    { value: 'unboxing', label: 'Unboxing' }
  ];

  const filteredVideos = mockVideos?.filter(video => {
    const matchesSearch = video?.title?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
                         video?.description?.toLowerCase()?.includes(searchQuery?.toLowerCase());
    const matchesType = typeFilter === 'all' || video?.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type) => {
    const typeMap = {
      'product-review': 'Reseña',
      'tutorial': 'Tutorial',
      'behind-scenes': 'Detrás de Escenas',
      'showcase': 'Showcase',
      'unboxing': 'Unboxing'
    };
    return typeMap?.[type] || type;
  };

  const getTypeColor = (type) => {
    const colorMap = {
      'product-review': 'bg-primary/10 text-primary',
      'tutorial': 'bg-accent/10 text-accent',
      'behind-scenes': 'bg-secondary/10 text-secondary',
      'showcase': 'bg-success/10 text-success',
      'unboxing': 'bg-warning/10 text-warning'
    };
    return colorMap?.[type] || 'bg-muted text-muted-foreground';
  };

  const formatDuration = (duration) => {
    return duration;
  };

  const formatViews = (views) => {
    if (views >= 1000) {
      return `${(views / 1000)?.toFixed(1)}k`;
    }
    return views?.toString();
  };

  const handleLinkProducts = (videoId) => {
    setSelectedVideo(videoId);
    setShowLinkModal(true);
  };

  const handleSaveLinkage = () => {
    alert('Productos vinculados exitosamente');
    setShowLinkModal(false);
    setSelectedVideo(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Contenido de Video</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona tus videos y vincúlalos con productos
          </p>
        </div>
        
        <Button
          variant="default"
          onClick={() => window.open('/video-upload-studio', '_blank')}
          iconName="Plus"
          iconPosition="left"
        >
          Subir Nuevo Video
        </Button>
      </div>
      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="search"
            placeholder="Buscar videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e?.target?.value)}
          />
          
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Tipo de contenido"
          />
          
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
            }}
            iconName="X"
          >
            Limpiar Filtros
          </Button>
        </div>
      </div>
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Play" size={16} color="var(--color-primary)" />
            <span className="text-sm font-medium text-muted-foreground">Total Videos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{mockVideos?.length}</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Eye" size={16} color="var(--color-accent)" />
            <span className="text-sm font-medium text-muted-foreground">Total Vistas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {mockVideos?.reduce((sum, video) => sum + video?.views, 0)?.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Heart" size={16} color="var(--color-success)" />
            <span className="text-sm font-medium text-muted-foreground">Total Likes</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {mockVideos?.reduce((sum, video) => sum + video?.likes, 0)}
          </p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="TrendingUp" size={16} color="var(--color-secondary)" />
            <span className="text-sm font-medium text-muted-foreground">Engagement Promedio</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {(mockVideos?.reduce((sum, video) => sum + video?.engagement, 0) / mockVideos?.length)?.toFixed(1)}%
          </p>
        </div>
      </div>
      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos?.map((video) => (
          <div key={video?.id} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-elevation-2 transition-shadow">
            {/* Video Thumbnail */}
            <div className="relative aspect-video bg-muted">
              <Image
                src={video?.thumbnail}
                alt={video?.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  <Icon name="Play" size={24} />
                </Button>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                {formatDuration(video?.duration)}
              </div>
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(video?.type)}`}>
                  {getTypeLabel(video?.type)}
                </span>
              </div>
            </div>

            {/* Video Info */}
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-2 line-clamp-2">{video?.title}</h4>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{video?.description}</p>
              
              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Icon name="Eye" size={14} />
                    <span>{formatViews(video?.views)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Icon name="Heart" size={14} />
                    <span>{video?.likes}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Icon name="TrendingUp" size={14} />
                    <span>{video?.engagement}%</span>
                  </div>
                </div>
              </div>

              {/* Linked Products */}
              {video?.linkedProducts?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Productos vinculados:</p>
                  <div className="flex flex-wrap gap-1">
                    {video?.linkedProducts?.map(productId => {
                      const product = mockProducts?.find(p => p?.id === productId);
                      return product ? (
                        <span key={productId} className="bg-accent/10 text-accent px-2 py-1 rounded text-xs">
                          {product?.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{video?.uploadDate}</span>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleLinkProducts(video?.id)}
                    title="Vincular productos"
                  >
                    <Icon name="Link" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => alert(`Editando ${video?.title}`)}
                    title="Editar video"
                  >
                    <Icon name="Edit" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => alert(`Ver analytics de ${video?.title}`)}
                    title="Ver estadísticas"
                  >
                    <Icon name="BarChart3" size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Link Products Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Vincular Productos</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLinkModal(false)}
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecciona los productos que aparecen en este video:
                </p>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {mockProducts?.map((product) => (
                    <label key={product?.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        defaultChecked={false}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{product?.name}</p>
                        <p className="text-sm text-muted-foreground">€{product?.price}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowLinkModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleSaveLinkage}
                  >
                    Guardar Vinculación
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Empty State */}
      {filteredVideos?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Video" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron videos</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || typeFilter !== 'all' ?'Intenta ajustar los filtros de búsqueda' :'Comienza subiendo tu primer video para promocionar tus productos'
            }
          </p>
          <Button
            variant="default"
            onClick={() => window.open('/video-upload-studio', '_blank')}
            iconName="Plus"
            iconPosition="left"
          >
            Subir Video
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoContentSection;