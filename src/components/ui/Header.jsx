// src/components/ui/Header.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePoints } from "../../contexts/PointsContext"; // ✅ Integración del sistema de puntos
import PointsBalanceIndicator from "./PointsBalanceIndicator"; // ✅ Indicador visual de puntos
import Icon from "../AppIcon";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const { user, signOut } = useAuth();
  const { points } = usePoints(); // ✅ Puntos sincronizados en tiempo real
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleNavigate = (path, orientation = null) => {
    setMenuOpen(false);
    if (orientation) {
      navigate(path, { state: { orientation } });
    } else {
      navigate(path);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex justify-between items-center px-4 py-3 md:py-4">
        {/* === Logo / Marca === */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-primary font-bold text-xl"
        >
          <Icon name="PlayCircle" size={24} />
          <span>RADEISAN</span>
        </Link>

        {/* === Navegación Principal Desktop === */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground">
          <button
            onClick={() => handleNavigate("/dashboard", "vertical")}
            className={cn(
              "hover:text-primary transition-colors flex items-center gap-1",
              location.state?.orientation === "vertical" && "text-primary"
            )}
          >
            <Icon name="Smartphone" size={18} />
            Reels
          </button>
          <button
            onClick={() => handleNavigate("/dashboard", "horizontal")}
            className={cn(
              "hover:text-primary transition-colors flex items-center gap-1",
              location.state?.orientation === "horizontal" && "text-primary"
            )}
          >
            <Icon name="Monitor" size={18} />
            Videos
          </button>
          <button
            onClick={() => handleNavigate("/upload")}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <Icon name="Upload" size={18} />
            Subir
          </button>
          <button
            onClick={() => handleNavigate("/marketplace")}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <Icon name="Store" size={18} />
            Marketplace
          </button>
          <button
            onClick={() => handleNavigate("/rewards")}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <Icon name="Gift" size={18} />
            Recompensas
          </button>
        </nav>

        {/* === Sección Usuario / Puntos === */}
        <div className="flex items-center gap-4">
          {/* ✅ Indicador de puntos */}
          {user && (
            <div className="hidden md:flex items-center">
              <PointsBalanceIndicator
                points={points}
                showAnimation={true}
                size="sm"
                variant="compact"
              />
            </div>
          )}

          {/* Avatar o Botón de Login */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2"
              >
                <img
                  src={
                    user?.user_metadata?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.user_metadata?.full_name || "User"
                    )}&background=4F46E5&color=fff&size=64`
                  }
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-border"
                />
                <Icon
                  name={menuOpen ? "ChevronUp" : "ChevronDown
