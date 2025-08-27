// src/pages/LandingPage/index.jsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';

// ===============================
// HEADER PÚBLICO
// ===============================
const PublicHeader = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
            <Icon name="Video" size={20} color="white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Radeisan
          </span>
        </Link>

        {/* Navegación pública */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link 
            to="/features" 
            className="text-gray-600 hover:text-primary transition-colors font-medium"
          >
            Características
          </Link>
          <Link 
            to="/about" 
            className="text-gray-600 hover:text-primary transition-colors font-medium"
          >
            Nosotros
          </Link>
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
const HeroSection = () => (
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
              La plataforma social donde tu creatividad tiene recompensa. 
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
                to="/features"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:border-primary hover:text-primary transition-all duration-300"
              >
                Explorar Características
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
              <div className="aspect-video bg-white rounded-xl shadow-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="Play" size={32} color="white" />
                  </div>
                  <p className="text-gray-600 font-medium">Video Promocional</p>
                  <p className="text-sm text-gray-500">Próximamente</p>
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
      icon: "Video",
      title: "Feed de Videos Inteligente",
      description: "Descubre contenido personalizado y gana puntos mientras disfrutas de videos increíbles de creadores españoles."
    },
    {
      icon: "ShoppingBag",
      title: "Marketplace Integrado", 
      description: "Conecta con negocios locales, descubre productos únicos y apoya a emprendedores de tu comunidad."
    },
    {
      icon: "Gift",
      title: "Sistema de Recompensas",
      description: "Convierte tu actividad en la plataforma en puntos canjeables por premios, descuentos y beneficios exclusivos."
    },
    {
      icon: "Users",
      title: "Comunidad Vibrante",
      description: "Únete a una comunidad de creadores y empresarios que comparten tu pasión por el contenido de calidad."
    },
    {
      icon: "TrendingUp",
      title: "Monetización Real",
      description: "Múltiples formas de generar ingresos: patrocinios, colaboraciones, ventas y programa de afiliados."
    },
    {
      icon: "Shield",
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
                  <Icon name={feature.icon} size={24} color="white" />
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
      content: "Nuestra empresa local encontró su audiencia perfecta en Radeisan. Las ventas aumentaron un 300% en el primer trimestre.",
      earnings: "15K en ventas"
    },
    {
      name: "Ana Martín",
      role: "Influencer",
      avatar: "https://ui-avatars.com/api/?name=Ana+Martin&background=F77F00&color=ffffff",
      content: "La comunidad de Radeisan es increíble. Colaboraciones auténticas, audiencia comprometida y herramientas profesionales.",
      earnings: "1.8/mes"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
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
              Miles de creadores y empresarios ya están construyendo su futuro en Radeisan
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
          Únete a miles de creadores que ya están monetizando su pasión en Radeisan. 
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
            <Icon name="Check" size={20} className="mr-2" />
            <span>Sin tarjeta de crédito requerida</span>
          </div>
        </div>

        {/* Features list */}
        <div className="mt-12 grid md:grid-cols-3 gap-8 text-left">
          <div className="flex items-center">
            <Icon name="Zap" size={24} className="mr-3 text-yellow-300" />
            <span>Configuración en 5 minutos</span>
          </div>
          <div className="flex items-center">
            <Icon name="Users" size={24} className="mr-3 text-yellow-300" />
            <span>Comunidad de +10K creadores</span>
          </div>
          <div className="flex items-center">
            <Icon name="DollarSign" size={24} className="mr-3 text-yellow-300" />
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
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                <Icon name="Video" size={20} color="white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Radeisan
              </span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              La plataforma social donde tu creatividad tiene recompensa. 
              Conectamos creadores con audiencias y empresas con oportunidades reales de crecimiento.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Icon name="Twitter" size={20} />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Icon name="Instagram" size={20} />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Icon name="Youtube" size={20} />
              </a>
            </div>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="font-bold mb-4">Plataforma</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/features" className="hover:text-white transition-colors">Características</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Sobre Nosotros</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Precios</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API</a></li>
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
  // SEO nativo sin dependencias externas
  useEffect(() => {
    document.title = 'Radeisan - Crea, comparte y gana con tu contenido';
    
    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'La plataforma social colombiana donde tu creatividad tiene recompensa. Conecta con tu audiencia, monetiza tu contenido y descubre oportunidades ilimitadas.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'La plataforma social donde tu creatividad tiene recompensa. Conecta con tu audiencia, monetiza tu contenido y descubre oportunidades ilimitadas.';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }

    // Meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'creador contenido, social media, monetización, videos, España, influencer, emprendedor');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'creador contenido, social media, monetización, videos, España, influencer, emprendedor';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CallToActionSection />
      </main>
      <PublicFooter />
    </div>
  );
};

export default LandingPage;
