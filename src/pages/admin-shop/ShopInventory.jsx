// src/pages/admin-shop/ShopInventory.jsx
// ============================================================================
// GESTIÓN DE INVENTARIO (PRODUCTOS FÍSICOS)
// ============================================================================
// ✅ Independiente de la página de 'Rewards'
// ✅ CRUD para la tabla 'shop_products'
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_points: '',
    stock: '',
    image_url: ''
  });
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
    if (product) {
      setEditingProduct(product);
      setFormData({
        title: product.title,
        description: product.description || '',
        price_points: product.price_points,
        stock: product.stock,
        image_url: product.image_url || ''
      });
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

  // Guardar
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        price_points: parseInt(formData.price_points),
        stock: parseInt(formData.stock),
        image_url: formData.image_url
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
      console.error('Error guardando producto:', err);
      alert('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar (Soft Delete)
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3">Descripción</th>
                <th className="px-6 py-3">Puntos</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Inventario vacío.</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img src={product.image_url || 'https://via.placeholder.com/50'} className="w-10 h-10 rounded object-cover bg-gray-200" alt="" />
                      <span className="font-bold text-gray-900">{product.title}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{product.description}</td>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in duration-200">
            <h3 className="font-bold text-lg mb-4">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium mb-1">URL Imagen</label>
                <input type="url" required className="w-full p-2 border rounded" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopInventory;
