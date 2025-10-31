import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Play, ShoppingBag, Gift, Users, TrendingUp, Shield, Check, Zap, DollarSign, Twitter, Instagram, Youtube, X, Coins, Star, Calendar } from 'lucide-react';

// URL del video promocional - EDITABLE
const PROMOTIONAL_VIDEO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";

// ===============================
// MODAL DE VIDEO
// ===============================
const VideoModal = ({ isOpen, onClose, videoUrl }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-5xl mx-4">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X size={32} />
        </button>
        
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
          <div className="aspect-video">
            <iframe
              src={videoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ===============================
// HEADER PÚBLICO
// ===============================
const PublicHeader = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img 
            src="https://i.ibb.co/vxYspn2x/Radeisan-Logo-Transparente-1.png" 
            alt="Radeisan"
            className="h-10 w-auto"
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            
          </span>
        </Link>

        {/* Navegación pública - vacía según requerimientos */}
        <nav className="hidden md:flex items-center space-x-8">
        </nav>

        {/* Botones de autenticación */}
        <div className="flex items-center space-x-4">
          <Link 
            to="/login" 
            className="text-gray-600 hover:text-primary transition-colors font-medium"
          >
            Iniciar Sesión
          </Link>
          <Link 
            to="/register" 
            className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-300 font-medium"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  </header>
);

// ===============================
// HERO SECTION
// ===============================
const HeroSection = ({ onOpenVideo }) => (
  <section className="pt-24 pb-16 lg:pb-24 bg-gradient-to-br from-gray-50 to-white">
    <div className="container mx-auto px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Contenido */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Crea, comparte y{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                gana
              </span>{' '}
              con Radeisan
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              La plataforma social colombiana donde tu creatividad tiene recompensa. 
              Conecta con tu audiencia, monetiza tu contenido y descubre oportunidades ilimitadas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link 
                to="/register"
                className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                Únete Gratis Ahora
              </Link>
              <Link 
                to="/login"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:border-primary hover:text-primary transition-all duration-300"
              >
                Ingresa Aquí
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8 text-center lg:text-left">
              <div>
                <div className="text-2xl font-bold text-primary">10K+</div>
                <div className="text-gray-600">Creadores Activos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">500K+</div>
                <div className="text-gray-600">Videos Subidos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">50M+</div>
                <div className="text-gray-600">Puntos Otorgados</div>
              </div>
            </div>
          </div>

          {/* Visual/Video Placeholder */}
          <div className="relative">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 lg:p-12">
              <div 
                className="aspect-video bg-white rounded-xl shadow-2xl flex items-center justify-center cursor-pointer hover:shadow-3xl transition-all duration-300 group relative overflow-hidden"
                onClick={onOpenVideo}
              >
                <img 
                  src="https://i.ibb.co/vxYspn2x/Radeisan-Logo-Transparente-1.png" 
                  alt="Video Promocional"
                  className="absolute inset-0 w-full h-full object-contain p-8 opacity-20"
                />
                <div className="text-center relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Play size={32} className="text-white" />
                  </div>
                  <p className="text-gray-600 font-medium">Ver Video Promocional</p>
                  <p className="text-sm text-gray-500">Descubre cómo funciona</p>
                </div>
              </div>
            </div>
            
            {/* Elementos decorativos */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-accent to-warning rounded-full opacity-20"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-r from-secondary to-success rounded-full opacity-20"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ===============================
// FEATURES SECTION
// ===============================
const FeaturesSection = () => {
  const features = [
    {
      icon: Video,
      title: "Feed de Videos Inteligente",
      description: "Descubre contenido personalizado y gana puntos mientras disfrutas de videos increíbles de creadores colombianos."
    },
    {
      icon: ShoppingBag,
      title: "Marketplace Integrado", 
      description: "Conecta con negocios locales, descubre productos únicos y apoya a emprendedores de tu comunidad."
    },
    {
      icon: Gift,
      title: "Sistema de Recompensas",
      description: "Convierte tu actividad en la plataforma en puntos canjeables por premios, descuentos y beneficios exclusivos."
    },
    {
      icon: Users,
      title: "Comunidad Vibrante",
      description: "Únete a una comunidad de creadores y empresarios que comparten tu pasión por el contenido de calidad."
    },
    {
      icon: TrendingUp,
      title: "Monetización Real",
      description: "Múltiples formas de generar ingresos: patrocinios, colaboraciones, ventas y programa de afiliados."
    },
    {
      icon: Shield,
      title: "Plataforma Segura",
      description: "Protección avanzada de datos, verificación de cuentas y herramientas anti-spam para una experiencia segura."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Todo lo que necesitas para{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                triunfar
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Radeisan combina las mejores herramientas para creadores de contenido 
              con un ecosistema empresarial próspero
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-200"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center mb-6">
                  <feature.icon size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ===============================
// SISTEMA DE PUNTOS SECTION
// ===============================
const PointsSystemSection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Gana puntos con{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                cada acción
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              En Radeisan tu actividad tiene valor. Completa misiones diarias, interactúa con contenido 
              y gana puntos para canjear por recompensas increíbles
            </p>
          </div>

          {/* Tipos de Puntos */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Puntos Gratis */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center mr-4">
                  <Star size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Puntos Gratis</h3>
                  <p className="text-gray-600">Gánalos con tu actividad</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">
                Obtén puntos completando misiones diarias, interactuando con contenido y siendo parte activa de la comunidad. 
                Estos puntos son canjeables en nuestra tienda por recompensas exclusivas.
              </p>
              
            </div>

            {/* Puntos Premium */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-green-500">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mr-4">
                  <Coins size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Puntos Premium</h3>
                  <p className="text-gray-600">Cómpralos y obtén más valor</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">
                Adquiere puntos premium para obtener mayor poder de compra en la tienda. 
                Cada punto premium tiene más valor que los puntos gratis, permitiéndote acceder a recompensas exclusivas más rápido.
              </p>
              
            </div>
          </div>

          {/* Misiones Diarias */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center mb-8">
              <Calendar size={32} className="text-primary mr-4" />
              <h3 className="text-3xl font-bold text-gray-900">Misiones Diarias</h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { task: "Iniciar sesión", points: 10, icon: Check },
                { task: "Dar 10 me gusta", points: 5, icon: Star },
                { task: "Publicar video, foto o reel", points: 30, icon: Video },
                { task: "Apoyar a tu influencer favorito", points: 2, icon: Users },
              ].map((mission, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <mission.icon size={24} className="text-primary" />
                    <span className="bg-gradient-to-r from-gray-400 to-gray-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      +{mission.points} pts
                    </span>
                  </div>
                  <p className="text-gray-900 font-semibold">{mission.task}</p>
                </div>
              ))}
            </div>

            {/* Bonus Racha */}
            <div className="mt-8 bg-gradient-to-r from-primary to-secondary rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold mb-2">🔥 Bonus por Racha</h4>
                  <p className="text-white/90">
                    Completa todas las misiones diarias por 10 días consecutivos y gana <strong>100 puntos extra</strong>
                  </p>
                </div>
                <div className="text-5xl font-bold">+100</div>
              </div>
            </div>
          </div>

          {/* Canjea tus puntos */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8">
              <Gift size={48} className="text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Canjea tus puntos en nuestra tienda
              </h3>
              <p className="text-gray-600 max-w-2xl">
                Ambos tipos de puntos son válidos para canjear en la tienda por recompensas increíbles: 
                productos exclusivos, descuentos, merchandising y mucho más
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ===============================
// TESTIMONIALS SECTION
// ===============================
const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "María González",
      role: "Creadora de Contenido",
      avatar: "https://ui-avatars.com/api/?name=Maria+Gonzalez&background=E63946&color=ffffff",
      content: "Radeisan cambió mi forma de crear contenido. En 6 meses pasé de 0 a 50K seguidores y genero ingresos constantes.",
      earnings: "2.5K/mes"
    },
    {
      name: "Carlos Ruiz",
      role: "Emprendedor",
      avatar: "https://ui-avatars.com/api/?name=Carlos+Ruiz&background=457B9D&color=ffffff", 
      content: "Mi negocio local encontró su audiencia perfecta en Radeisan. Las ventas aumentaron un 300% en el primer trimestre.",
      earnings: "15K en ventas"
    },
    {
      name: "Ana Martín",
      role: "Influencer",
      avatar: "https://ui-avatars.com/api/?name=Ana+Martin&background=F77F00&color=ffffff",
      content: "La comunidad de Radeisan es increíble. Colaboraciones auténticas, audiencia comprometida y herramientas profesionales.",
      earnings: "1.8K/mes"
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Historias de{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                éxito real
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Miles de creadores y empresarios colombianos ya están construyendo su futuro en Radeisan
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-gray-600 text-sm">{testimonial.role}</div>
                  </div>
                </div>
                
                <blockquote className="text-gray-700 mb-4 italic leading-relaxed">
                  "{testimonial.content}"
                </blockquote>
                
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Ingresos mensuales</div>
                  <div className="text-lg font-bold text-primary">{testimonial.earnings}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ===============================
// CALL TO ACTION SECTION
// ===============================
const CallToActionSection = () => (
  <section className="py-24 bg-gradient-to-r from-primary to-secondary">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto text-center text-white">
        <h2 className="text-4xl lg:text-5xl font-bold mb-6">
          ¿Listo para transformar tu contenido en ingresos?
        </h2>
        <p className="text-xl mb-12 opacity-90">
          Únete a miles de creadores colombianos que ya están monetizando su pasión en Radeisan. 
          Es gratis, es fácil y puedes empezar ahora mismo.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            to="/register"
            className="bg-white text-primary px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
          >
            Crear Cuenta Gratuita
          </Link>
          <div className="flex items-center text-white/80">
            <Check size={20} className="mr-2" />
            <span>Sin tarjeta de crédito requerida</span>
          </div>
        </div>

        {/* Features list */}
        <div className="mt-12 grid md:grid-cols-3 gap-8 text-left">
          <div className="flex items-center">
            <Zap size={24} className="mr-3 text-yellow-300" />
            <span>Configuración en 5 minutos</span>
          </div>
          <div className="flex items-center">
            <Users size={24} className="mr-3 text-yellow-300" />
            <span>Comunidad de +10K creadores</span>
          </div>
          <div className="flex items-center">
            <DollarSign size={24} className="mr-3 text-yellow-300" />
            <span>Múltiples formas de monetizar</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ===============================
// FOOTER PÚBLICO
// ===============================
const PublicFooter = () => (
  <footer className="bg-gray-900 text-white py-16">
    <div className="container mx-auto px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <img 
                src="https://i.ibb.co/vxYspn2x/Radeisan-Logo-Transparente-1.png" 
                alt="Radeisan"
                className="h-10 w-auto"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                
              </span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              La plataforma social colombiana donde tu creatividad tiene recompensa. 
              Conectamos creadores con audiencias y empresas con oportunidades reales de crecimiento.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="font-bold mb-4">Plataforma</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Precios</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Ayuda</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/terms" className="hover:text-white transition-colors">Términos de Uso</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacidad</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            © 2025 Radeisan. Todos los derechos reservados.
          </div>
          <div className="text-gray-400 text-sm mt-4 md:mt-0">
            Hecho con ❤️ en Colombia
          </div>
        </div>
      </div>
    </div>
  </footer>
);

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const LandingPage = () => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // SEO
  useEffect(() => {
    document.title = 'Radeisan - Crea, comparte y gana con tu contenido';
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'La plataforma social colombiana donde tu creatividad tiene recompensa. Conecta con tu audiencia, monetiza tu contenido y descubre oportunidades ilimitadas.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'La plataforma social colombiana donde tu creatividad tiene recompensa. Conecta con tu audiencia, monetiza tu contenido y descubre oportunidades ilimitadas.';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'creador contenido, social media, monetización, videos, Colombia, influencer, emprendedor, puntos, recompensas');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'creador contenido, social media, monetización, videos, Colombia, influencer, emprendedor, puntos, recompensas';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <HeroSection onOpenVideo={() => setIsVideoModalOpen(true)} />
        <FeaturesSection />
        <PointsSystemSection />
        <TestimonialsSection />
        <CallToActionSection />
      </main>
      <PublicFooter />
      
      {/* Video Modal */}
      <VideoModal 
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={PROMOTIONAL_VIDEO_URL}
      />
    </div>
  );
};

export default LandingPage;
