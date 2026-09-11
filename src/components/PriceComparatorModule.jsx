import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Star,
  Award,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Save,
  Trash2,
  ArrowUpDown,
  PlusCircle,
  X,
  Camera,
  Sparkles,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  ChevronDown,
  ShoppingCart,
  ShoppingBag,
  Pencil,
  Store
} from 'lucide-react';
import { compressImage, analyzeProductImage } from '../utils/geminiService';
import { findSimilarity } from '../utils/similarity';
import { safeNumber, sanitizeHouseholdItem, sanitizeHouseholdList } from '../utils/sanitizers';

export default function PriceComparatorModule({
  householdItems = [],
  setHouseholdItems,
  showToast,
  geminiApiKey = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Add item form state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Higiene');
  const [itemNotes, setItemNotes] = useState('');
  const [itemVerdict, setItemVerdict] = useState('yes');
  const [productImage, setProductImage] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const fileInputRef = useRef(null);
  
  // Store options in form
  const [storePrices, setStorePrices] = useState([
    { storeName: "Costco", price: '', quantity: '' },
    { storeName: "Sam's Club", price: '', quantity: '' }
  ]);
  
  // Quick Add store modal state
  const [addingStoreToItem, setAddingStoreToItem] = useState(null);
  const [newStoreName, setNewStoreName] = useState('Costco');
  const [newStorePrice, setNewStorePrice] = useState('');
  const [newStoreQty, setNewStoreQty] = useState('');

  // Full item editing state
  const [editingItem, setEditingItem] = useState(null);

  // Handle Photo Upload with Multimodal AI Vision
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzingImage(true);
      showToast('info', 'Procesando Foto', 'Comprimiendo y analizando etiqueta del producto...');
      
      const { dataUrl, base64, mimeType } = await compressImage(file, 800, 0.75);
      setProductImage(dataUrl);

      const parsed = await analyzeProductImage(base64, mimeType, geminiApiKey);
      if (parsed.name) setItemName(parsed.name);
      if (parsed.category) setItemCategory(parsed.category);
      if (parsed.notes) setItemNotes(parsed.notes);
      if (Array.isArray(parsed.stores) && parsed.stores.length > 0) {
        setStorePrices(parsed.stores);
      }

      showToast('success', '¡Producto Identificado!', `Se detectó "${parsed.name}" y se autollenaron los datos.`);
    } catch (err) {
      console.error('Vision analysis error:', err);
      showToast('warning', 'Lectura de Imagen', err.message || 'No se pudo leer la etiqueta automáticamente.');
    } finally {
      setIsAnalyzingImage(false);
      e.target.value = '';
    }
  };

  // Body scroll lock on modals open
  useEffect(() => {
    if (addingStoreToItem || editingItem) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [addingStoreToItem, editingItem]);

  const categories = ['All', 'Skincare', 'Dental', 'Higiene', 'Despensa', 'Limpieza', 'Otros'];
  const storesPreset = [
    "Costco",
    "Sam's Club",
    "Bodega Aurrera",
    "Tiendas 3B",
    "Walmart",
    "Soriana",
    "Chedraui",
    "HEB",
    "Farmacias Guadalajara",
    "Farmacia Benavides",
    "Farmacia del Ahorro",
    "Amazon",
    "Mercado Libre",
    "Liverpool"
  ];

  const handleAddItem = (e) => {
    e.preventDefault();
    const trimmedName = itemName.trim();
    if (!trimmedName) return;

    // Scan for duplicate/similar items before adding manually
    const similarProduct = findSimilarity(trimmedName, householdItems, 'name');
    if (similarProduct) {
      const proceed = window.confirm(
        `⚠️ Detectamos un producto similar en tu lista:\n\n` +
        `• Ya registrado: "${similarProduct.name}" (${similarProduct.category})\n` +
        `• Nuevo a agregar: "${trimmedName}"\n\n` +
        `¿Estás seguro de que deseas agregarlo de todos modos como un nuevo producto?`
      );
      if (!proceed) return;
    }

    // Build stores list (only those with values)
    const validStores = (storePrices || [])
      .filter(s => s && s.storeName && s.price && s.quantity)
      .map(s => {
        const p = safeNumber(s.price, 0);
        const q = safeNumber(s.quantity, 1);
        return {
          storeName: String(s.storeName).trim() || 'Tienda',
          price: p,
          quantity: q,
          unitPrice: q > 0 ? p / q : 0
        };
      })
      .filter(s => s.price > 0 && s.quantity > 0);

    const newItem = {
      id: Date.now().toString(),
      name: trimmedName,
      category: itemCategory || 'Skincare',
      stores: validStores,
      preferredStore: validStores[0]?.storeName || '',
      repurchaseVerdict: itemVerdict || 'yes',
      notes: itemNotes || ''
    };

    const sanitized = sanitizeHouseholdItem(newItem);
    if (!sanitized) return;

    setHouseholdItems(prev => [...(Array.isArray(prev) ? prev : []), sanitized]);
    setItemName('');
    setItemNotes('');
    setProductImage('');
    setStorePrices([
      { storeName: "Costco", price: '', quantity: '' },
      { storeName: "Sam's Club", price: '', quantity: '' }
    ]);
    setIsAddingItem(false);
    showToast('success', 'Insumo Registrado', `Se guardó "${trimmedName}" en el comparador.`);
  };

  const handleDeleteItem = (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${name || 'este producto'}" del comparador de precios?`)) {
      return;
    }
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).filter(i => i && i.id !== id));
    showToast('warning', 'Insumo Eliminado', `Se eliminó "${name}"`);
  };

  // Open item editor modal
  const handleOpenEdit = (item) => {
    const currentStores = Array.isArray(item.stores) ? item.stores : [];
    setEditingItem({
      id: item.id,
      name: item.name || '',
      category: item.category || 'Higiene',
      repurchaseVerdict: item.repurchaseVerdict || 'yes',
      preferredStore: item.preferredStore || '',
      notes: item.notes || '',
      stores: currentStores.length > 0
        ? currentStores.map(s => ({
            storeName: s.storeName || '',
            price: s.price !== undefined && s.price !== null ? s.price : '',
            quantity: s.quantity !== undefined && s.quantity !== null ? s.quantity : '',
            unitPrice: s.unitPrice || 0
          }))
        : [{ storeName: 'Costco', price: '', quantity: '' }]
    });
  };

  // Save edited item
  const handleSaveEdit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingItem || !editingItem.name?.trim()) {
      showToast('warning', 'Campo Requerido', 'El nombre del insumo no puede estar vacío.');
      return;
    }

    const trimmedName = editingItem.name.trim();

    // Validate stores list
    const validStores = (editingItem.stores || [])
      .filter(s => s && String(s.storeName || '').trim() && s.price !== '' && s.quantity !== '')
      .map(s => {
        const p = safeNumber(s.price, 0);
        const q = safeNumber(s.quantity, 1);
        return {
          storeName: String(s.storeName).trim() || 'Tienda',
          price: p,
          quantity: q,
          unitPrice: q > 0 ? p / q : 0
        };
      })
      .filter(s => s.price > 0 && s.quantity > 0);

    let prefStore = editingItem.preferredStore;
    if (prefStore && !validStores.some(s => s.storeName === prefStore)) {
      prefStore = validStores[0]?.storeName || '';
    } else if (!prefStore && validStores.length > 0) {
      prefStore = validStores[0]?.storeName || '';
    }

    const updatedObj = {
      id: editingItem.id,
      name: trimmedName,
      category: editingItem.category || 'Higiene',
      stores: validStores,
      preferredStore: prefStore,
      repurchaseVerdict: editingItem.repurchaseVerdict || 'yes',
      notes: editingItem.notes || ''
    };

    const sanitized = sanitizeHouseholdItem(updatedObj);
    if (!sanitized) return;

    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(i => (i && i.id === sanitized.id ? sanitized : i)));
    showToast('success', 'Insumo Actualizado', `Se guardaron los cambios para "${trimmedName}".`);
    setEditingItem(null);
  };

  const handleSetPreferred = (itemId, storeName) => {
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        showToast('success', 'Preferencia Guardada', `Tienda preferida para ${item.name}: ${storeName}`);
        return { ...item, preferredStore: storeName };
      }
      return item;
    }));
  };

  const handleSetVerdict = (itemId, newVerdict) => {
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        return { ...item, repurchaseVerdict: newVerdict };
      }
      return item;
    }));
    const label = newVerdict === 'need_to_buy' 
      ? 'Marcado como: Necesito Comprar 🛒' 
      : newVerdict === 'yes' 
      ? 'Marcado como: Compraría ✓' 
      : newVerdict === 'maybe' 
      ? 'Marcado como: En Duda ?' 
      : 'Marcado como: No Volver a Comprar ✕';
    showToast('info', 'Estado Actualizado', label);
  };

  const handleAddStorePrice = (e) => {
    e.preventDefault();
    if (!newStorePrice || !newStoreQty || !addingStoreToItem) return;

    const trimmedStore = String(newStoreName || '').trim() || 'Tienda';
    const p = safeNumber(newStorePrice, 0);
    const q = safeNumber(newStoreQty, 1);
    if (p <= 0 || q <= 0) return;

    const newStoreObj = {
      storeName: trimmedStore,
      price: p,
      quantity: q,
      unitPrice: p / q
    };

    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === addingStoreToItem.id) {
        const currentStores = (Array.isArray(item.stores) ? item.stores : []).filter(s => s && typeof s === 'object');
        // If store already exists, overwrite it. Else add it.
        const filteredStores = currentStores.filter(s => s.storeName !== trimmedStore);
        const updatedStores = [...filteredStores, newStoreObj];
        return {
          ...item,
          stores: updatedStores,
          // Update preferredStore if empty
          preferredStore: item.preferredStore || trimmedStore
        };
      }
      return item;
    }));

    showToast('success', 'Precio Agregado', `Se añadió costo para ${trimmedStore}`);
    setNewStorePrice('');
    setNewStoreQty('');
    setAddingStoreToItem(null);
  };

  const removeStoreFromItem = (itemId, storeName) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la tienda "${storeName}" de este producto?`)) {
      return;
    }
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        const currentStores = (Array.isArray(item.stores) ? item.stores : []).filter(s => s && typeof s === 'object');
        const updatedStores = currentStores.filter(s => s.storeName !== storeName);
        let newPref = item.preferredStore;
        if (newPref === storeName) {
          newPref = updatedStores[0]?.storeName || '';
        }
        return {
          ...item,
          stores: updatedStores,
          preferredStore: newPref
        };
      }
      return item;
    }));
    showToast('info', 'Precio Removido', `Se quitó la tienda ${storeName}`);
  };

  const handleUpdateNotes = (itemId, notes) => {
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        return { ...item, notes: String(notes || '') };
      }
      return item;
    }));
  };

  // Safe normalized list & Filter
  const safeItemsList = sanitizeHouseholdList(householdItems);
  const needToBuyCount = safeItemsList.filter(i => i && i.repurchaseVerdict === 'need_to_buy').length;

  const filteredItems = safeItemsList.filter(item => {
    if (!item) return false;
    const name = String(item.name || '');
    const notes = String(item.notes || '');
    const search = String(searchTerm || '').toLowerCase().trim();
    const matchesSearch = !search || 
      name.toLowerCase().includes(search) || 
      notes.toLowerCase().includes(search);
    
    let matchesCategory = true;
    if (categoryFilter === 'need_to_buy') {
      matchesCategory = item.repurchaseVerdict === 'need_to_buy';
    } else if (categoryFilter !== 'All') {
      matchesCategory = item.category === categoryFilter;
    }
    return matchesSearch && matchesCategory;
  });

  // Calculate cheapest store helper
  const getCheapestStore = (stores) => {
    if (!Array.isArray(stores) || stores.length === 0) return null;
    const valid = stores
      .filter(s => s && typeof s === 'object')
      .map(s => {
        const p = safeNumber(s.price, 0);
        const q = safeNumber(s.quantity, 1);
        const u = typeof s.unitPrice === 'number' && !isNaN(s.unitPrice)
          ? s.unitPrice
          : (q > 0 ? p / q : 0);
        return {
          ...s,
          priceNum: p,
          qtyNum: q,
          unitPriceNum: u
        };
      })
      .filter(s => s.priceNum > 0 && s.qtyNum > 0 && s.unitPriceNum > 0);

    if (valid.length === 0) return null;
    return valid.reduce((prev, curr) => (prev.unitPriceNum < curr.unitPriceNum ? prev : curr));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Shared Stores Datalist for Autocomplete */}
      <datalist id="stores-preset-list">
        {storesPreset.map(st => (
          <option key={st} value={st} />
        ))}
      </datalist>

      {/* Search, Filter & Add Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#171a24] p-4 rounded-xl border border-[#e0a96d]/15">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar insumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 text-sm focus:outline-none focus:border-[#e0a96d] transition-colors"
            />
          </div>
          
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-300 text-sm focus:outline-none focus:border-[#e0a96d] cursor-pointer"
          >
            <option value="All">Todas las categorías</option>
            <option value="need_to_buy" className="text-amber-400 font-bold">🛒 Lista: Necesito Comprar ({needToBuyCount})</option>
            {categories.filter(c => c !== 'All').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Quick Filter Pill for Need to Buy */}
          <button
            type="button"
            onClick={() => setCategoryFilter(prev => prev === 'need_to_buy' ? 'All' : 'need_to_buy')}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
              categoryFilter === 'need_to_buy'
                ? 'bg-amber-500 text-[#0b0c10] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#0b0c10] hover:bg-[#0b0c10]/80 text-amber-300 border-amber-500/30'
            }`}
            title="Filtrar únicamente productos marcados como 'Necesito Comprar'"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Por Comprar ({needToBuyCount})</span>
          </button>
        </div>

        <button
          onClick={() => setIsAddingItem(!isAddingItem)}
          className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 cursor-pointer transition-all self-stretch md:self-auto justify-center shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Insumo</span>
        </button>
      </div>

      {/* Add New Item Form */}
      {isAddingItem && (
        <form onSubmit={handleAddItem} className="bg-[#171a24] border border-[#e0a96d]/20 p-6 rounded-xl space-y-4 animate-fade-in shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-100 font-outfit flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#e0a96d]" />
              <span>Registrar Nuevo Insumo / Producto</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Captura manual o automática por foto
            </span>
          </div>

          {/* AI Vision Upload Card */}
          <div className="p-4 bg-[#0b0c10] border border-[#e0a96d]/25 rounded-xl flex flex-col sm:flex-row items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {productImage ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#e0a96d]/40 shrink-0 group">
                <img src={productImage} alt="Producto" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setProductImage('')}
                  className="absolute top-1 right-1 p-1 rounded-md bg-[#0b0c10]/80 text-rose-400 hover:text-rose-200 cursor-pointer"
                  title="Quitar foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isAnalyzingImage}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-3 bg-[#171a24] hover:bg-slate-800 border border-dashed border-[#e0a96d]/40 rounded-lg text-slate-300 text-xs font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {isAnalyzingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#e0a96d] animate-spin" />
                    <span>Analizando etiqueta con IA...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-[#e0a96d]" />
                    <span>Tomar / Subir Foto y Autollenar con IA</span>
                  </>
                )}
              </button>
            )}

            <div className="flex-1 text-center sm:text-left">
              {isAnalyzingImage ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#e0a96d] animate-pulse">
                    🤖 Gemini IA está leyendo la etiqueta...
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Detectando nombre, marca, categoría, ingredientes activos y estimaciones de tienda.
                  </p>
                </div>
              ) : productImage ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ✓ Foto Analizada por Visión IA
                  </span>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Puedes ajustar o confirmar los campos autollenados abajo antes de guardar.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-200">
                    ¿Tienes el producto en mano o una foto del empaque?
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Sube una foto de cremas, skincare, despensa o farmacia para autollenar todos los campos en un segundo.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre</label>
              <input
                type="text"
                placeholder="Ej. Crema Aclaradora Teatrical Concha Nácar"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                required
              />
              {itemName.trim().length >= 3 && (() => {
                const sim = findSimilarity(itemName.trim(), householdItems, 'name');
                if (sim) {
                  return (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-1.5 text-[11px] text-amber-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Probablemente similar a <strong className="text-slate-100 font-bold">"{sim.name}"</strong> ({sim.category}).</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
              >
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Estado de Compra / Intención</label>
              <select
                value={itemVerdict}
                onChange={(e) => setItemVerdict(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
              >
                <option value="yes">✓ Compraría / Aprobado</option>
                <option value="need_to_buy">🛒 Necesito Comprar</option>
                <option value="maybe">? Duda / En Evaluación</option>
                <option value="no">✕ No volvería a comprar</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">Precios por Establecimiento (opcional al inicio)</label>
            {storePrices.map((sp, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#0b0c10] p-3 rounded-lg border border-slate-800">
                <div className="sm:col-span-5 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Tienda</span>
                  <input
                    type="text"
                    list="stores-preset-list"
                    placeholder="Ej. Costco, Walmart..."
                    value={sp.storeName}
                    onChange={(e) => {
                      const updated = [...storePrices];
                      updated[idx].storeName = e.target.value;
                      setStorePrices(updated);
                    }}
                    className="bg-[#171a24] border border-[#e0a96d]/10 rounded py-1 px-2 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>
                <div className="sm:col-span-3 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Precio Total ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 420"
                    value={sp.price}
                    onChange={(e) => {
                      const updated = [...storePrices];
                      updated[idx].price = e.target.value;
                      setStorePrices(updated);
                    }}
                    className="bg-[#171a24] border border-[#e0a96d]/10 rounded py-1 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Cantidad (Uds/Rollos/Grs)</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 32"
                    value={sp.quantity}
                    onChange={(e) => {
                      const updated = [...storePrices];
                      updated[idx].quantity = e.target.value;
                      setStorePrices(updated);
                    }}
                    className="bg-[#171a24] border border-[#e0a96d]/10 rounded py-1 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end justify-center pb-1">
                  {storePrices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setStorePrices(storePrices.filter((_, i) => i !== idx))}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setStorePrices([...storePrices, { storeName: "Costco", price: '', quantity: '' }])}
              className="text-[10px] text-[#e0a96d] hover:text-[#f5d4af] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Añadir otra tienda</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Notas de Rendimiento / Observaciones</label>
            <input
              type="text"
              placeholder="Ej. Muy suave, el paquete de Sam's dura 3 meses."
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg cursor-pointer transition-all"
            >
              Guardar Insumo
            </button>
          </div>
        </form>
      )}

      {/* Grid of items */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredItems.length === 0 ? (
          <div className="col-span-full bg-[#171a24] p-12 text-center rounded-xl border border-slate-800">
            <HelpCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No se encontraron insumos que coincidan con la búsqueda.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const cheapest = getCheapestStore(item.stores);
            
            return (
              <div key={item.id} className="bg-[#171a24] border border-[#e0a96d]/15 p-5 rounded-xl flex flex-col justify-between shadow-lg relative group/card">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#e0a96d] px-2.5 py-0.5 rounded bg-[#e0a96d]/10 border border-[#e0a96d]/10">
                        {item.category}
                      </span>
                      <h4 className="text-base font-bold text-slate-100 font-outfit mt-1.5 truncate" title={item.name}>
                        {item.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Direct Dropdown Verdict Selector */}
                      <div className="relative">
                        <select
                          value={item.repurchaseVerdict || 'yes'}
                          onChange={(e) => handleSetVerdict(item.id, e.target.value)}
                          className={`text-[11px] font-bold py-1.5 pl-3 pr-7 rounded-full border transition-all cursor-pointer focus:outline-none appearance-none ${
                            item.repurchaseVerdict === 'need_to_buy' 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30' 
                              : item.repurchaseVerdict === 'yes' 
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25' 
                              : item.repurchaseVerdict === 'maybe'
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 hover:bg-sky-500/25'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25'
                          }`}
                          title="Seleccionar veredicto / estado de compra"
                        >
                          <option value="yes" className="bg-[#171a24] text-emerald-400">✓ Compraría</option>
                          <option value="need_to_buy" className="bg-[#171a24] text-amber-300">🛒 Necesito Comprar</option>
                          <option value="maybe" className="bg-[#171a24] text-sky-400">? Duda</option>
                          <option value="no" className="bg-[#171a24] text-rose-400">✕ No Comprar</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>

                      {/* Edit Item Button */}
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#e0a96d] hover:bg-[#e0a96d]/10 transition-all cursor-pointer"
                        title="Editar insumo y precios"
                        aria-label={`Editar ${item.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete item */}
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Eliminar insumo"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stores pricing lists */}
                  <div className="space-y-2 mt-4">
                    {!Array.isArray(item.stores) || item.stores.filter(s => s && safeNumber(s.price, 0) > 0 && safeNumber(s.quantity, 0) > 0).length === 0 ? (
                      <div className="bg-[#0b0c10]/40 border border-slate-800/80 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-400 italic">No hay precios registrados todavía.</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Usa "Agregar Precio Tienda" o "Editar Insumo" para registrar costos.</p>
                      </div>
                    ) : (
                      item.stores
                        .filter(s => s && typeof s === 'object' && safeNumber(s.price, 0) > 0 && safeNumber(s.quantity, 0) > 0)
                        .map((store, sIdx) => {
                          const p = safeNumber(store.price, 0);
                          const q = safeNumber(store.quantity, 1);
                          const u = typeof store.unitPrice === 'number' && !isNaN(store.unitPrice)
                            ? store.unitPrice
                            : (q > 0 ? p / q : 0);
                          const isCheapest = cheapest && cheapest.storeName === store.storeName;
                          const isPreferred = item.preferredStore === store.storeName;
                          
                          return (
                            <div 
                              key={store.storeName ? `${store.storeName}-${sIdx}` : sIdx}
                              className={`p-2.5 rounded-lg flex items-center justify-between border text-xs transition-colors ${
                                isPreferred 
                                    ? 'bg-[#0b0c10] border-[#e0a96d]/40 shadow-inner' 
                                    : 'bg-[#0b0c10]/50 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Star icon for manual preference */}
                                <button
                                  onClick={() => handleSetPreferred(item.id, store.storeName)}
                                  className={`p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer ${
                                    isPreferred ? 'text-[#e0a96d]' : 'text-slate-600 hover:text-slate-400'
                                  }`}
                                  title="Marcar como predeterminado/favorito"
                                  aria-label={`Marcar ${store.storeName} como favorito`}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isPreferred ? 'fill-[#e0a96d]' : ''}`} />
                                </button>
                                <span className="font-semibold text-slate-300 truncate">{store.storeName}</span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 text-right">
                                <div>
                                  <span className="text-slate-200 font-bold">${p.toFixed(2)}</span>
                                  <span className="text-slate-500 text-[10px] block">({q} Uds)</span>
                                </div>
                                <div className="w-20 pl-2 border-l border-slate-800">
                                  <span className="text-[#e0a96d] font-bold block">${u.toFixed(3)}</span>
                                  <span className="text-slate-500 text-[9px] block">por ud</span>
                                </div>
                                
                                {/* Badges */}
                                <div className="flex flex-col gap-0.5 items-end justify-center w-20">
                                  {isCheapest && (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <Award className="w-2.5 h-2.5 shrink-0" />
                                      <span>Más Barato</span>
                                    </span>
                                  )}
                                  {isPreferred && (
                                    <span className="bg-[#e0a96d]/10 text-[#e0a96d] border border-[#e0a96d]/30 text-[8px] font-bold px-1.5 py-0.5 rounded">
                                      Favorito
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEdit(item)}
                                    className="text-slate-500 hover:text-[#e0a96d] p-1 cursor-pointer transition-colors"
                                    title="Modificar precio o tienda"
                                    aria-label={`Editar ${store.storeName}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => removeStoreFromItem(item.id, store.storeName)}
                                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                                    title="Remover este precio"
                                    aria-label={`Remover precio de ${store.storeName}`}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Analysis note under preferred store */}
                  {(() => {
                    if (!cheapest || !item.preferredStore || item.preferredStore === cheapest.storeName) return null;
                    const prefStore = (Array.isArray(item.stores) ? item.stores : []).find(s => s && s.storeName === item.preferredStore);
                    if (!prefStore) return null;
                    const prefPrice = safeNumber(prefStore.price, 0);
                    const prefQty = safeNumber(prefStore.quantity, 1);
                    const prefUnit = typeof prefStore.unitPrice === 'number' && !isNaN(prefStore.unitPrice)
                      ? prefStore.unitPrice
                      : (prefQty > 0 ? prefPrice / prefQty : 0);
                    if (prefUnit <= 0 || !cheapest.unitPriceNum) return null;
                    const diff = prefUnit - cheapest.unitPriceNum;
                    if (diff <= 0.0001) return null;

                    return (
                      <div className="mt-3 bg-amber-500/5 border border-amber-500/10 p-2 rounded text-[10px] text-amber-300/80 leading-relaxed">
                        💡 <strong>Análisis:</strong> El preferido ({item.preferredStore}) cuesta <strong>${diff.toFixed(3)}</strong> más por unidad que el más barato ({cheapest.storeName}).
                      </div>
                    );
                  })()}

                  {/* Notes panel */}
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Notas de rendimiento</label>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                      placeholder="Observaciones de rendimiento..."
                      className="w-full bg-[#0b0c10] border border-[#e0a96d]/10 rounded-lg py-1.5 px-3 text-slate-300 text-xs focus:outline-none focus:border-[#e0a96d]/30 mt-1 transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setAddingStoreToItem(item)}
                    className="text-xs text-[#e0a96d] hover:text-[#f5d4af] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Precio Tienda</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="text-xs text-slate-300 hover:text-slate-100 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1.5 rounded-lg bg-[#0b0c10] border border-[#e0a96d]/20 hover:border-[#e0a96d]/50"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#e0a96d]" />
                    <span>Editar Insumo</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full Edit Item Modal Dialog */}
      {editingItem && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleSaveEdit} className="bg-[#171a24] border border-[#e0a96d]/25 rounded-2xl p-6 max-w-xl w-full shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e0a96d]/15 flex items-center justify-center text-[#e0a96d] border border-[#e0a96d]/30">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-outfit">Editar Insumo / Producto</h3>
                  <p className="text-[11px] text-slate-400">Modifica detalles, tiendas y precios registrados</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-1 custom-scrollbar">
              {/* Name and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Insumo / Producto *</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    {categories.filter(c => c !== 'All' && c !== 'need_to_buy').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purchase Verdict */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Estado de Compra / Intención</label>
                <select
                  value={editingItem.repurchaseVerdict || 'yes'}
                  onChange={(e) => setEditingItem({ ...editingItem, repurchaseVerdict: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                >
                  <option value="yes">✓ Compraría / Aprobado</option>
                  <option value="need_to_buy">🛒 Necesito Comprar</option>
                  <option value="maybe">? Duda / En Evaluación</option>
                  <option value="no">✕ No volver a comprar</option>
                </select>
              </div>

              {/* Stores and Prices Management */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-200">Tiendas y Precios Registrados</label>
                    <span className="text-[10px] text-slate-400">Puedes escribir cualquier tienda personalizada o seleccionar de la lista</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem({
                        ...editingItem,
                        stores: [...(editingItem.stores || []), { storeName: '', price: '', quantity: '' }]
                      });
                    }}
                    className="text-xs text-[#e0a96d] hover:text-[#f5d4af] font-bold flex items-center gap-1 cursor-pointer bg-[#e0a96d]/10 hover:bg-[#e0a96d]/20 border border-[#e0a96d]/30 px-2.5 py-1 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Tienda</span>
                  </button>
                </div>

                {(!editingItem.stores || editingItem.stores.length === 0) ? (
                  <div className="p-4 bg-[#0b0c10] border border-dashed border-slate-800 rounded-xl text-center">
                    <p className="text-xs text-slate-400">No hay tiendas registradas para este producto.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem({
                          ...editingItem,
                          stores: [{ storeName: 'Costco', price: '', quantity: '' }]
                        });
                      }}
                      className="mt-2 text-xs text-[#e0a96d] font-semibold underline cursor-pointer"
                    >
                      + Agregar primer precio
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {editingItem.stores.map((st, idx) => {
                      const p = safeNumber(st.price, 0);
                      const q = safeNumber(st.quantity, 0);
                      const u = q > 0 && p > 0 ? p / q : 0;
                      const isPref = editingItem.preferredStore === st.storeName && st.storeName;

                      return (
                        <div key={idx} className="bg-[#0b0c10] border border-slate-800 hover:border-slate-700 p-3 rounded-xl space-y-2 transition-colors">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            {/* Store Name Input with Datalist */}
                            <div className="sm:col-span-5">
                              <label className="block text-[10px] text-slate-400 font-medium mb-0.5">Tienda / Establecimiento</label>
                              <input
                                type="text"
                                list="stores-preset-list"
                                placeholder="Ej. Costco, Walmart, Local..."
                                value={st.storeName}
                                onChange={(e) => {
                                  const updated = [...editingItem.stores];
                                  updated[idx].storeName = e.target.value;
                                  setEditingItem({ ...editingItem, stores: updated });
                                }}
                                className="w-full bg-[#171a24] border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                              />
                            </div>

                            {/* Total Price */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] text-slate-400 font-medium mb-0.5">Precio Total ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={st.price}
                                onChange={(e) => {
                                  const updated = [...editingItem.stores];
                                  updated[idx].price = e.target.value;
                                  setEditingItem({ ...editingItem, stores: updated });
                                }}
                                className="w-full bg-[#171a24] border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                              />
                            </div>

                            {/* Quantity */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] text-slate-400 font-medium mb-0.5">Cantidad (Uds/Kg/etc)</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="1"
                                value={st.quantity}
                                onChange={(e) => {
                                  const updated = [...editingItem.stores];
                                  updated[idx].quantity = e.target.value;
                                  setEditingItem({ ...editingItem, stores: updated });
                                }}
                                className="w-full bg-[#171a24] border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                              />
                            </div>

                            {/* Actions (Delete) */}
                            <div className="sm:col-span-1 flex items-end justify-center pt-2 sm:pt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = editingItem.stores.filter((_, i) => i !== idx);
                                  let newPref = editingItem.preferredStore;
                                  if (newPref === st.storeName) {
                                    newPref = updated[0]?.storeName || '';
                                  }
                                  setEditingItem({ ...editingItem, stores: updated, preferredStore: newPref });
                                }}
                                className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                title="Eliminar tienda"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Calculated Unit Price and Preferred Button */}
                          <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-800/60">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Unitario:</span>
                              {u > 0 ? (
                                <span className="font-bold text-[#e0a96d]">${u.toFixed(3)} / ud</span>
                              ) : (
                                <span className="text-slate-500 italic">Ingresa precio y cantidad</span>
                              )}
                            </div>

                            {st.storeName && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem({ ...editingItem, preferredStore: st.storeName });
                                }}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                  isPref
                                    ? 'bg-[#e0a96d]/20 text-[#e0a96d] border border-[#e0a96d]/40'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                                }`}
                              >
                                <Star className={`w-3 h-3 ${isPref ? 'fill-[#e0a96d] text-[#e0a96d]' : ''}`} />
                                <span>{isPref ? 'Tienda Preferida' : 'Marcar preferida'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notas de Rendimiento / Observaciones</label>
                <textarea
                  rows="2"
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  placeholder="Ej. Rinde 2 meses, consistencia ligera, comprar solo en oferta..."
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-3 border-t border-slate-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg cursor-pointer transition-all shadow-md flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Quick Add Price Store Modal Dialog */}
      {addingStoreToItem && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleAddStorePrice} className="bg-[#171a24] border border-[#e0a96d]/25 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80 shrink-0">
              <div>
                <h3 className="text-md font-bold text-slate-100 font-outfit">Agregar Precio</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Para: {addingStoreToItem.name}</p>
              </div>
              <button 
                type="button"
                onClick={() => setAddingStoreToItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 py-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Establecimiento / Tienda</label>
                <input
                  type="text"
                  list="stores-preset-list"
                  placeholder="Ej. Costco, Walmart, Farmacia..."
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Precio Total ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej. 195.50"
                  value={newStorePrice}
                  onChange={(e) => setNewStorePrice(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad total en unidades</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 12 (rollos, botes, etc)"
                  value={newStoreQty}
                  onChange={(e) => setNewStoreQty(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setAddingStoreToItem(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all shadow-md"
              >
                Añadir Precio
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
