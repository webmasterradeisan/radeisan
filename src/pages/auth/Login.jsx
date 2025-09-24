// src/pages/auth/Login.jsx
// LOGIN COMPLETO Y FUNCIONAL - Versión simplificada sin bucles
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading: authLoading } = useAuth();
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Ruta de redirección (dashboard por defecto)
  const redirectTo = location.state?.from || '/dashboard';

  // Auto-llenar credenciales de prueba en desarrollo
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setFormData({
        email: 'admin@radeisan.com',
        password: '123456',
        rememberMe: false
      });
    }
  }, []);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (user && !authLoading) {
      console.log('✅ Usuario ya autenticado, redirigiendo a:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo]);

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Ingresa un email válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en inputs
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar errores
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 INICIANDO LOGIN PROCESS');
    
    // Validar formulario
    if (!validateForm()) {
      console.log('❌ Formulario inválido');
      return;
    }

    // Prevenir doble envío
    if (isSubmitting) {
      console.log('⚠️ Ya está enviándose');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      console.log('📡 Llamando a signIn con:', formData.email.trim());
      
      // Llamar a la función de login del contexto
      const result = await signIn(formData.email.trim(), formData.password);
      
      console.log('📋 Resultado del login:', result);

      if (result?.success) {
        console.log('✅ LOGIN EXITOSO - Usuario:', result.user?.email);
        
        // Guardar preferencia de recordar
        if (formData.rememberMe) {
          localStorage.setItem('rememberUser', JSON.stringify({
            email: formData.email.trim(),
            rememberMe: true
          }));
        } else {
          localStorage.removeItem('rememberUser');
        }

        // El AuthContext ya setea el usuario, así que la redirección
        // se maneja en el useEffect de arriba
        console.log('🎯 Esperando redirección automática a:', redirectTo);
        
      } else {
        console.error('❌ LOGIN FALLÓ:', result?.error);
        
        setErrors({
          general: result?.error || 'Error de autenticación'
        });
      }

    } catch (error) {
      console.error('💥 ERROR CRÍTICO EN LOGIN:', error);
      
      setErrors({
        general: 'Error de conexión. Verifica tu internet.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para autocompletar con credenciales de prueba
  const fillTestCredentials = () => {
    setFormData({
      email: 'admin@radeisan.com',
      password: '123456',
      rememberMe: false
    });
    setErrors({});
  };

  // Mostrar loading si está verificando auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Iniciar Sesión | RADEISAN</title>
        <meta name="description" content="Accede a tu cuenta de RADEISAN" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <div className="w-full max-w-md">
          
          {/* Header */}
          <div className="text-center mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
            >
              <Icon name="PlayCircle" size={32} className="mr-2" />
              RADEISAN
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-foreground">
              Iniciar Sesión
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Accede a tu cuenta y continúa creando contenido
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-8">
            
            {/* Error General */}
            {errors.general && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertCircle" size={20} className="text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Credenciales de Prueba - Visible siempre en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-800">🧪 Credenciales de Prueba</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fillTestCredentials}
                    disabled={isSubmitting}
                  >
                    Auto-llenar
                  </Button>
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>Email: <span className="font-mono">admin@radeisan.com</span></p>
                  <p>Password: <span className="font-mono">123456</span></p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Input */}
              <div>
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
              <div>
                <div className="relative">
                  <Input
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu contraseña"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    error={errors.password}
                    required
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSubmitting}
                    tabIndex={-1}
                  >
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={formData.rememberMe}
                    onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <label htmlFor="remember" className="text-sm text-muted-foreground">
                    Recordarme
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline transition-colors"
                  disabled={isSubmitting}
                  onClick={() => alert('Función próximamente')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !formData.email.trim() || !formData.password}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <Icon name="LogIn" size={20} className="mr-2" />
                    Iniciar Sesión
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-muted-foreground">O continúa con</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={() => alert('Login social próximamente')}
                >
                  <Icon name="Mail" size={16} className="mr-2" />
                  Google (Próximamente)
                </Button>
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="text-primary font-medium hover:underline transition-colors"
              >
                Regístrate gratis
              </Link>
            </p>
          </div>

          {/* Debug Panel - Solo en desarrollo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-gray-900 text-gray-100 rounded-lg font-mono text-xs">
              <div className="font-bold mb-2">🔍 DEBUG INFO:</div>
              <div className="space-y-1">
                <div>AuthLoading: <span className="text-yellow-400">{authLoading ? 'true' : 'false'}</span></div>
                <div>User: <span className="text-green-400">{user ? user.email : 'null'}</span></div>
                <div>Submitting: <span className="text-blue-400">{isSubmitting ? 'true' : 'false'}</span></div>
                <div>RedirectTo: <span className="text-purple-400">{redirectTo}</span></div>
                <div>FormValid: <span className="text-orange-400">{formData.email && formData.password ? 'true' : 'false'}</span></div>
                {location.state?.from && (
                  <div>From: <span className="text-cyan-400">{location.state.from}</span></div>
                )}
                {errors.general && (
                  <div>Error: <span className="text-red-400">{errors.general}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Instrucciones de Testing - Solo en desarrollo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-medium text-yellow-800 mb-2">📝 Instrucciones de Testing:</div>
              <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Haz clic en "Auto-llenar" arriba</li>
                <li>Haz clic en "Iniciar Sesión"</li>
                <li>Revisa la consola del navegador (F12)</li>
                <li>Deberías ser redirigido a /dashboard</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Login;
