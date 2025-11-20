// src/pages/admin-shop/ShopInventory.jsx
// ============================================================================
// GESTIÓN DE INVENTARIO - ACTUALIZADO (SOPORTE MONEDA DUAL)
// ============================================================================
// ✅ NUEVO: Selector de "Tipo de Moneda" (Gratis vs Premium).
// ✅ MANTIENE: Subida de imágenes y gestión de stock.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const ShopInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // ✅ Estado del formulario actualizado
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_points: '',
    points_type: 'free', // 'free' | 'premium'
    stock: '',
    image_url: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

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
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const openModal = (product = null) => {
    setSelectedFile(null);
    setImagePreview(null);
    if (product) {
      setEditingProduct(product);
      setFormData({
        title: product.title,
        description: product.description || '',
        price_points: product.price_points,
        points_type: product.points_type || 'free', // Cargar tipo existente
        stock: product.stock,
        image_url: product.image_url || ''
      });
      setImagePreview(product.image_url);
    } else {
      setEditingProduct(null);
      setFormData({
        title: '',
        description: '',
        price_points: '',
        points_type: 'free', // Default
        stock: '',
        image_url: ''
      });
    }
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;
    const { error } = await supabase.storage.from('shop-images').upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from('shop-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl = formData.image_url;
      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        price_points: parseInt(formData.price_points),
        points_type: formData.points_type, // Guardar tipo
        stock: parseInt(formData.stock),
        image_url: finalImageUrl
      };

      if (editingProduct) {
        await supabase.from('shop_products').update(payload).eq('id', editingProduct.id);
      } else {
        await supabase.from('shop_products').insert(payload);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) { alert('Error al guardar'); console.error(err); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar?')) return;
    await supabase.from('shop_products').update({ is_active: false }).eq('id', id);
    fetchProducts();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario Tienda</h1>
          <p className="text-gray-500">Gestiona productos Gratis y Premium.</p>
        </div>
        <Button onClick={() => openModal()}><Icon name="Plus" className="mr-2"/> Nuevo</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-gray-500">
            <tr>
              <th className="px-6 py-3">Producto</th>
              <th className="px-6 py-3">Moneda</th>
              <th className="px-6 py-3">Precio</th>
              <th className="px-6 py-3">Stock</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <img src={p.image_url} className="w-10 h-10 rounded bg-gray-200 object-cover" alt="" />
                  <span className="font-bold">{p.title}</span>
                </td>
                <td className="px-6 py-4">
                  {/* Badge de Tipo */}
                  <span className={`px-2 py-1 rounded text-xs font-bold ${p.points_type === 'premium' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                    {p.points_type === 'premium' ? '💎 Premium' : '⭐ Gratis'}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-bold">{p.price_points}</td>
                <td className="px-6 py-4">{p.stock}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openModal(p)} className="text-blue-600 mr-3"><Icon name="Edit" size={18}/></button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600"><Icon name="Trash2" size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-4">{editingProduct ? 'Editar' : 'Nuevo'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Imagen</label>
                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm" />
                {imagePreview && <img src={imagePreview} className="mt-2 h-20 rounded border" alt="" />}
              </div>
              <input type="text" placeholder="Nombre" required className="w-full p-2 border rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <textarea placeholder="Descripción" className="w-full p-2 border rounded" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              
              {/* ✅ SELECTOR DE TIPO DE MONEDA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Moneda</label>
                    <select 
                        className="w-full p-2 border rounded bg-white"
                        value={formData.points_type}
                        onChange={e => setFormData({...formData, points_type: e.target.value})}
                    >
                        <option value="free">⭐ Puntos Gratis</option>
                        <option value="premium">💎 Puntos Premium</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Precio</label>
                    <input type="number" placeholder="0" required className="w-full p-2 border rounded" value={formData.price_points} onChange={e => setFormData({...formData, price_points: e.target.value})} />
                </div>
              </div>

              <input type="number" placeholder="Stock" required className="w-full p-2 border rounded" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              
              <div className="flex justify-end gap-2 mt-4">
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
