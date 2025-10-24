// src/pages/admin-categories/CategoryManagement.jsx
// ✅ SPRINT 4 - Gestión Completa de Categorías
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../../supabase';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';

const CategoryManagement = () => {
  // Estados principales
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estados de formulario
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Folder',
    color: '#3b82f6',
    points_multiplier: 1.0,
    is_active: true,
    display_order: 0
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Iconos disponibles para categorías
  const AVAILABLE_ICONS = [
    'Folder', 'Film', 'Music', 'Gamepad2', 'Utensils', 'Dumbbell',
    'Book', 'Code', 'Palette', 'Camera', 'Mic', 'Globe',
    'Heart', 'Star', 'Zap', 'Coffee', 'ShoppingBag', 'Briefcase',
    'GraduationCap', 'Plane', 'Car', 'Home', 'Smartphone', 'Monitor'
  ];

  // Colores predefinidos
  const PRESET_COLORS = [
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f97316'  // Orange
  ];

  // ===============================
  // FETCH CATEGORÍAS
  // ===============================
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);

      // Obtener categorías con conteo de videos
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('content_categories')
        .select(`
          *,
          videos:videos_category_id_fkey(count)
        `)
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Procesar para incluir conteo de videos
      const processedCategories = categoriesData?.map(cat => ({
        ...cat,
        video_count: cat.videos?.[0]?.count || 0
      })) || [];

      setCategories(processedCategories);

    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===============================
  // VALIDAR FORMULARIO
  // ===============================
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'El slug es requerido';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'El slug solo puede contener letras minúsculas, números y guiones';
    }

    if (formData.points_multiplier < 0.1 || formData.points_multiplier > 10) {
      newErrors.points_multiplier = 'El multiplicador debe estar entre 0.1 y 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===============================
  // ABRIR MODAL CREAR
  // ===============================
  const handleCreateCategory = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: 'Folder',
      color: '#3b82f6',
      points_multiplier: 1.0,
      is_active: true,
      display_order: categories.length
    });
    setIsEditing(false);
    setErrors({});
    setShowCategoryModal(true);
  };

  // ===============================
  // ABRIR MODAL EDITAR
  // ===============================
  const handleEditCategory = (category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || 'Folder',
      color: category.color || '#3b82f6',
      points_multiplier: category.points_multiplier || 1.0,
      is_active: category.is_active ?? true,
      display_order: category.display_order || 0
    });
    setSelectedCategory(category);
    setIsEditing(true);
    setErrors({});
    setShowCategoryModal(true);
  };

  // ===============================
  // GUARDAR CATEGORÍA
  // ===============================
  const handleSaveCategory = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (isEditing && selectedCategory) {
        // Actualizar categoría existente
        const { error } = await supabase
          .from('content_categories')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            icon: formData.icon,
            color: formData.color,
            points_multiplier: parseFloat(formData.points_multiplier),
            is_active: formData.is_active,
            display_order: formData.display_order
          })
          .eq('id', selectedCategory.id);

        if (error) throw error;

      } else {
        // Crear nueva categoría
        const { error } = await supabase
          .from('content_categories')
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            icon: formData.icon,
            color: formData.color,
            points_multiplier: parseFloat(formData.points_multiplier),
            is_active: formData.is_active,
            display_order: formData.display_order
          });

        if (error) throw error;
      }

      await fetchCategories();
      setShowCategoryModal(false);
      setSelectedCategory(null);

    } catch (error) {
      console.error('Error saving category:', error);
      if (error.code === '23505') {
        setErrors({ slug: 'Este slug ya está en uso' });
      } else {
        alert('Error al guardar la categoría');
      }
    } finally {
      setSaving(false);
    }
  };

  // ===============================
  // ELIMINAR CATEGORÍA
  // ===============================
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      setSaving(true);

      // Verificar si tiene videos asociados
      const { count } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', selectedCategory.id);

      if (count > 0) {
        alert(`No se puede eliminar esta categoría porque tiene ${count} videos asociados. Desactívala en su lugar.`);
        return;
      }

      // Eliminar categoría
      const { error } = await supabase
        .from('content_categories')
        .delete()
        .eq('id', selectedCategory.id);

      if (error) throw error;

      await fetchCategories();
      setShowDeleteConfirm(false);
      setShowCategoryModal(false);
      setSelectedCategory(null);

    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar la categoría');
    } finally {
      setSaving(false);
    }
  };

  // ===============================
  // TOGGLE ESTADO
  // ===============================
  const handleToggleStatus = async (categoryId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('content_categories')
        .update({ is_active: !currentStatus })
        .eq('id', categoryId);

      if (error) throw error;

      await fetchCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      alert('Error al cambiar el estado de la categoría');
    }
  };

  // ===============================
  // REORDENAR CATEGORÍAS
  // ===============================
  const handleMoveCategory = async (categoryId, direction) => {
    const currentIndex = categories.findIndex(cat => cat.id === categoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    try {
      // Crear copia del array y reordenar
      const reorderedCategories = [...categories];
      const [movedCategory] = reorderedCategories.splice(currentIndex, 1);
      reorderedCategories.splice(newIndex, 0, movedCategory);

      // Actualizar display_order en batch
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        display_order: index
      }));

      // Actualizar en BD
      for (const update of updates) {
        await supabase
          .from('content_categories')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      await fetchCategories();

    } catch (error) {
      console.error('Error reordering categories:', error);
      alert('Error al reordenar las categorías');
    }
  };

  // ===============================
  // GENERAR SLUG AUTOMÁTICO
  // ===============================
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // ===============================
  // EFFECTS
  // ===============================
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Auto-generar slug cuando cambia el nombre
  useEffect(() => {
    if (!isEditing && formData.name) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(prev.name)
      }));
    }
  }, [formData.name, isEditing]);

  // ===============================
  // RENDER: MODAL DE CATEGORÍA
  // ===============================
  const renderCategoryModal = () => {
    if (!showCategoryModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">
              {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowCategoryModal(false);
                setSelectedCategory(null);
              }}
            >
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Preview */}
              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-3">Vista Previa</p>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${formData.color}20` }}
                  >
                    <Icon name={formData.icon} size={24} color={formData.color} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {formData.name || 'Nombre de la categoría'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Multiplicador: {formData.points_multiplier}x puntos
                    </p>
                  </div>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Nombre *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Entretenimiento"
                  error={errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-error mt-1">{errors.name}</p>
                )}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Slug *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="entretenimiento"
                  error={errors.slug}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL amigable (solo minúsculas, números y guiones)
                </p>
                {errors.slug && (
                  <p className="text-xs text-error mt-1">{errors.slug}</p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  placeholder="Descripción de la categoría..."
                />
              </div>

              {/* Icono */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Icono
                </label>
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-background border border-border rounded-lg">
                  {AVAILABLE_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        formData.icon === iconName
                          ? 'bg-primary text-white'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                      title={iconName}
                    >
                      <Icon name={iconName} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                  />
                  <div className="flex-1">
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        formData.color === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Multiplicador de Puntos */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Multiplicador de Puntos *
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={formData.points_multiplier}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    points_multiplier: parseFloat(e.target.value) || 1 
                  })}
                  error={errors.points_multiplier}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Los videos en esta categoría ganarán {formData.points_multiplier}x puntos base
                </p>
                {errors.points_multiplier && (
                  <p className="text-xs text-error mt-1">{errors.points_multiplier}</p>
                )}
              </div>

              {/* Orden de visualización */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Orden de Visualización
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    display_order: parseInt(e.target.value) || 0 
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Número menor = aparece primero
                </p>
              </div>

              {/* Estado Activo */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Categoría Activa</p>
                  <p className="text-sm text-muted-foreground">
                    Los usuarios podrán seleccionar esta categoría
                  </p>
                </div>
                <Checkbox
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    is_active: e.target.checked 
                  })}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border">
            {isEditing ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Icon name="Trash2" size={16} className="mr-2" />
                Eliminar
              </Button>
            ) : (
              <div></div>
            )}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoryModal(false);
                  setSelectedCategory(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCategory}
                disabled={saving}
              >
                {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===============================
  // RENDER: MODAL DE CONFIRMACIÓN
  // ===============================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
              <Icon name="AlertTriangle" size={24} color="var(--color-error)" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                ¿Eliminar categoría?
              </h3>
              <p className="text-sm text-muted-foreground">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Estás a punto de eliminar la categoría <strong>{selectedCategory?.name}</strong>. 
            {selectedCategory?.video_count > 0 && (
              <span className="block mt-2 text-warning">
                ⚠️ Esta categoría tiene {selectedCategory.video_count} videos asociados.
                No podrás eliminarla a menos que reasignes o elimines esos videos primero.
              </span>
            )}
          </p>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteCategory}
              disabled={saving || selectedCategory?.video_count > 0}
            >
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ===============================
  // RENDER PRINCIPAL
  // ===============================
  return (
    <>
      <Helmet>
        <title>Gestión de Categorías - Admin Radeisan</title>
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Categorías</h1>
            <p className="text-muted-foreground mt-1">
              {categories.length} categorías configuradas
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={fetchCategories}
              disabled={loading}
            >
              <Icon 
                name="RefreshCw" 
                size={16} 
                className={`mr-2 ${loading ? 'animate-spin' : ''}`} 
              />
              Actualizar
            </Button>
            <Button onClick={handleCreateCategory}>
              <Icon name="Plus" size={16} className="mr-2" />
              Nueva Categoría
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Layers" size={20} color="var(--color-primary)" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {categories.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle" size={20} color="var(--color-success)" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {categories.filter(c => c.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Activas</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Icon name="XCircle" size={20} color="var(--color-warning)" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {categories.filter(c => !c.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Inactivas</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Icon name="Video" size={20} color="var(--color-accent)" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {categories.reduce((sum, c) => sum + c.video_count, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Videos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Categorías */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando categorías...</p>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Icon name="Layers" size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No hay categorías configuradas</p>
              <Button onClick={handleCreateCategory}>
                <Icon name="Plus" size={16} className="mr-2" />
                Crear Primera Categoría
              </Button>
            </div>
          ) : (
            categories.map((category, index) => (
              <div
                key={category.id}
                className={`bg-card border rounded-lg p-6 transition-all hover:shadow-lg ${
                  category.is_active ? 'border-border' : 'border-warning/30 opacity-60'
                }`}
              >
                {/* Header de Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <Icon 
                        name={category.icon || 'Folder'} 
                        size={24} 
                        color={category.color || '#3b82f6'} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {category.slug}
                      </p>
                    </div>
                  </div>
                  
                  {/* Orden */}
                  <div className="flex flex-col space-y-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveCategory(category.id, 'up')}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <Icon name="ChevronUp" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveCategory(category.id, 'down')}
                      disabled={index === categories.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <Icon name="ChevronDown" size={14} />
                    </Button>
                  </div>
                </div>

                {/* Descripción */}
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-background rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon name="Video" size={14} color="var(--color-accent)" />
                      <span className="text-xs text-muted-foreground">Videos</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {category.video_count}
                    </p>
                  </div>

                  <div className="bg-background rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon name="Zap" size={14} color="var(--color-warning)" />
                      <span className="text-xs text-muted-foreground">Multiplicador</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {category.points_multiplier}x
                    </p>
                  </div>
                </div>

                {/* Estado */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    category.is_active 
                      ? 'bg-success/10 text-success' 
                      : 'bg-warning/10 text-warning'
                  }`}>
                    <Icon 
                      name={category.is_active ? 'CheckCircle' : 'XCircle'} 
                      size={12} 
                      className="mr-1"
                    />
                    {category.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Orden: {category.display_order}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditCategory(category)}
                  >
                    <Icon name="Edit" size={14} className="mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant={category.is_active ? 'destructive' : 'default'}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleStatus(category.id, category.is_active)}
                  >
                    <Icon 
                      name={category.is_active ? 'EyeOff' : 'Eye'} 
                      size={14} 
                      className="mr-2" 
                    />
                    {category.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modales */}
      {renderCategoryModal()}
      {renderDeleteConfirm()}
    </>
  );
};

export default CategoryManagement;
