// src/pages/auth/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';

const Register = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    // accountType: 'personal', // REMOVIDO
    acceptTerms: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // REMOVIDO: accountTypeOptions

  useEffect(() => {
    // Check if user is already authenticated
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate('/dashboard', { replace: true });
      }
    };
    checkUser();
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un email válido';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'La contraseña debe contener al menos una mayúscula, una minúscula y un número';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    // Terms validation
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los términos y condiciones';
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

  // Handle checkbox change specifically
  const handleCheckboxChange = (e) => {
    const { checked } = e.target;
    handleInputChange('acceptTerms', checked);
  };

  // ✅ HANDLESUBMIT CORREGIDO y SIMPLIFICADO
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      console.log('🚀 Iniciando registro para:', formData.email);

      // ✅ SOLO REGISTRAR - Sin account_type en los metadatos
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name.trim(),
            username: formData.username.toLowerCase().trim(),
            // REMOVIDO: account_type
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error('❌ Error en registro:', error);
        
        if (error.message.includes('User already registered')) {
          setErrors({
            email: 'Este email ya está registrado. Intenta iniciar sesión.'
          });
        } else {
          setErrors({
            general: error.message
          });
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        console.log('✅ Usuario registrado exitosamente:', data.user.email);
        console.log('✅ ID del usuario:', data.user.id);

        // ✅ Enviar email de bienvenida (NO BLOQUEANTE - en segundo plano)
        supabase.functions
          .invoke('send-welcome-email', {
            body: {
              email: formData.email,
              name: formData.name.trim(),
              username: formData.username.toLowerCase().trim()
            }
          })
          .then(({ error }) => {
            if (error) {
              console.warn('⚠️ Email de bienvenida no enviado:', error.message);
            } else {
              console.log('✅ Email de bienvenida enviado correctamente');
            }
          })
          .catch(err => {
            console.warn('⚠️ Error al enviar email de bienvenida:', err.message);
          });

        // ✅ Redirigir inmediatamente al dashboard
        console.log('✅ Redirigiendo al dashboard...');
        navigate('/dashboard', { replace: true });
      }
      
    } catch (error) {
      console.error('❌ Error inesperado en registro:', error);
      setErrors({
        general: 'Error al crear la cuenta. Por favor intenta de nuevo.'
      });
      setIsLoading(false);
    }
  };

  // REMOVIDO: handleSocialRegister function

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Icon name="Video" size={32} color="white" />
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Únete a Radeisan
          </h1>
          <p className="text-muted-foreground mt-2">
            Crea tu cuenta y comienza a ganar puntos
          </p>
        </div>

        {/* Register Form */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* REMOVIDO: Account Type Select */}

            {/* Name Input */}
            <div>
              <Input
                label="Nombre Completo"
                type="text"
                placeholder="Tu nombre completo"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                required
                disabled={isLoading}
              />
            </div>

            {/* Username Input */}
            <div>
              <Input
                label="Nombre de Usuario"
                type="text"
                placeholder="usuario123"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                error={errors.username}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Solo letras, números y guiones bajos. Mínimo 3 caracteres.
              </p>
            </div>

            {/* Email Input */}
            <div>
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  error={errors.password}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Debe incluir mayúscula, minúscula y número.
              </p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <div className="relative">
                <Input
                  label="Confirmar Contraseña"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirma tu contraseña"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  error={errors.confirmPassword}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  <Icon name={showConfirmPassword ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                {/* Checkbox nativo HTML */}
                <div className="flex items-center h-5 mt-1">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleCheckboxChange}
                    disabled={isLoading}
                    className="w-4 h-4 text-primary bg-card border-2 border-border rounded focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      accentColor: 'var(--color-primary)',
                      position: 'relative',
                      zIndex: 10
                    }}
                  />
                </div>
                
                {/* Label clickeable */}
                <label 
                  htmlFor="acceptTerms" 
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none flex-1"
                >
                  Acepto los{' '}
                  <Link 
                    to="/terms" 
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    términos y condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link 
                    to="/privacy" 
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    política de privacidad
                  </Link>
                </label>
              </div>
              
              {/* Error del checkbox */}
              {errors.acceptTerms && (
                <div className="flex items-center space-x-1 text-error">
                  <Icon name="AlertCircle" size={12} />
                  <span className="text-sm">{errors.acceptTerms}</span>
                </div>
              )}
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          {/* REMOVIDO: Social Register Section */}
        </div>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
