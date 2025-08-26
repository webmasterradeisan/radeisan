import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import Icon from '../../components/AppIcon';

const UserLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Get redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/video-feed-dashboard';

  useEffect(() => {
    // Check if user is already authenticated
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      navigate(from, { replace: true });
    }
  }, [navigate, from]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un email válido';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock authentication logic
      const mockUsers = [
        { 
          email: 'admin@radeisan.com', 
          password: '123456',
          name: 'Admin Usuario',
          points: 5000
        },
        { 
          email: 'usuario@ejemplo.com', 
          password: '123456',
          name: 'Usuario Demo',
          points: 2847
        }
      ];

      const user = mockUsers.find(u => 
        u.email === formData.email && u.password === formData.password
      );

      if (user) {
        // Store authentication data
        const authData = {
          token: 'mock-jwt-token-' + Date.now(),
          user: {
            id: Date.now(),
            name: user.name,
            email: user.email,
            points: user.points,
            avatar: null
          },
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };

        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('userData', JSON.stringify(authData.user));
        
        if (formData.rememberMe) {
          localStorage.setItem('rememberUser', JSON.stringify({
            email: formData.email,
            rememberMe: true
          }));
        }

        // Navigate to intended page
        navigate(from, { replace: true });
        
      } else {
        setLoginAttempts(prev => prev + 1);
        setErrors({
          general: 'Email o contraseña incorrectos'
        });
      }
    } catch (error) {
      setErrors({
        general: 'Error de conexión. Por favor intenta de nuevo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    
    try {
      // Simulate social login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock social login success
      const socialUser = {
        token: `mock-${provider}-token-${Date.now()}`,
        user: {
          id: Date.now(),
          name: `Usuario ${provider}`,
          email: `usuario@${provider}.com`,
          points: 1000,
          avatar: `https://ui-avatars.com/api/?name=Usuario+${provider}&background=E63946&color=ffffff`
        }
      };

      localStorage.setItem('authToken', socialUser.token);
      localStorage.setItem('userData', JSON.stringify(socialUser.user));
      
      navigate(from, { replace: true });
      
    } catch (error) {
      setErrors({
        general: `Error al iniciar sesión con ${provider}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered user data
  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberUser');
    if (rememberedUser) {
      const userData = JSON.parse(rememberedUser);
      setFormData(prev => ({
        ...prev,
        email: userData.email,
        rememberMe: userData.rememberMe
      }));
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Icon name="Video" size={32} color="white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Bienvenido a Radeisan
          </h1>
          <p className="text-muted-foreground mt-2">
            Inicia sesión para acceder a tu cuenta
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-lg shadow-elevation-2 p-6">
          {/* General Error */}
          {errors.general && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-md">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} className="text-error" />
                <span className="text-sm text-error">{errors.general}</span>
              </div>
            </div>
          )}

          {/* Login Attempts Warning */}
          {loginAttempts >= 3 && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-md">
              <div className="flex items-center space-x-2">
                <Icon name="Shield" size={16} className="text-warning" />
                <span className="text-sm text-warning">
                  Múltiples intentos fallidos detectados. Considera restablecer tu contraseña.
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="tu@email.com"
              error={errors.email}
              required
              disabled={isLoading}
              autoComplete="email"
            />

            {/* Password Input */}
            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Tu contraseña"
                error={errors.password}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
              </button>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <Checkbox
                label="Recordarme"
                checked={formData.rememberMe}
                onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                disabled={isLoading}
              />
              
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              disabled={isLoading || !formData.email || !formData.password}
              className="mt-6"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-2 text-muted-foreground">O continúa con</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin('Google')}
              disabled={isLoading}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin('Facebook')}
              disabled={isLoading}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-muted-foreground">
            ¿No tienes una cuenta?{' '}
            <Link
              to="/register"
              className="text-primary font-medium hover:underline"
            >
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-accent/10 rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Credenciales de prueba:
          </h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Email: <code className="bg-muted px-1 rounded">admin@radeisan.com</code></div>
            <div>Contraseña: <code className="bg-muted px-1 rounded">123456</code></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
