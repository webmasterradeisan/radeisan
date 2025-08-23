import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import PrimaryNavigation from '../../components/ui/PrimaryNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import VideoUploadZone from './components/VideoUploadZone';
import VideoPreview from './components/VideoPreview';
import VideoMetadataForm from './components/VideoMetadataForm';
import UploadProgressModal from './components/UploadProgressModal';
import PublishConfirmationModal from './components/PublishConfirmationModal';

const VideoUploadStudio = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('uploading');
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: [],
    visibility: 'public',
    monetization: 'enabled',
    allowComments: true,
    allowRatings: true,
    scheduledDate: ''
  });

  const [recentUploads] = useState([
    {
      id: 1,
      title: "Tutorial de React Hooks",
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=200&fit=crop",
      duration: "12:34",
      status: "published",
      views: 1247,
      uploadDate: "2025-01-15"
    },
    {
      id: 2,
      title: "Receta de Paella Valenciana",
      thumbnail: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=300&h=200&fit=crop",
      duration: "8:45",
      status: "processing",
      views: 0,
      uploadDate: "2025-01-16"
    },
    {
      id: 3,
      title: "Viaje por Barcelona",
      thumbnail: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=300&h=200&fit=crop",
      duration: "15:22",
      status: "draft",
      views: 0,
      uploadDate: "2025-01-16"
    }
  ]);

  const steps = [
    { number: 1, title: 'Subir video', description: 'Selecciona tu archivo de video' },
    { number: 2, title: 'Configurar', description: 'Añade información y metadatos' },
    { number: 3, title: 'Publicar', description: 'Revisa y publica tu contenido' }
  ];

  useEffect(() => {
    // Simulate upload progress when file is selected
    if (selectedFile && isUploading) {
      simulateUpload();
    }
  }, [selectedFile, isUploading]);

  // Declare uploadStartTime at component level
  let uploadStartTime = Date.now();

  const simulateUpload = () => {
    setShowUploadModal(true);
    uploadStartTime = Date.now(); // Reset the start time when simulation begins
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        setUploadStage('processing');
        setTimeout(() => {
          setUploadStage('generating');
          setTimeout(() => {
            setUploadStage('finalizing');
            setTimeout(() => {
              setIsUploading(false);
              setShowUploadModal(false);
              setCurrentStep(2);
            }, 1000);
          }, 1500);
        }, 2000);
        clearInterval(interval);
      }
      setUploadProgress(progress);
      
      // Simulate upload speed and estimated time
      const fileSize = selectedFile?.size || 100000000; // 100MB default
      const bytesUploaded = (progress / 100) * fileSize;
      const speed = bytesUploaded / ((Date.now() - uploadStartTime) / 1000);
      const remainingBytes = fileSize - bytesUploaded;
      const estimatedSeconds = remainingBytes / speed;
      
      setUploadSpeed(speed);
      setEstimatedTime(estimatedSeconds);
    }, 500);
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setIsUploading(true);
    uploadStartTime = Date.now();
  };

  const handleThumbnailSelect = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
  };

  const handleFormChange = (newFormData) => {
    setFormData(newFormData);
  };

  const handleFormSubmit = (e) => {
    e?.preventDefault();
    if (!selectedFile || !formData?.title || !formData?.category) return;
    
    setShowConfirmModal(true);
  };

  const handlePublishConfirm = async (publishOptions) => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      // Navigate to video feed or show success message
      navigate('/video-feed-dashboard');
    }, 2000);
  };

  const handleCancelUpload = () => {
    setIsUploading(false);
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadProgress(0);
    setCurrentStep(1);
  };

  const handleStepClick = (stepNumber) => {
    if (stepNumber === 1) {
      setCurrentStep(1);
    } else if (stepNumber === 2 && selectedFile) {
      setCurrentStep(2);
    } else if (stepNumber === 3 && selectedFile && formData?.title && formData?.category) {
      setCurrentStep(3);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { label: 'Publicado', color: 'bg-success text-success-foreground' },
      processing: { label: 'Procesando', color: 'bg-warning text-warning-foreground' },
      draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' }
    };
    
    const config = statusConfig?.[status] || statusConfig?.draft;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PrimaryNavigation />
      <main className="pt-16 lg:pt-28 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
              <button 
                onClick={() => navigate('/video-feed-dashboard')}
                className="hover:text-foreground transition-colors"
              >
                Inicio
              </button>
              <Icon name="ChevronRight" size={14} />
              <span>Estudio de creación</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Estudio de creación de videos
            </h1>
            <p className="text-muted-foreground">
              Sube y gestiona tu contenido de video para compartir con tu audiencia
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-2xl">
              {steps?.map((step, index) => (
                <div key={step?.number} className="flex items-center">
                  <button
                    onClick={() => handleStepClick(step?.number)}
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg transition-all duration-200
                      ${currentStep === step?.number 
                        ? 'bg-primary/10 text-primary' 
                        : currentStep > step?.number 
                          ? 'text-success hover:bg-success/10' :'text-muted-foreground hover:bg-muted'
                      }
                    `}
                    disabled={
                      (step?.number === 2 && !selectedFile) ||
                      (step?.number === 3 && (!selectedFile || !formData?.title || !formData?.category))
                    }
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${currentStep === step?.number 
                        ? 'bg-primary text-primary-foreground' 
                        : currentStep > step?.number 
                          ? 'bg-success text-success-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {currentStep > step?.number ? (
                        <Icon name="Check" size={16} />
                      ) : (
                        step?.number
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="font-medium">{step?.title}</div>
                      <div className="text-xs opacity-75">{step?.description}</div>
                    </div>
                  </button>
                  {index < steps?.length - 1 && (
                    <div className={`
                      w-8 lg:w-16 h-0.5 mx-2
                      ${currentStep > step?.number ? 'bg-success' : 'bg-border'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Step 1: Upload */}
              {currentStep === 1 && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-medium text-foreground mb-6">
                    Subir nuevo video
                  </h2>
                  <VideoUploadZone
                    onFileSelect={handleFileSelect}
                    uploadProgress={uploadProgress}
                    isUploading={isUploading}
                  />
                </div>
              )}

              {/* Step 2: Configure */}
              {currentStep === 2 && selectedFile && (
                <div className="space-y-6">
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-medium text-foreground mb-6">
                      Vista previa del video
                    </h2>
                    <VideoPreview
                      videoFile={selectedFile}
                      onThumbnailSelect={handleThumbnailSelect}
                      selectedThumbnail={selectedThumbnail}
                    />
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-medium text-foreground mb-6">
                      Información del video
                    </h2>
                    <VideoMetadataForm
                      formData={formData}
                      onChange={handleFormChange}
                      onSubmit={handleFormSubmit}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-medium text-foreground mb-6">
                    Revisar y publicar
                  </h2>
                  <div className="space-y-6">
                    {/* Final Review */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-foreground mb-3">Vista previa</h4>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                          {selectedThumbnail ? (
                            <img
                              src={selectedThumbnail?.url}
                              alt="Miniatura seleccionada"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon name="Video" size={48} color="var(--color-muted-foreground)" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-foreground mb-1">Título</h4>
                          <p className="text-sm text-muted-foreground">{formData?.title}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground mb-1">Descripción</h4>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {formData?.description}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Categoría</h4>
                            <p className="text-sm text-muted-foreground">{formData?.category}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Visibilidad</h4>
                            <p className="text-sm text-muted-foreground">{formData?.visibility}</p>
                          </div>
                        </div>
                        {formData?.tags?.length > 0 && (
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Etiquetas</h4>
                            <div className="flex flex-wrap gap-1">
                              {formData?.tags?.slice(0, 5)?.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {formData?.tags?.length > 5 && (
                                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                                  +{formData?.tags?.length - 5} más
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                        className="flex-1"
                      >
                        <Icon name="ArrowLeft" size={16} className="mr-2" />
                        Editar información
                      </Button>
                      <Button
                        onClick={() => setShowConfirmModal(true)}
                        className="flex-1"
                        disabled={!formData?.title || !formData?.category}
                      >
                        {formData?.scheduledDate ? 'Programar publicación' : 'Publicar video'}
                        <Icon name="ArrowRight" size={16} className="ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upload Tips */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-medium text-foreground mb-4 flex items-center">
                  <Icon name="Lightbulb" size={16} className="mr-2" color="var(--color-accent)" />
                  Consejos para subir videos
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <Icon name="Check" size={14} className="mt-0.5 text-success flex-shrink-0" />
                    <span>Usa títulos descriptivos y atractivos</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Icon name="Check" size={14} className="mt-0.5 text-success flex-shrink-0" />
                    <span>Añade etiquetas relevantes para mejor descubrimiento</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Icon name="Check" size={14} className="mt-0.5 text-success flex-shrink-0" />
                    <span>Selecciona una miniatura llamativa</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Icon name="Check" size={14} className="mt-0.5 text-success flex-shrink-0" />
                    <span>Escribe descripciones detalladas</span>
                  </div>
                </div>
              </div>

              {/* Recent Uploads */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-medium text-foreground mb-4">
                  Videos recientes
                </h3>
                <div className="space-y-3">
                  {recentUploads?.map((video) => (
                    <div key={video?.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-12 h-8 bg-muted rounded overflow-hidden flex-shrink-0">
                        <img
                          src={video?.thumbnail}
                          alt={video?.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {video?.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          {getStatusBadge(video?.status)}
                          <span>{video?.duration}</span>
                          {video?.views > 0 && <span>{video?.views} vistas</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-sm"
                  onClick={() => navigate('/video-feed-dashboard')}
                >
                  Ver todos los videos
                  <Icon name="ArrowRight" size={14} className="ml-2" />
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-medium text-foreground mb-4">
                  Estadísticas rápidas
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Videos publicados</span>
                    <span className="font-medium text-foreground">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total de vistas</span>
                    <span className="font-medium text-foreground">8,547</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Puntos ganados</span>
                    <span className="font-medium text-accent">1,234</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={showUploadModal}
        progress={uploadProgress}
        stage={uploadStage}
        onCancel={handleCancelUpload}
        onComplete={() => setShowUploadModal(false)}
        estimatedTime={estimatedTime}
        uploadSpeed={uploadSpeed}
      />
      {/* Publish Confirmation Modal */}
      <PublishConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handlePublishConfirm}
        videoData={{
          ...formData,
          thumbnail: selectedThumbnail
        }}
        isScheduled={!!formData?.scheduledDate}
      />
    </div>
  );
};

export default VideoUploadStudio;