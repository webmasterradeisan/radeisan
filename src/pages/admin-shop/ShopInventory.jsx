// src/pages/admin-shop/ShopInventory.jsx
// ============================================================================
// GESTIÓN DE INVENTARIO CON SUBIDA DE IMÁGENES
// ============================================================================
// ✅ FIX: Manejo de errores detallado.
// ✅ NUEVO: Subida de archivos a Supabase Storage ('shop-images').
// ✅ UX: Previsualización de imagen.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const ShopInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_points: '',
    stock: '',
    image_url: '' // URL final (ya sea subida o pegada)
  });

  // Estados para la subida de imagen
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Cargar productos
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error cargando inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Abrir modal
  const openModal = (product = null) => {
    // Resetear estados de imagen
    setSelectedFile(null);
    setImagePreview(null);

    if (product) {
      setEditingProduct(product);
      setFormData({
        title: product.title,
        description: product.description || '',
        price_points: product.price_points,
        stock: product.stock,
        image_url: product.image_url || ''
      });
      setImagePreview(product.image_url); // Mostrar imagen existente
    } else {
      setEditingProduct(null);
      setFormData({
        title: '',
        description: '',
        price_points: '',
        stock: '',
        image_url: ''
      });
    }
    setShowModal(true);
  };

  // Manejar selección de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Crear URL temporal para previsualización
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  // Función auxiliar para subir imagen
  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('shop-images') // Asegúrate de haber creado este bucket con el SQL
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('shop-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Guardar (Insertar o Actualizar)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalImageUrl = formData.image_url;

      // 1. Si hay un archivo seleccionado, subirlo primero
      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        price_points: parseInt(formData.price_points),
        stock: parseInt(formData.stock),
        image_url: finalImageUrl
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('shop_products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shop_products')
          .insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Error detallado:', err);
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar
  const handleDelete = async (id) => {
    if (!window.confirm('¿Ocultar este producto de la tienda?')) return;

    try {
      const { error } = await supabase
        .from('shop_products')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      fetchProducts();
    } catch (err) {
      console.error('Error eliminando:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario Tienda Física</h1>
          <p className="text-gray-500">Administra los productos disponibles para canje.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Icon name="Plus" size={20} className="mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Imagen</th>
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3">Puntos</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No hay productos.</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                        <img src={product.image_url || '/placeholder.png'} className="w-full h-full object-cover" alt="" onError={(e) => e.target.src = 'https://via.placeholder.com/100'} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{product.title}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{product.description}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-orange-600 font-bold">{product.price_points}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.stock > 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openModal(product)} className="text-blue-600 hover:text-blue-800"><Icon name="Edit" size={18} /></button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800"><Icon name="Trash2" size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <Icon name="X" size={24} />
                </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* SUBIDA DE IMAGEN */}
              <div>
                <label className="block text-sm font-medium mb-2">Imagen del Producto</label>
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden relative">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain absolute inset-0" />
                        ) : (
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Icon name="UploadCloud" size={24} className="text-gray-400 mb-2" />
                                <p className="text-xs text-gray-500">Click para subir imagen</p>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                </div>
                {/* Fallback URL input por si acaso */}
                <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">O pega una URL directa:</p>
                    <input 
                        type="url" 
                        className="w-full p-2 border rounded text-xs" 
                        placeholder="https://..." 
                        value={formData.image_url} 
                        onChange={e => {
                            setFormData({...formData, image_url: e.target.value});
                            setImagePreview(e.target.value);
                        }} 
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input type="text" required className="w-full p-2 border rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea className="w-full p-2 border rounded" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Precio (Puntos)</label>
                    <input type="number" required className="w-full p-2 border rounded" value={formData.price_points} onChange={e => setFormData({...formData, price_points: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Stock</label>
                    <input type="number" required className="w-full p-2 border rounded" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                    {saving ? (
                        <><Icon name="Loader" className="animate-spin mr-2"/> Guardando...</>
                    ) : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopInventory;
