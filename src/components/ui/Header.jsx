// src/components/ui/Header.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePoints } from "../../contexts/PointsContext";
import Icon from "../AppIcon";
import PointsBalanceIndicator from "./PointsBalanceIndicator";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { points, refreshPoints } = usePoints();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detectar scroll para cambiar estilo
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Refrescar puntos cuando cambia el usuario
  useEffect(() => {
    if (user?.id) {
      refreshPoints();
    }
  }, [user, refreshPoints]);

  const handleNavigation = (path, state = {}) => {
    navigate(path, { state });
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error.message);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* LOGO */}
        <Link to="/dashboard" className="flex items-center space-x-2">
          <img
            src="/logo.svg"
            alt="RADEISAN"
            className="h-8 w-8 object-contain"
          />
          <span className="text-lg font-bold text-foreground">RADEISAN</span>
        </Link>

        {/* NAVEGACIÓN PRINCIPAL */}
        <nav className="hidden md:flex items-center space-x-6">
          <button
            onClick={() => handleNavigation("/dashboard", { orientation: "all" })}
            className={`flex items-center space-x-1 text-sm font-medium ${
              location.pathname === "/dashboard"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name="Grid3X3" size={16} />
            <span>Inicio</span>
          </button>

          <button
            onClick={() => handleNavigation("/dashboard", { orientation: "vertical" })}
            className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Icon name="Smartphone" size={16} />
            <span>Reels</span>
          </button>

          <button
            onClick={() => handleNavigation("/dashboard", { orientation: "horizontal" })}
            className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Icon name="Monitor" size={16} />
            <span>Videos</span>
          </button>

          <button
            onClick={() => handleNavigation("/upload")}
            className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Icon name="Upload" size={16} />
            <span>Subir</span>
          </button>

          <button
            onClick={() => handleNavigation("/rewards")}
            className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Icon name="Gift" size={16} />
            <span>Recompensas</span>
          </button>
        </nav>

        {/* INDICADOR DE PUNTOS */}
        <div className="hidden md:flex items-center space-x-4">
          {user && (
            <PointsBalanceIndicator
              points={points}
              showAnimation={true}
              size="sm"
              variant="prominent"
            />
          )}

          {/* AVATAR USUARIO */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <img
                  src={
                    user.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.email || "User"
                    )}&background=4f46e5&color=fff&size=64`
                  }
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-primary/20"
                />
                <Icon
                  name={menuOpen ? "ChevronUp" : "ChevronDown"}
                  size={18}
                  className="text-muted-foreground ml-1 transition-transform duration-200"
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-popover shadow-lg rounded-lg py-2 border border-border">
                  <button
                    onClick={() => handleNavigation("/profile")}
                    className="flex items-center w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50"
                  >
                    <Icon name="User" size={16} className="mr-2" />
                    Mi perfil
                  </button>
                  <button
                    onClick={() => handleNavigation("/marketplace")}
                    className="flex items-center w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50"
                  >
                    <Icon name="ShoppingBag" size={16} className="mr-2" />
                    Marketplace
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <Icon name="LogOut" size={16} className="mr-2" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium text-primary hover:underline"
            >
              Iniciar sesión
            </Link>
          )}
        </div>

        {/* BOTÓN MÓVIL */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? "X" : "Menu"} size={22} />
        </button>
      </div>

      {/* MENÚ MÓVIL */}
      {menuOpen && (
        <div className="md:hidden bg-background border-t border-border px-4 py-3 space-y-2">
          <button
            onClick={() => handleNavigation("/dashboard", { orientation: "all" })}
            className="w-full flex items-center space-x-2 py-2 text-sm text-foreground"
          >
            <Icon name="Grid3X3" size={16} />
            <span>Inicio</span>
          </button>

          <button
            onClick={() => handleNavigation("/dashboard", { orientation: "vertical" })}
            className="w-full flex items-center space-x-2 py-2 text-sm text-foreground"
          >
            <Icon name="Smartphone" size={16} />
            <span>Reels</span>
          </button>

          <button
            onClick={() => handleNavigation("/dashboard", { orientation: "horizontal" })}
            className="w-full flex items-center space-x-2 py-2 text-sm text-foreground"
          >
            <Icon name="Monitor" size={16} />
            <span>Videos</span>
          </button>

          <button
            onClick={() => handleNavigation("/upload")}
            className="w-full flex items-center space-x-2 py-2 text-sm text-foreground"
          >
            <Icon name="Upload" size={16} />
            <span>Subir</span>
          </button>

          <button
            onClick={() => handleNavigation("/rewards")}
            className="w-full flex items-center space-x-2 py-2 text-sm text-foreground"
          >
            <Icon name="Gift" size={16} />
            <span>Recompensas</span>
          </button>

          {user && (
            <div className="border-t border-border mt-3 pt-3 space-y-2">
              <PointsBalanceIndicator
                points={points}
                showAnimation={true}
                size="sm"
                variant="prominent"
              />

              <button
                onClick={() => handleNavigation("/profile")}
                className="w-full flex items-center space-x-2 py-2 text-sm text-muted-foreground hover:bg-muted/50"
              >
                <Icon name="User" size={16} />
                <span>Mi perfil</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 py-2 text-sm text-red-500 hover:bg-red-50"
              >
                <Icon name="LogOut" size={16} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
