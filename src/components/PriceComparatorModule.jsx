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
  Image as ImageIcon
} from 'lucide-react';
import { compressImage, analyzeProductImage } from '../utils/geminiService';

export default function PriceComparatorModule({
  householdItems,
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
  
  // Add store modal/inline state
  const [addingStoreToItem, setAddingStoreToItem] = useState(null);
  const [newStoreName, setNewStoreName] = useState('Costco');
  const [newStorePrice, setNewStorePrice] = useState('');
  const [newStoreQty, setNewStoreQty] = useState('');

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

  // Body scroll lock on modal open
  useEffect(() => {
    if (addingStoreToItem) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [addingStoreToItem]);

  const categories = ['All', 'Skincare', 'Dental', 'Higiene', 'Despensa', 'Limpieza', 'Otros'];
  const storesPreset = ["Costco", "Sam's Club", "Bodega Aurrera", "Tiendas 3B", "Farmacias Guadalajara", "Amazon"];

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    // Build stores list (only those with values)
    const validStores = storePrices
      .filter(s => s.price && s.quantity)
      .map(s => {
        const p = parseFloat(s.price);
        const q = parseFloat(s.quantity);
        return {
          storeName: s.storeName,
          price: p,
          quantity: q,
          unitPrice: p / q
        };
      });

    const newItem = {
      id: Date.now().toString(),
      name: itemName,
      category: itemCategory,
      stores: validStores,
      preferredStore: validStores[0]?.storeName || '',
      repurchaseVerdict: itemVerdict,
      notes: itemNotes
    };

    setHouseholdItems([...householdItems, newItem]);
    setItemName('');
    setItemNotes('');
    setStorePrices([
      { storeName: "Costco", price: '', quantity: '' },
      { storeName: "Sam's Club", price: '', quantity: '' }
    ]);
    setIsAddingItem(false);
    showToast('success', 'Insumo Registrado', `Se guardó "${itemName}" en el comparador.`);
  };

  const handleDeleteItem = (id, name) => {
    setHouseholdItems(householdItems.filter(i => i.id !== id));
    showToast('warning', 'Insumo Eliminado', `Se eliminó "${name}"`);
  };

  const handleSetPreferred = (itemId, storeName) => {
    const updated = householdItems.map(item => {
      if (item.id === itemId) {
        showToast('success', 'Preferencia Guardada', `Tienda preferida para ${item.name}: ${storeName}`);
        return { ...item, preferredStore: storeName };
      }
      return item;
    });
    setHouseholdItems(updated);
  };

  const handleToggleVerdict = (itemId, current) => {
    const verdicts = ['yes', 'maybe', 'no'];
    const nextIdx = (verdicts.indexOf(current) + 1) % verdicts.length;
    const nextVerdict = verdicts[nextIdx];
    
    setHouseholdItems(householdItems.map(item => {
      if (item.id === itemId) {
        return { ...item, repurchaseVerdict: nextVerdict };
      }
      return item;
    }));
  };

  const handleAddStorePrice = (e) => {
    e.preventDefault();
    if (!newStorePrice || !newStoreQty || !addingStoreToItem) return;

    const p = parseFloat(newStorePrice);
    const q = parseFloat(newStoreQty);
    const newStoreObj = {
      storeName: newStoreName,
      price: p,
      quantity: q,
      unitPrice: p / q
    };

    setHouseholdItems(householdItems.map(item => {
      if (item.id === addingStoreToItem.id) {
        // If store already exists, overwrite it. Else add it.
        const filteredStores = item.stores.filter(s => s.storeName !== newStoreName);
        const updatedStores = [...filteredStores, newStoreObj];
        return {
          ...item,
          stores: updatedStores,
          // Update preferredStore if empty
          preferredStore: item.preferredStore || newStoreName
        };
      }
      return item;
    }));

    showToast('success', 'Precio Agregado', `Se añadió costo para ${newStoreName}`);
    setNewStorePrice('');
    setNewStoreQty('');
    setAddingStoreToItem(null);
  };

  const removeStoreFromItem = (itemId, storeName) => {
    setHouseholdItems(householdItems.map(item => {
      if (item.id === itemId) {
        const updatedStores = item.stores.filter(s => s.storeName !== storeName);
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
    setHouseholdItems(householdItems.map(item => {
      if (item.id === itemId) {
        return { ...item, notes };
      }
      return item;
    }));
  };

  // Filter list
  const filteredItems = householdItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate cheapest store helper
  const getCheapestStore = (stores) => {
    if (!stores || stores.length === 0) return null;
    return stores.reduce((prev, curr) => (prev.unitPrice < curr.unitPrice) ? prev : curr);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search, Filter & Add Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#171a24] p-4 rounded-xl border border-[#e0a96d]/15">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
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
            className="bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-300 text-sm focus:outline-none focus:border-[#e0a96d]"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'All' ? 'Todas las categorías' : cat}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsAddingItem(!isAddingItem)}
          className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 cursor-pointer transition-all self-stretch md:self-auto justify-center"
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
              <label className="block text-xs font-semibold text-slate-400 mb-1">¿Lo volverías a comprar?</label>
              <select
                value={itemVerdict}
                onChange={(e) => setItemVerdict(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
              >
                <option value="yes">Sí, seguro (Recomendado)</option>
                <option value="maybe">Tal vez / Dudoso</option>
                <option value="no">No volvería a comprar</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">Precios por Establecimiento (opcional al inicio)</label>
            {storePrices.map((sp, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-3 bg-[#0b0c10] p-3 rounded-lg border border-slate-800">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Tienda</span>
                  <select
                    value={sp.storeName}
                    onChange={(e) => {
                      const updated = [...storePrices];
                      updated[idx].storeName = e.target.value;
                      setStorePrices(updated);
                    }}
                    className="bg-[#171a24] border border-[#e0a96d]/10 rounded py-1 px-2 text-slate-300 text-xs focus:outline-none"
                  >
                    {storesPreset.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
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
                <div className="flex flex-col gap-1">
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
              <div key={item.id} className="bg-[#171a24] border border-[#e0a96d]/15 p-5 rounded-xl flex flex-col justify-between shadow-lg relative">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#e0a96d] px-2.5 py-0.5 rounded bg-[#e0a96d]/10 border border-[#e0a96d]/10">
                        {item.category}
                      </span>
                      <h4 className="text-base font-bold text-slate-100 font-outfit mt-1.5">{item.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Repurchase Badge Toggle */}
                      <button
                        onClick={() => handleToggleVerdict(item.id, item.repurchaseVerdict)}
                        className={`text-[10px] font-bold py-1 px-2.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                          item.repurchaseVerdict === 'yes' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/20' 
                            : item.repurchaseVerdict === 'maybe'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/35 hover:bg-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/35 hover:bg-rose-500/20'
                        }`}
                        title="Veredicto de recompra. Clic para cambiar."
                      >
                        {item.repurchaseVerdict === 'yes' ? <ThumbsUp className="w-3 h-3" /> : item.repurchaseVerdict === 'no' ? <ThumbsDown className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
                        <span>{item.repurchaseVerdict === 'yes' ? 'Compraría' : item.repurchaseVerdict === 'maybe' ? 'Duda' : 'No' }</span>
                      </button>

                      {/* Delete item */}
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Eliminar insumo"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stores pricing lists */}
                  <div className="space-y-2 mt-4">
                    {item.stores.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">No hay precios registrados. Registra precios abajo.</p>
                    ) : (
                      item.stores.map(store => {
                        const isCheapest = cheapest && cheapest.storeName === store.storeName;
                        const isPreferred = item.preferredStore === store.storeName;
                        
                        return (
                          <div 
                            key={store.storeName}
                            className={`p-2.5 rounded-lg flex items-center justify-between border text-xs ${
                              isPreferred 
                                ? 'bg-[#0b0c10] border-[#e0a96d]/40 shadow-inner' 
                                : 'bg-[#0b0c10]/50 border-slate-800'
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
                                <span className="text-slate-200 font-bold">${store.price.toFixed(2)}</span>
                                <span className="text-slate-500 text-[10px] block">({store.quantity} Uds)</span>
                              </div>
                              <div className="w-20 pl-2 border-l border-slate-800">
                                <span className="text-[#e0a96d] font-bold block">${store.unitPrice.toFixed(3)}</span>
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
                        );
                      })
                    )}
                  </div>

                  {/* Analysis note under preferred store */}
                  {cheapest && item.preferredStore && item.preferredStore !== cheapest.storeName && (
                    <div className="mt-3 bg-amber-500/5 border border-amber-500/10 p-2 rounded text-[10px] text-amber-300/80 leading-relaxed">
                      💡 <strong>Análisis:</strong> El preferido ({item.preferredStore}) cuesta <strong>${(item.stores.find(s => s.storeName === item.preferredStore)?.unitPrice - cheapest.unitPrice).toFixed(3)}</strong> más por unidad que el más barato ({cheapest.storeName}).
                    </div>
                  )}

                  {/* Notes panel */}
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Notas de rendimiento</label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                      placeholder="Observaciones de rendimiento..."
                      className="w-full bg-[#0b0c10] border border-[#e0a96d]/10 rounded-lg py-1.5 px-3 text-slate-300 text-xs focus:outline-none focus:border-[#e0a96d]/30 mt-1 transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => setAddingStoreToItem(item)}
                    className="text-xs text-[#e0a96d] hover:text-[#f5d4af] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Precio Tienda</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Price Store Modal Dialog */}
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Establecimiento</label>
                <select
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                >
                  {storesPreset.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
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
