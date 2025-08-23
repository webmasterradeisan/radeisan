import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ProductManagementSection = ({ products, onProductUpdate }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    images: [],
    stock: '',
    sku: '',
    status: 'available'
  });

  const statusOptions = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'available', label: 'Disponible' },
    { value: 'sold', label: 'Vendido' },
    { value: 'draft', label: 'Borrador' },
    { value: 'inactive', label: 'Inactivo' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'Todas las Categorías' },
    { value: 'fashion', label: 'Moda y Accesorios' },
    { value: 'electronics', label: 'Electrónicos' },
    { value: 'home', label: 'Hogar y Jardín' },
    { value: 'beauty', label: 'Belleza y Cuidado Personal' },
    { value: 'sports', label: 'Deportes y Fitness' },
    { value: 'books', label: 'Libros y Medios' },
    { value: 'food', label: 'Alimentos y Bebidas' },
    { value: 'art', label: 'Arte y Manualidades' },
    { value: 'automotive', label: 'Automotriz' },
    { value: 'other', label: 'Otros' }
  ];

  const mockProducts = [
    {
      id: 1,
      name: 'Camiseta Vintage Retro',
      description: 'Camiseta de algodón 100% con diseño vintage único',
      price: 29.99,
      category: 'fashion',
      images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300'],
      stock: 15,
      sku: 'TSH-001',
      status: 'available',
      sales: 23,
      views: 156,
      createdAt: '2025-01-10'
    },
    {
      id: 2,
      name: 'Auriculares Bluetooth Pro',
      description: 'Auriculares inalámbricos con cancelación de ruido',
      price: 89.99,
      category: 'electronics',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'],
      stock: 8,
      sku: 'AUD-002',
      status: 'available',
      sales: 12,
      views: 89,
      createdAt: '2025-01-08'
    },
    {
      id: 3,
      name: 'Maceta Cerámica Artesanal',
      description: 'Maceta hecha a mano con diseños únicos',
      price: 24.50,
      category: 'home',
      images: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300'],
      stock: 0,
      sku: 'MAC-003',
      status: 'sold',
      sales: 1,
      views: 34,
      createdAt: '2025-01-05'
    },
    {
      id: 4,
      name: 'Set de Pinceles Profesionales',
      description: 'Kit completo de pinceles para maquillaje profesional',
      price: 45.00,
      category: 'beauty',
      images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300'],
      stock: 12,
      sku: 'PIN-004',
      status: 'available',
      sales: 8,
      views: 67,
      createdAt: '2025-01-03'
    }
  ];

  const filteredProducts = mockProducts?.filter(product => {
    const matchesSearch = product?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
                         product?.description?.toLowerCase()?.includes(searchQuery?.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product?.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product?.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev?.includes(productId) 
        ? prev?.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts?.length === filteredProducts?.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts?.map(p => p?.id));
    }
  };

  const handleBulkAction = (action) => {
    switch (action) {
      case 'delete':
        if (confirm(`¿Estás seguro de eliminar ${selectedProducts?.length} productos?`)) {
          alert(`${selectedProducts?.length} productos eliminados`);
          setSelectedProducts([]);
        }
        break;
      case 'activate':
        alert(`${selectedProducts?.length} productos activados`);
        setSelectedProducts([]);
        break;
      case 'deactivate':
        alert(`${selectedProducts?.length} productos desactivados`);
        setSelectedProducts([]);
        break;
    }
  };

  const handleAddProduct = () => {
    if (!newProduct?.name || !newProduct?.price) {
      alert('Por favor completa los campos obligatorios');
      return;
    }
    
    alert('Producto agregado exitosamente');
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: '',
      images: [],
      stock: '',
      sku: '',
      status: 'available'
    });
    setShowAddForm(false);
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event?.target?.files);
    files?.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewProduct(prev => ({
          ...prev,
          images: [...prev?.images, e?.target?.result]
        }));
      };
      reader?.readAsDataURL(file);
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { color: 'text-success', bg: 'bg-success/10', label: 'Disponible' },
      sold: { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Vendido' },
      draft: { color: 'text-warning', bg: 'bg-warning/10', label: 'Borrador' },
      inactive: { color: 'text-error', bg: 'bg-error/10', label: 'Inactivo' }
    };
    
    const config = statusConfig?.[status] || statusConfig?.draft;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config?.bg} ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Gestión de Productos</h3>
          <p className="text-sm text-muted-foreground">
            {filteredProducts?.length} productos encontrados
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button
            variant="default"
            onClick={() => setShowAddForm(true)}
            iconName="Plus"
            iconPosition="left"
          >
            Agregar Producto
          </Button>
          
          {selectedProducts?.length > 0 && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('activate')}
                iconName="Eye"
              >
                Activar ({selectedProducts?.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('deactivate')}
                iconName="EyeOff"
              >
                Desactivar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                iconName="Trash2"
              >
                Eliminar
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            type="search"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e?.target?.value)}
          />
          
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Estado"
          />
          
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="Categoría"
          />
          
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            iconName="X"
          >
            Limpiar Filtros
          </Button>
        </div>
      </div>
      {/* Products Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts?.length === filteredProducts?.length && filteredProducts?.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left p-4 font-medium text-foreground">Producto</th>
                <th className="text-left p-4 font-medium text-foreground">Precio</th>
                <th className="text-left p-4 font-medium text-foreground">Stock</th>
                <th className="text-left p-4 font-medium text-foreground">Estado</th>
                <th className="text-left p-4 font-medium text-foreground">Ventas</th>
                <th className="text-left p-4 font-medium text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts?.map((product) => (
                <tr key={product?.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts?.includes(product?.id)}
                      onChange={() => handleSelectProduct(product?.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={product?.images?.[0]}
                          alt={product?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{product?.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{product?.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-foreground">€{product?.price}</span>
                  </td>
                  <td className="p-4">
                    <span className={`font-medium ${product?.stock > 0 ? 'text-foreground' : 'text-error'}`}>
                      {product?.stock}
                    </span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(product?.status)}
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{product?.sales} ventas</div>
                      <div className="text-muted-foreground">{product?.views} vistas</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingProduct(product)}
                      >
                        <Icon name="Edit" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => alert(`Ver detalles de ${product?.name}`)}
                      >
                        <Icon name="Eye" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirm('¿Eliminar producto?') && alert('Producto eliminado')}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Agregar Nuevo Producto</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddForm(false)}
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre del Producto"
                    type="text"
                    placeholder="Ej: Camiseta Vintage"
                    value={newProduct?.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e?.target?.value }))}
                    required
                  />

                  <Input
                    label="Precio (€)"
                    type="number"
                    placeholder="29.99"
                    value={newProduct?.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e?.target?.value }))}
                    required
                  />

                  <Select
                    label="Categoría"
                    options={categoryOptions?.filter(opt => opt?.value !== 'all')}
                    value={newProduct?.category}
                    onChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
                    placeholder="Selecciona categoría"
                    required
                  />

                  <Input
                    label="Stock Disponible"
                    type="number"
                    placeholder="10"
                    value={newProduct?.stock}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e?.target?.value }))}
                  />

                  <Input
                    label="SKU"
                    type="text"
                    placeholder="TSH-001"
                    value={newProduct?.sku}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e?.target?.value }))}
                  />
                </div>

                <Input
                  label="Descripción"
                  type="text"
                  placeholder="Describe tu producto..."
                  value={newProduct?.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e?.target?.value }))}
                />

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Imágenes del Producto
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="product-images"
                    />
                    <Icon name="ImagePlus" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Arrastra imágenes aquí o haz clic para seleccionar
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('product-images')?.click()}
                    >
                      Seleccionar Imágenes
                    </Button>
                  </div>
                  
                  {newProduct?.images?.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {newProduct?.images?.map((image, index) => (
                        <div key={index} className="relative">
                          <Image
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 w-6 h-6"
                            onClick={() => setNewProduct(prev => ({
                              ...prev,
                              images: prev?.images?.filter((_, i) => i !== index)
                            }))}
                          >
                            <Icon name="X" size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleAddProduct}
                  >
                    Agregar Producto
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagementSection;