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
  Store,
  AlertTriangle,
  Layers,
  Tag
} from 'lucide-react';
import { compressImage, analyzeProductImage } from '../utils/geminiService';
import { findSimilarity } from '../utils/similarity';
import { safeNumber, sanitizeHouseholdItem, sanitizeHouseholdList } from '../utils/sanitizers';

/**
 * Automatically derives a suggested subproduct / variety name when comparing
 * an incoming specific product name with an existing broader main product.
 * Example: newName: "Jamón de Pavo San Rafael", mainName: "Jamón" -> "Pavo San Rafael"
 */
export const deriveVarietySuggestion = (newName = '', mainName = '') => {
  if (!newName || !mainName) return '';
  const cleanNew = String(newName).trim();
  const cleanMain = String(mainName).trim();
  if (!cleanNew || !cleanMain) return '';
  if (cleanNew.toLowerCase() === cleanMain.toLowerCase()) return '';

  const escapedMain = cleanMain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedMain}\\b`, 'i');
  let remaining = cleanNew.replace(regex, '').trim();

  // Strip connector punctuation or common prepositions
  remaining = remaining.replace(/^[\s\-_/:\,]+/, '');
  remaining = remaining.replace(/^(de\s+|del\s+|con\s+|en\s+|para\s+)/i, '');
  remaining = remaining.replace(/^[\s\-_/:\,]+/, '').trim();

  return remaining || cleanNew;
};

export default function PriceComparatorModule({
  householdItems = [],
  setHouseholdItems,
  showToast,
  geminiApiKey = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Selected subproduct / variety filter per product card: { [itemId]: 'ALL' | varietyName }
  const [selectedVarieties, setSelectedVarieties] = useState({});

  // Add item form state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Higiene');
  const [itemNotes, setItemNotes] = useState('');
  const [itemVerdict, setItemVerdict] = useState('yes');
  const [productImage, setProductImage] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const fileInputRef = useRef(null);
  
  // Store options in form with variety support
  const [storePrices, setStorePrices] = useState([
    { storeName: "Costco", variety: '', price: '', quantity: '' },
    { storeName: "Sam's Club", variety: '', price: '', quantity: '' }
  ]);
  
  // Quick Add store modal state
  const [addingStoreToItem, setAddingStoreToItem] = useState(null);
  const [newStoreName, setNewStoreName] = useState('Costco');
  const [newStoreVariety, setNewStoreVariety] = useState('');
  const [newStorePrice, setNewStorePrice] = useState('');
  const [newStoreQty, setNewStoreQty] = useState('');

  // Full item editing state
  const [editingItem, setEditingItem] = useState(null);

  // Similar product prompt modal state
  const [similarProductPrompt, setSimilarProductPrompt] = useState(null);

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
        setStorePrices(parsed.stores.map(s => ({
          storeName: s.storeName || '',
          variety: s.variety || s.subproduct || s.brand || '',
          price: s.price || '',
          quantity: s.quantity || ''
        })));
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
    if (addingStoreToItem || editingItem || similarProductPrompt) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [addingStoreToItem, editingItem, similarProductPrompt]);

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

  const resetAddForm = () => {
    setItemName('');
    setItemNotes('');
    setProductImage('');
    setStorePrices([
      { storeName: "Costco", variety: '', price: '', quantity: '' },
      { storeName: "Sam's Club", variety: '', price: '', quantity: '' }
    ]);
    setIsAddingItem(false);
  };

  const executeSaveNewItem = (trimmedName, category, validStores, verdict, notes) => {
    const newItem = {
      id: Date.now().toString(),
      name: trimmedName,
      category: category || 'Skincare',
      stores: validStores,
      preferredStore: validStores[0]?.storeName || '',
      repurchaseVerdict: verdict || 'yes',
      notes: notes || ''
    };

    const sanitized = sanitizeHouseholdItem(newItem);
    if (!sanitized) return;

    setHouseholdItems(prev => [...(Array.isArray(prev) ? prev : []), sanitized]);
    resetAddForm();
    setSimilarProductPrompt(null);
    showToast('success', 'Insumo Registrado', `Se guardó "${trimmedName}" en el comparador.`);
  };

  const handleMergeAndCompareWithExisting = (targetItem, newStores = [], newNotes = '', asVarietyName = '') => {
    if (!targetItem) return;

    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === targetItem.id) {
        const existingStores = Array.isArray(item.stores) ? item.stores : [];
        const updatedStores = [...existingStores];

        newStores.forEach(ns => {
          const varietyVal = String(ns.variety || asVarietyName || '').trim();
          const targetStoreName = String(ns.storeName || '').trim() || 'Tienda';
          const p = safeNumber(ns.price, 0);
          const q = safeNumber(ns.quantity, 1);
          const u = q > 0 ? p / q : 0;

          const preparedStore = {
            storeName: targetStoreName,
            variety: varietyVal,
            price: p,
            quantity: q,
            unitPrice: u
          };

          const existingIdx = updatedStores.findIndex(
            s => (s.storeName?.toLowerCase().trim() === targetStoreName.toLowerCase()) &&
                 ((s.variety || '').toLowerCase().trim() === varietyVal.toLowerCase())
          );
          if (existingIdx >= 0) {
            updatedStores[existingIdx] = preparedStore;
          } else {
            updatedStores.push(preparedStore);
          }
        });

        let preferred = item.preferredStore;
        if (!preferred && updatedStores.length > 0) {
          preferred = updatedStores[0].storeName;
        }

        let combinedNotes = item.notes || '';
        if (newNotes && newNotes.trim() && !combinedNotes.includes(newNotes.trim())) {
          combinedNotes = combinedNotes ? `${combinedNotes} | ${newNotes.trim()}` : newNotes.trim();
        }

        const updatedSubproducts = Array.from(new Set([
          ...(Array.isArray(item.subproducts) ? item.subproducts : []),
          ...updatedStores.map(s => s.variety).filter(Boolean)
        ]));

        return {
          ...item,
          stores: updatedStores,
          subproducts: updatedSubproducts,
          preferredStore: preferred,
          notes: combinedNotes
        };
      }
      return item;
    }));

    resetAddForm();
    setSimilarProductPrompt(null);
    const msg = asVarietyName
      ? `Se guardó "${asVarietyName}" dentro de "${targetItem.name}". ¡Evitaste duplicar productos!`
      : `Se añadieron los precios a "${targetItem.name}". ¡Ya puedes comparar entre tiendas!`;
    showToast('success', asVarietyName ? 'Subproducto Registrado' : 'Comparativa Creada', msg);
  };

  const handleAddItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmedName = itemName.trim();
    if (!trimmedName) return;

    // Build stores list (only those with values)
    const validStores = (storePrices || [])
      .filter(s => s && s.storeName && s.price && s.quantity)
      .map(s => {
        const p = safeNumber(s.price, 0);
        const q = safeNumber(s.quantity, 1);
        return {
          storeName: String(s.storeName).trim() || 'Tienda',
          variety: String(s.variety || '').trim(),
          price: p,
          quantity: q,
          unitPrice: q > 0 ? p / q : 0
        };
      })
      .filter(s => s.price > 0 && s.quantity > 0);

    // Scan for duplicate/similar items before adding manually
    const similarProduct = findSimilarity(trimmedName, householdItems, 'name');
    if (similarProduct) {
      const suggestedVariety = deriveVarietySuggestion(trimmedName, similarProduct.name);
      setSimilarProductPrompt({
        similarProduct,
        newName: trimmedName,
        suggestedVariety,
        newCategory: itemCategory || 'Skincare',
        validStores,
        newNotes: itemNotes || '',
        newVerdict: itemVerdict || 'yes'
      });
      return;
    }

    executeSaveNewItem(trimmedName, itemCategory, validStores, itemVerdict, itemNotes);
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
            variety: s.variety || '',
            price: s.price !== undefined && s.price !== null ? s.price : '',
            quantity: s.quantity !== undefined && s.quantity !== null ? s.quantity : '',
            unitPrice: s.unitPrice || 0
          }))
        : [{ storeName: 'Costco', variety: '', price: '', quantity: '' }]
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
          variety: String(s.variety || '').trim(),
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
    let label = 'Marcado como: Ya tengo (En uso) 🏠';
    if (newVerdict === 'running_low') label = 'Marcado como: Ya casi se necesita ⚠️';
    else if (newVerdict === 'need_to_buy') label = 'Marcado como: Necesito Comprar 🛒';
    else if (newVerdict === 'maybe') label = 'Marcado como: Por Probar / En la mira ✨';
    else if (newVerdict === 'no') label = 'Marcado como: No volver a comprar ✕';
    showToast('info', 'Estado Actualizado', label);
  };

  const handleAddStorePrice = (e) => {
    e.preventDefault();
    if (!newStorePrice || !newStoreQty || !addingStoreToItem) return;

    const trimmedStore = String(newStoreName || '').trim() || 'Tienda';
    const trimmedVariety = String(newStoreVariety || '').trim();
    const p = safeNumber(newStorePrice, 0);
    const q = safeNumber(newStoreQty, 1);
    if (p <= 0 || q <= 0) return;

    const newStoreObj = {
      storeName: trimmedStore,
      variety: trimmedVariety,
      price: p,
      quantity: q,
      unitPrice: p / q
    };

    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === addingStoreToItem.id) {
        const currentStores = (Array.isArray(item.stores) ? item.stores : []).filter(s => s && typeof s === 'object');
        // If same store AND variety already exists, overwrite it. Else add it.
        const filteredStores = currentStores.filter(
          s => !(s.storeName?.toLowerCase().trim() === trimmedStore.toLowerCase() &&
                 (s.variety || '').toLowerCase().trim() === trimmedVariety.toLowerCase())
        );
        const updatedStores = [...filteredStores, newStoreObj];
        const updatedSubproducts = Array.from(new Set([
          ...(Array.isArray(item.subproducts) ? item.subproducts : []),
          ...updatedStores.map(s => s.variety).filter(Boolean)
        ]));

        return {
          ...item,
          stores: updatedStores,
          subproducts: updatedSubproducts,
          preferredStore: item.preferredStore || trimmedStore
        };
      }
      return item;
    }));

    showToast('success', 'Precio Agregado', `Se añadió costo para ${trimmedStore}${trimmedVariety ? ` (${trimmedVariety})` : ''}`);
    setNewStorePrice('');
    setNewStoreQty('');
    setNewStoreVariety('');
    setAddingStoreToItem(null);
  };

  const removeStoreFromItem = (itemId, storeName, variety = '') => {
    const label = variety ? `${storeName} (${variety})` : storeName;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${label}" de este producto?`)) {
      return;
    }
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        const currentStores = (Array.isArray(item.stores) ? item.stores : []).filter(s => s && typeof s === 'object');
        const updatedStores = currentStores.filter(
          s => !(s.storeName === storeName && (s.variety || '') === (variety || ''))
        );
        let newPref = item.preferredStore;
        if (newPref === storeName && !updatedStores.some(s => s.storeName === storeName)) {
          newPref = updatedStores[0]?.storeName || '';
        }
        const updatedSubproducts = Array.from(new Set(updatedStores.map(s => s.variety).filter(Boolean)));
        return {
          ...item,
          stores: updatedStores,
          subproducts: updatedSubproducts,
          preferredStore: newPref
        };
      }
      return item;
    }));
    showToast('info', 'Precio Removido', `Se quitó ${label}`);
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
  const runningLowCount = safeItemsList.filter(i => i && i.repurchaseVerdict === 'running_low').length;

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
    } else if (categoryFilter === 'running_low') {
      matchesCategory = item.repurchaseVerdict === 'running_low';
    } else if (categoryFilter === 'to_buy_all') {
      matchesCategory = item.repurchaseVerdict === 'need_to_buy' || item.repurchaseVerdict === 'running_low';
    } else if (categoryFilter === 'in_stock') {
      matchesCategory = item.repurchaseVerdict === 'yes';
    } else if (categoryFilter === 'wishlist') {
      matchesCategory = item.repurchaseVerdict === 'maybe';
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
            <option value="All">Todas las categorías y estados</option>
            <optgroup label="Filtrar por Estado">
              <option value="need_to_buy" className="text-amber-400 font-bold">🛒 Necesito Comprar ({needToBuyCount})</option>
              <option value="running_low" className="text-orange-400 font-bold">⚠️ Ya casi se necesita ({runningLowCount})</option>
              <option value="to_buy_all" className="text-amber-300 font-bold">🛍️ Por Comprar + Ya casi ({needToBuyCount + runningLowCount})</option>
              <option value="in_stock" className="text-emerald-400 font-bold">🏠 Ya tengo / En uso</option>
              <option value="wishlist" className="text-purple-300 font-bold">✨ Por probar / En la mira</option>
            </optgroup>
            <optgroup label="Categorías de Insumos">
              {categories.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </optgroup>
          </select>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCategoryFilter(prev => prev === 'need_to_buy' ? 'All' : 'need_to_buy')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                categoryFilter === 'need_to_buy'
                  ? 'bg-amber-500 text-[#0b0c10] border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-[#0b0c10] hover:bg-[#0b0c10]/80 text-amber-300 border-amber-500/30'
              }`}
              title="Filtrar productos que necesitas comprar"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Por Comprar ({needToBuyCount})</span>
            </button>

            {runningLowCount > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter(prev => prev === 'running_low' ? 'All' : 'running_low')}
                className={`py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  categoryFilter === 'running_low'
                    ? 'bg-orange-500 text-[#0b0c10] border-orange-400 shadow-lg shadow-orange-500/20'
                    : 'bg-[#0b0c10] hover:bg-[#0b0c10]/80 text-orange-300 border-orange-500/30'
                }`}
                title="Filtrar productos que ya casi se terminan"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Ya casi ({runningLowCount})</span>
              </button>
            )}
          </div>
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
                if (!sim) return null;
                const suggestedSub = deriveVarietySuggestion(itemName.trim(), sim.name);

                return (
                  <div className="mt-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 text-xs animate-fade-in shadow-inner">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Producto similar detectado en tu comparador</span>
                      </div>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {sim.category}
                      </span>
                    </div>

                    <div className="bg-[#0b0c10]/70 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                      <div className="font-bold text-slate-100 text-sm">{sim.name}</div>
                      {Array.isArray(sim.subproducts) && sim.subproducts.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="text-[10px] text-slate-400 font-semibold">Subproductos actuales:</span>
                          {sim.subproducts.map((sp, sIdx) => (
                            <span key={sIdx} className="text-[10px] bg-[#e0a96d]/15 text-[#e0a96d] px-1.5 py-0.5 rounded border border-[#e0a96d]/25">
                              {sp}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-400">Tiendas registradas:</span>
                        {Array.isArray(sim.stores) && sim.stores.length > 0 ? (
                          sim.stores.map((s, idx) => (
                            <span key={idx} className="font-medium text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded text-[10px] border border-slate-700/60">
                              {s.storeName}{s.variety ? ` (${s.variety})` : ''}: <strong>${s.price}</strong>
                            </span>
                          ))
                        ) : (
                          <span className="italic text-slate-500">Sin precios registrados aún</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {suggestedSub && (
                        <button
                          type="button"
                          onClick={() => {
                            const valid = (storePrices || [])
                              .filter(s => s && s.storeName && s.price && s.quantity)
                              .map(s => ({
                                storeName: String(s.storeName).trim() || 'Tienda',
                                variety: s.variety || suggestedSub,
                                price: safeNumber(s.price, 0),
                                quantity: safeNumber(s.quantity, 1),
                                unitPrice: safeNumber(s.quantity, 1) > 0 ? safeNumber(s.price, 0) / safeNumber(s.quantity, 1) : 0
                              }))
                              .filter(s => s.price > 0 && s.quantity > 0);

                            handleMergeAndCompareWithExisting(sim, valid, itemNotes, suggestedSub);
                          }}
                          className="btn-rose-gold text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>🏷️ Guardar como subproducto "{suggestedSub}" en "{sim.name}" (Recomendado)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const valid = (storePrices || [])
                            .filter(s => s && s.storeName && s.price && s.quantity)
                            .map(s => ({
                              storeName: String(s.storeName).trim() || 'Tienda',
                              variety: s.variety || '',
                              price: safeNumber(s.price, 0),
                              quantity: safeNumber(s.quantity, 1),
                              unitPrice: safeNumber(s.quantity, 1) > 0 ? safeNumber(s.price, 0) / safeNumber(s.quantity, 1) : 0
                            }))
                            .filter(s => s.price > 0 && s.quantity > 0);

                          handleMergeAndCompareWithExisting(sim, valid, itemNotes);
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#e0a96d]" />
                        <span>⚖️ Comparar directamente en "{sim.name}"</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(sim)}
                        className="text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer border border-slate-800"
                      >
                        Ver / Editar ficha existente
                      </button>
                    </div>
                  </div>
                );
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
              <label className="block text-xs font-semibold text-slate-400 mb-1">Estado del Insumo / Compra</label>
              <select
                value={itemVerdict}
                onChange={(e) => setItemVerdict(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
              >
                <option value="yes">🏠 Ya tengo / En uso</option>
                <option value="running_low">⚠️ Ya casi se necesita</option>
                <option value="need_to_buy">🛒 Necesito Comprar</option>
                <option value="maybe">✨ Por probar / En la mira</option>
                <option value="no">✕ No volver a comprar</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">Precios por Establecimiento y Subproducto (opcional al inicio)</label>
            {storePrices.map((sp, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#0b0c10] p-3 rounded-lg border border-slate-800">
                <div className="sm:col-span-4 flex flex-col gap-1">
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
                  <span className="text-[10px] text-slate-400 font-semibold">Subproducto / Tipo (opcional)</span>
                  <input
                    type="text"
                    placeholder="Ej. Pavo San Rafael, FUD..."
                    value={sp.variety || ''}
                    onChange={(e) => {
                      const updated = [...storePrices];
                      updated[idx].variety = e.target.value;
                      setStorePrices(updated);
                    }}
                    className="bg-[#171a24] border border-[#e0a96d]/10 rounded py-1 px-2 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1">
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
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Cantidad (Uds/Kg/etc)</span>
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
              onClick={() => setStorePrices([...storePrices, { storeName: "Costco", variety: '', price: '', quantity: '' }])}
              className="text-[10px] text-[#e0a96d] hover:text-[#f5d4af] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Añadir otra tienda / variedad</span>
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
            const itemVarieties = Array.from(new Set((item.stores || []).map(s => s.variety?.trim()).filter(Boolean)));
            const currentVariety = selectedVarieties[item.id] || 'ALL';
            
            const visibleStores = (item.stores || []).filter(s => {
              if (!s || safeNumber(s.price, 0) <= 0 || safeNumber(s.quantity, 0) <= 0) return false;
              if (currentVariety === 'ALL') return true;
              return (s.variety || '').toLowerCase().trim() === currentVariety.toLowerCase().trim();
            });

            const cheapestOverall = getCheapestStore(item.stores);
            const cheapestForView = getCheapestStore(visibleStores);
            
            return (
              <div key={item.id} className="bg-[#171a24] border border-[#e0a96d]/15 p-5 rounded-xl flex flex-col justify-between shadow-lg relative group/card">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-[#e0a96d] px-2.5 py-0.5 rounded bg-[#e0a96d]/10 border border-[#e0a96d]/10">
                          {item.category}
                        </span>
                        {itemVarieties.length > 0 && (
                          <span className="text-[10px] font-semibold text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <Layers className="w-3 h-3 text-amber-400" />
                            <span>{itemVarieties.length} subproducto{itemVarieties.length > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>
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
                              : item.repurchaseVerdict === 'running_low'
                              ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 hover:bg-orange-500/30'
                              : item.repurchaseVerdict === 'maybe'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30'
                              : item.repurchaseVerdict === 'no'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                          }`}
                          title="Seleccionar estado de insumo / compra"
                        >
                          <option value="yes" className="bg-[#171a24] text-emerald-400">🏠 Ya tengo</option>
                          <option value="running_low" className="bg-[#171a24] text-orange-400">⚠️ Ya casi</option>
                          <option value="need_to_buy" className="bg-[#171a24] text-amber-300">🛒 Necesito Comprar</option>
                          <option value="maybe" className="bg-[#171a24] text-purple-300">✨ Por probar</option>
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

                  {/* Subproduct / Variety Tabs (if more than 1 variety is recorded) */}
                  {itemVarieties.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
                        <Tag className="w-3 h-3 text-[#e0a96d]" />
                        <span>Tipo / Marca:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedVarieties(prev => ({ ...prev, [item.id]: 'ALL' }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          currentVariety === 'ALL'
                            ? 'bg-[#e0a96d] text-[#0b0c10] shadow-sm'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        Todos ({item.stores.length})
                      </button>
                      {itemVarieties.map(v => {
                        const count = (item.stores || []).filter(s => (s.variety || '').toLowerCase().trim() === v.toLowerCase().trim()).length;
                        const isSelected = currentVariety.toLowerCase().trim() === v.toLowerCase().trim();
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setSelectedVarieties(prev => ({ ...prev, [item.id]: isSelected ? 'ALL' : v }))}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-[#e0a96d] text-[#0b0c10] font-bold shadow-sm'
                                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                            }`}
                          >
                            <span>{v}</span>
                            <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-black/20 text-[#0b0c10]' : 'bg-slate-900 text-slate-400'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Stores pricing lists */}
                  <div className="space-y-2 mt-3">
                    {visibleStores.length === 0 ? (
                      <div className="bg-[#0b0c10]/40 border border-slate-800/80 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-400 italic">No hay precios registrados para esta selección.</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Usa "Agregar Precio o Subproducto" para registrar costos.</p>
                      </div>
                    ) : (
                      visibleStores.map((store, sIdx) => {
                        const p = safeNumber(store.price, 0);
                        const q = safeNumber(store.quantity, 1);
                        const u = typeof store.unitPrice === 'number' && !isNaN(store.unitPrice)
                          ? store.unitPrice
                          : (q > 0 ? p / q : 0);
                        const isCheapest = cheapestForView && cheapestForView.storeName === store.storeName && (cheapestForView.variety || '') === (store.variety || '');
                        const isPreferred = item.preferredStore === store.storeName;
                        
                        return (
                          <div 
                            key={store.storeName ? `${store.storeName}-${store.variety || ''}-${sIdx}` : sIdx}
                            className={`p-2.5 rounded-lg flex items-center justify-between border text-xs transition-colors ${
                              isPreferred 
                                  ? 'bg-[#0b0c10] border-[#e0a96d]/40 shadow-inner' 
                                  : 'bg-[#0b0c10]/50 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              {/* Star icon for manual preference */}
                              <button
                                onClick={() => handleSetPreferred(item.id, store.storeName)}
                                className={`p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer ${
                                  isPreferred ? 'text-[#e0a96d]' : 'text-slate-600 hover:text-slate-400'
                                }`}
                                title="Marcar como tienda preferida"
                                aria-label={`Marcar ${store.storeName} como favorito`}
                              >
                                <Star className={`w-3.5 h-3.5 ${isPreferred ? 'fill-[#e0a96d]' : ''}`} />
                              </button>
                              <span className="font-semibold text-slate-300 truncate">{store.storeName}</span>
                              {store.variety && (
                                <span className="text-[10px] font-medium text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0">
                                  <Tag className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{store.variety}</span>
                                </span>
                              )}
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
                                  onClick={() => removeStoreFromItem(item.id, store.storeName, store.variety)}
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

                  {/* Analysis note under preferred store / variety view */}
                  {(() => {
                    if (currentVariety !== 'ALL' && cheapestForView) {
                      return (
                        <div className="mt-3 bg-emerald-500/5 border border-emerald-500/15 p-2 rounded text-[10px] text-emerald-300/90 leading-relaxed">
                          🏷️ <strong>Mejor opción para "{currentVariety}":</strong> {cheapestForView.storeName} a <strong>${cheapestForView.unitPriceNum?.toFixed(3)}</strong> por unidad.
                        </div>
                      );
                    }
                    if (!cheapestOverall || !item.preferredStore || item.preferredStore === cheapestOverall.storeName) return null;
                    const prefStore = (Array.isArray(item.stores) ? item.stores : []).find(s => s && s.storeName === item.preferredStore);
                    if (!prefStore) return null;
                    const prefPrice = safeNumber(prefStore.price, 0);
                    const prefQty = safeNumber(prefStore.quantity, 1);
                    const prefUnit = typeof prefStore.unitPrice === 'number' && !isNaN(prefStore.unitPrice)
                      ? prefStore.unitPrice
                      : (prefQty > 0 ? prefPrice / prefQty : 0);
                    if (prefUnit <= 0 || !cheapestOverall.unitPriceNum) return null;
                    const diff = prefUnit - cheapestOverall.unitPriceNum;
                    if (diff <= 0.0001) return null;

                    return (
                      <div className="mt-3 bg-amber-500/5 border border-amber-500/10 p-2 rounded text-[10px] text-amber-300/80 leading-relaxed">
                        💡 <strong>Análisis Global:</strong> El preferido ({item.preferredStore}) cuesta <strong>${diff.toFixed(3)}</strong> más por unidad que el más barato ({cheapestOverall.storeName}{cheapestOverall.variety ? ` - ${cheapestOverall.variety}` : ''}).
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
                    onClick={() => {
                      setNewStoreVariety(currentVariety !== 'ALL' ? currentVariety : '');
                      setAddingStoreToItem(item);
                    }}
                    className="text-xs text-[#e0a96d] hover:text-[#f5d4af] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Precio o Subproducto</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="text-xs text-slate-300 hover:text-slate-100 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1.5 rounded-lg bg-[#0b0c10] border border-[#e0a96d]/20 hover:border-[#e0a96d]/50"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#e0a96d]" />
                    <span>Editar Ficha</span>
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
          <form onSubmit={handleSaveEdit} className="bg-[#171a24] border border-[#e0a96d]/25 rounded-2xl p-6 max-w-2xl w-full shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e0a96d]/15 flex items-center justify-center text-[#e0a96d] border border-[#e0a96d]/30">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-outfit">Editar Insumo / Producto</h3>
                  <p className="text-[11px] text-slate-400">Modifica detalles, subproductos, tiendas y precios registrados</p>
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Insumo Principal *</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Usa nombres genéricos como "Jamón", "Papel Higiénico", "Crema Facial".</p>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Estado del Insumo / Compra</label>
                <select
                  value={editingItem.repurchaseVerdict || 'yes'}
                  onChange={(e) => setEditingItem({ ...editingItem, repurchaseVerdict: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                >
                  <option value="yes">🏠 Ya tengo / En uso</option>
                  <option value="running_low">⚠️ Ya casi se necesita</option>
                  <option value="need_to_buy">🛒 Necesito Comprar</option>
                  <option value="maybe">✨ Por probar / En la mira</option>
                  <option value="no">✕ No volver a comprar</option>
                </select>
              </div>

              {/* Stores and Subproducts Management */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-200">Tiendas, Subproductos y Precios</label>
                    <span className="text-[10px] text-slate-400">Puedes registrar diferentes marcas o tipos dentro de este mismo producto</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem({
                        ...editingItem,
                        stores: [...(editingItem.stores || []), { storeName: '', variety: '', price: '', quantity: '' }]
                      });
                    }}
                    className="text-xs text-[#e0a96d] hover:text-[#f5d4af] font-bold flex items-center gap-1 cursor-pointer bg-[#e0a96d]/10 hover:bg-[#e0a96d]/20 border border-[#e0a96d]/30 px-2.5 py-1 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Tienda / Subproducto</span>
                  </button>
                </div>

                {(!editingItem.stores || editingItem.stores.length === 0) ? (
                  <div className="p-4 bg-[#0b0c10] border border-dashed border-slate-800 rounded-xl text-center">
                    <p className="text-xs text-slate-400">No hay tiendas o precios registrados.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem({
                          ...editingItem,
                          stores: [{ storeName: 'Costco', variety: '', price: '', quantity: '' }]
                        });
                      }}
                      className="mt-2 text-xs text-[#e0a96d] font-semibold underline cursor-pointer"
                    >
                      + Agregar primer precio
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {editingItem.stores.map((st, idx) => {
                      const p = safeNumber(st.price, 0);
                      const q = safeNumber(st.quantity, 0);
                      const u = q > 0 && p > 0 ? p / q : 0;
                      const isPref = editingItem.preferredStore === st.storeName && st.storeName;

                      return (
                        <div key={idx} className="bg-[#0b0c10] border border-slate-800 hover:border-slate-700 p-3 rounded-xl space-y-2 transition-colors">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            {/* Store Name Input with Datalist */}
                            <div className="sm:col-span-4">
                              <label className="block text-[10px] text-slate-400 font-medium mb-0.5">Tienda</label>
                              <input
                                type="text"
                                list="stores-preset-list"
                                placeholder="Ej. Costco, Walmart..."
                                value={st.storeName}
                                onChange={(e) => {
                                  const updated = [...editingItem.stores];
                                  updated[idx].storeName = e.target.value;
                                  setEditingItem({ ...editingItem, stores: updated });
                                }}
                                className="w-full bg-[#171a24] border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                              />
                            </div>

                            {/* Subproduct / Variety */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] text-slate-400 font-medium mb-0.5">Subproducto / Tipo (Opcional)</label>
                              <input
                                type="text"
                                placeholder="Ej. Pavo San Rafael, FUD..."
                                value={st.variety || ''}
                                onChange={(e) => {
                                  const updated = [...editingItem.stores];
                                  updated[idx].variety = e.target.value;
                                  setEditingItem({ ...editingItem, stores: updated });
                                }}
                                className="w-full bg-[#171a24] border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                              />
                            </div>

                            {/* Total Price */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] text-slate-400 font-medium mb-0.5">Precio ($)</label>
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
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] text-slate-400 font-medium mb-0.5">Cant.</label>
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
                                title="Eliminar este precio"
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

      {/* Quick Add Price / Subproduct Modal Dialog */}
      {addingStoreToItem && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleAddStorePrice} className="bg-[#171a24] border border-[#e0a96d]/25 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80 shrink-0">
              <div>
                <h3 className="text-md font-bold text-slate-100 font-outfit">Agregar Precio o Subproducto</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Para: <strong>{addingStoreToItem.name}</strong></p>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Establecimiento / Tienda *</label>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-400">Subproducto / Tipo / Marca (Opcional)</label>
                  <Tag className="w-3 h-3 text-[#e0a96d]" />
                </div>
                <input
                  type="text"
                  placeholder="Ej. Pechuga de Pavo San Rafael, FUD Virginia..."
                  value={newStoreVariety}
                  onChange={(e) => setNewStoreVariety(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Permite agrupar diferentes tipos o marcas dentro de {addingStoreToItem.name} sin duplicar tarjetas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Precio Total ($) *</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad total en unidades *</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 12 (rollos, botes, etc) o 250 (grs)"
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

      {/* Similar Product Confirmation / Subproduct Comparison Prompt Modal */}
      {similarProductPrompt && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-up my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-outfit">
                    ¿Deseas agregarlo como subproducto de un producto existente?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Detectamos que ya tienes "<strong>{similarProductPrompt.similarProduct.name}</strong>". Puedes guardarlo como subproducto para mantener tu comparador ordenado y comparar entre variedades.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSimilarProductPrompt(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Cards Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Existing Product */}
              <div className="p-3.5 rounded-xl bg-[#0b0c10] border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Ya Registrado 🏠
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {similarProductPrompt.similarProduct.category}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 truncate" title={similarProductPrompt.similarProduct.name}>
                  {similarProductPrompt.similarProduct.name}
                </h4>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 block">Precios actuales:</span>
                  {Array.isArray(similarProductPrompt.similarProduct.stores) && similarProductPrompt.similarProduct.stores.length > 0 ? (
                    similarProductPrompt.similarProduct.stores.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300 font-medium truncate">
                          {s.storeName}{s.variety ? ` (${s.variety})` : ''}
                        </span>
                        <span className="font-bold text-[#e0a96d] shrink-0 ml-1">
                          ${s.price} {s.quantity > 1 ? `(${s.quantity} u)` : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">Sin precios registrados</p>
                  )}
                </div>
              </div>

              {/* New Product/Store being added */}
              <div className="p-3.5 rounded-xl bg-[#0b0c10] border border-[#e0a96d]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#e0a96d] bg-[#e0a96d]/10 px-2 py-0.5 rounded border border-[#e0a96d]/20">
                    Nuevo que intentas guardar ✨
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {similarProductPrompt.newCategory}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 truncate" title={similarProductPrompt.newName}>
                  {similarProductPrompt.newName}
                </h4>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 block">Nuevos precios a ingresar:</span>
                  {Array.isArray(similarProductPrompt.validStores) && similarProductPrompt.validStores.length > 0 ? (
                    similarProductPrompt.validStores.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300 font-medium truncate">
                          {s.storeName}{s.variety ? ` (${s.variety})` : ''}
                        </span>
                        <span className="font-bold text-emerald-400 shrink-0 ml-1">
                          ${s.price} {s.quantity > 1 ? `(${s.quantity} u)` : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No capturaste tiendas aún</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              {similarProductPrompt.suggestedVariety && (
                <button
                  type="button"
                  onClick={() => handleMergeAndCompareWithExisting(
                    similarProductPrompt.similarProduct,
                    similarProductPrompt.validStores,
                    similarProductPrompt.newNotes,
                    similarProductPrompt.suggestedVariety
                  )}
                  className="btn-rose-gold w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
                >
                  <Tag className="w-4 h-4" />
                  <span>🏷️ Guardar como subproducto "{similarProductPrompt.suggestedVariety}" dentro de "{similarProductPrompt.similarProduct.name}" (Recomendado)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleMergeAndCompareWithExisting(
                  similarProductPrompt.similarProduct,
                  similarProductPrompt.validStores,
                  similarProductPrompt.newNotes
                )}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  similarProductPrompt.suggestedVariety
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    : 'btn-rose-gold shadow-lg'
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>⚖️ Comparar directamente en "{similarProductPrompt.similarProduct.name}"</span>
              </button>

              <p className="text-[10px] text-center text-slate-400">
                Añadirá la información a la ficha existente para comparar precios y evitar tener múltiples tarjetas del mismo insumo.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => executeSaveNewItem(
                    similarProductPrompt.newName,
                    similarProductPrompt.newCategory,
                    similarProductPrompt.validStores,
                    similarProductPrompt.newVerdict,
                    similarProductPrompt.newNotes
                  )}
                  className="w-full sm:w-1/2 py-2 px-3 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-400" />
                  <span>Crear como producto separado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimilarProductPrompt(null)}
                  className="w-full sm:w-1/2 py-2 px-3 rounded-xl font-semibold text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer border border-transparent"
                >
                  Volver a editar formulario
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
