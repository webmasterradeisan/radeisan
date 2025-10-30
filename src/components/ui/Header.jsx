// src/components/ui/Header.jsx
// ======================================================
// ✅ Header global de la red social RADEISAN
// Muestra los puntos del usuario en tiempo real
// Integrado con AuthContext y PointsContext
// ======================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints } from '../../contexts/PointsContext';
import { supabase } from '../../lib/supabase';
import Icon from '../AppIcon';
import PointsBalanceIndicator from './PointsBalanceIndicator';
import Button from './Button';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { points, loading: pointsLoading } = usePoints();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [branding, setBranding] = useState({
    logo: '/logo.svg',
    title: 'RADEISAN',
  });

  // ======================================================
  // 🔄 Cargar configuración de branding
  // ======================================================
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data, error } = await supabase
          .from('branding_settings')
          .select('logo_url, app_name')
          .single();
        if (error) return;
        setBranding({
          logo: data?.logo_url || '/logo.svg',
          title: data?.app_name || 'RADEISAN',
        });
      } catch (err) {
        console.warn('⚠️ Error cargando branding:', err.message);
      }
    };

    fetchBranding();
  }, []);

  // ======================================================
  // 🚪 Cerrar sesión
  // ======================================================
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // ======================================================
  // 🧭 Navegación rápida
  // ======================================================
  const handleOrientationNav = (orientation) => {
    navigate('/dashboard', { state: { orientation } });
  };

  // ======================================================
  // 🎨 Render
  // ======================================================
  return (
    <header className="fixed top-0 left-0 w-full bg-background/80 backdrop-blur-lg border-b border-border z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* LOGO */}
        <Link
          to="/dashboard"
          className="flex items-center space-x-2 hover:opacity-90 transition"
        >
          <img
            src={branding.logo}
            alt="Logo"
            className="h-8 w-8 object-contain rounded-md"
          />
          <span className="text-lg font-bold text-foreground tracking-tight">
            {branding.title}
          </span>
        </Link>

        {/* CENTER NAV */}
        <div className="hidden md:flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOrientationNav('vertical')}
          >
            <Icon name="Smartphone" size={16} className="mr-1" />
            Reels
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOrientationNav('horizontal')}
          >
            <Icon name="Monitor" size={16} className="mr-1" />
            Videos
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOrientationNav('all')}
          >
            <Icon name="Grid3X3" size={16} className="mr-1" />
            Todo
          </Button>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center space-x-3">
          {/* PUNTOS DEL USUARIO */}
          {user && (
            <div className="hidden sm:block">
              <PointsBalanceIndicator
                points={points}
                showAnimation={true}
                size="default"
                variant="prominent"
              />
            </div>
          )}

          {/* BOTÓN PERFIL / LOGIN */}
          {user ? (
            <div className="relative">
              <button
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted transition"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <img
                  src={
                    profile?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      profile?.username || 'U'
                    )}&background=6366f1&color=ffffff`
                  }
                  alt="Avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
                <span className="text-sm font-medium text-foreground hidden md:block">
                  {profile?.username || 'Usuario'}
                </span>
                <Icon
                  name={isMenuOpen ? 'ChevronUp' : 'ChevronDown'}
                  size={16}
                  className="text-muted-foreground"
                />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-md z-50">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mi perfil
                  </Link>

                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Configuración
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm text-primary font-medium hover:underline"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
