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
  Tag,
  Heart,
  MessageSquare,
  Check,
  Compass,
  Calendar,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ClipboardList,
  Scale
} from 'lucide-react';
import { compressImage, analyzeProductImage, suggestStoresAndEquivalents } from '../utils/geminiService';
import { findSimilarity, findSimilarHouseholdItems, findHouseholdSimilarity, normalizeString } from '../utils/similarity';
import { safeNumber, sanitizeHouseholdItem, sanitizeHouseholdList } from '../utils/sanitizers';
import { getLocalDateString, formatDisplayDate } from '../utils/dateUtils';

/**
 * Compares a price seen in a store strictly against the user's own registered products
 * and subproducts in householdItems (including their last registered dates).
 */
export const evaluateInStorePriceAgainstRegistered = ({
  productQuery = '',
  varietyQuery = '',
  storeName = '',
  price = '',
  quantity = '',
  householdItems = [],
  explicitTargetItem = null
}) => {
  const safeList = sanitizeHouseholdList(householdItems);
  const cleanStore = String(storeName || '').trim();
  const cleanProd = String(productQuery || explicitTargetItem?.name || '').trim();
  const cleanVar = String(varietyQuery || '').trim();
  const normVar = normalizeString(cleanVar);

  // 1. Collect matching user-registered items
  const matchedMap = new Map();
  if (explicitTargetItem && explicitTargetItem.id) {
    const freshTarget = safeList.find(i => i.id === explicitTargetItem.id) || explicitTargetItem;
    matchedMap.set(freshTarget.id, { item: freshTarget, matchReason: 'exact_item' });
  }

  if (cleanProd.length >= 2) {
    const simByProd = findSimilarHouseholdItems(cleanProd, safeList, 4);
    simByProd.forEach(m => {
      if (m.item && !matchedMap.has(m.item.id)) {
        matchedMap.set(m.item.id, { item: m.item, matchReason: m.matchType });
      }
    });
  }

  if (cleanVar.length >= 3) {
    const simByVar = findSimilarHouseholdItems(`${cleanProd} ${cleanVar}`.trim(), safeList, 4);
    simByVar.forEach(m => {
      if (m.item && !matchedMap.has(m.item.id)) {
        matchedMap.set(m.item.id, { item: m.item, matchReason: 'subproduct_match' });
      }
    });
  }

  const matchedItems = Array.from(matchedMap.values()).map(v => v.item);

  // 2. Flatten all registered store entries from matched items
  const registeredEntries = [];
  matchedItems.forEach(mItem => {
    const stores = Array.isArray(mItem.stores) ? mItem.stores : [];
    stores.forEach(st => {
      const p = safeNumber(st.price, 0);
      const q = safeNumber(st.quantity, 1);
      if (p <= 0 || q <= 0) return;
      const u = typeof st.unitPrice === 'number' && !isNaN(st.unitPrice) && st.unitPrice > 0
        ? st.unitPrice
        : p / q;
      const stVar = String(st.variety || '').trim();
      const normStVar = normalizeString(stVar);
      const isSameStore = cleanStore && st.storeName?.toLowerCase().trim() === cleanStore.toLowerCase();
      const isSameOrSimilarVariety = Boolean(
        normVar && normStVar && (
          normStVar === normVar ||
          normStVar.includes(normVar) ||
          normVar.includes(normStVar)
        )
      );
      const isFavVar = Boolean(
        mItem.favoriteVariety &&
        stVar &&
        mItem.favoriteVariety.toLowerCase().trim() === stVar.toLowerCase()
      );
      const opObj = stVar ? mItem.varietyOpinions?.[stVar] : null;

      registeredEntries.push({
        itemId: mItem.id,
        itemName: mItem.name,
        itemCategory: mItem.category,
        storeName: st.storeName || 'Tienda',
        variety: stVar,
        price: p,
        quantity: q,
        unitPrice: u,
        updatedAt: st.updatedAt || 'Fecha previa',
        isSameStore,
        isSameOrSimilarVariety,
        isFavoriteVariety: isFavVar,
        opinion: opObj?.opinion || '',
        rating: opObj?.rating || ''
      });
    });
  });

  // Sort registered entries by unitPrice ascending
  registeredEntries.sort((a, b) => a.unitPrice - b.unitPrice);

  const otherStoreEntries = registeredEntries.filter(e => !e.isSameStore);
  const sameStoreEntries = registeredEntries.filter(e => e.isSameStore);
  const sameVarietyEntries = registeredEntries.filter(e => e.isSameOrSimilarVariety);

  const candidatePriceNum = safeNumber(price, 0);
  const candidateQtyNum = safeNumber(quantity, 1);
  const hasCandidatePrice = candidatePriceNum > 0 && candidateQtyNum > 0;
  const candidateUnitPrice = hasCandidatePrice ? candidatePriceNum / candidateQtyNum : 0;

  const cheapestOverall = registeredEntries.length > 0 ? registeredEntries[0] : null;
  const cheapestOtherStore = otherStoreEntries.length > 0 ? otherStoreEntries[0] : null;
  const cheapestSameVariety = sameVarietyEntries.length > 0 ? sameVarietyEntries[0] : null;

  let decisionVerdict = null;
  if (hasCandidatePrice) {
    if (registeredEntries.length === 0) {
      decisionVerdict = {
        code: 'first_record',
        badge: '🆕 Primer Registro',
        title: 'No tenías precios previos registrados para este producto',
        message: `Este será tu primer precio de referencia en ${cleanStore || 'esta tienda'} ($${candidateUnitPrice.toFixed(3)} / ud).`,
        color: 'blue'
      };
    } else {
      const refEntry = cheapestOtherStore || cheapestOverall;
      const diffUnit = candidateUnitPrice - refEntry.unitPrice;
      const pctDiff = refEntry.unitPrice > 0 ? ((diffUnit / refEntry.unitPrice) * 100) : 0;

      if (candidateUnitPrice <= refEntry.unitPrice * 1.005) {
        const savingsPct = Math.abs(pctDiff).toFixed(1);
        decisionVerdict = {
          code: 'buy_best',
          badge: '🟢 ¡Conviene Comprar Aquí!',
          title: candidateUnitPrice < refEntry.unitPrice
            ? `¡Es el mejor precio! Ahorras ${savingsPct}% vs tu mejor registro (${refEntry.storeName})`
            : `Iguala tu mejor precio registrado (${refEntry.storeName})`,
          message: `Aquí te sale en $${candidateUnitPrice.toFixed(3)}/ud ($${candidatePriceNum.toFixed(2)} por ${candidateQtyNum} u), mientras que en ${refEntry.storeName}${refEntry.variety ? ` (${refEntry.variety})` : ''} lo registraste el ${formatDisplayDate(refEntry.updatedAt)} a $${refEntry.price.toFixed(2)} ($${refEntry.unitPrice.toFixed(3)}/ud).`,
          color: 'emerald'
        };
      } else if (pctDiff <= 12) {
        decisionVerdict = {
          code: 'buy_competitive',
          badge: '🟡 Precio Cercano / Competitivo',
          title: `Cuesta +${pctDiff.toFixed(1)}% más por unidad que en ${refEntry.storeName}`,
          message: `En ${refEntry.storeName}${refEntry.variety ? ` (${refEntry.variety})` : ''} lo registraste el ${formatDisplayDate(refEntry.updatedAt)} a $${refEntry.price.toFixed(2)} (${refEntry.quantity} u = $${refEntry.unitPrice.toFixed(3)}/ud). La diferencia es pequeña ($${diffUnit.toFixed(3)}/ud), por lo que puedes comprarlo si ya estás aquí o si prefieres esta variedad.`,
          color: 'amber'
        };
      } else {
        decisionVerdict = {
          code: 'skip_expensive',
          badge: '🔴 Más Caro que en tus Registros',
          title: `En ${refEntry.storeName} lo tienes registrado ${pctDiff.toFixed(1)}% más barato`,
          message: `En ${refEntry.storeName}${refEntry.variety ? ` (${refEntry.variety})` : ''} registraste en la última fecha (${formatDisplayDate(refEntry.updatedAt)}) un precio de $${refEntry.price.toFixed(2)} (${refEntry.quantity} u = $${refEntry.unitPrice.toFixed(3)}/ud). Aquí en ${cleanStore || 'esta tienda'} te cuesta $${candidateUnitPrice.toFixed(3)}/ud. Conviene comprarlo allá salvo que te urja hoy.`,
          color: 'rose'
        };
      }
    }
  }

  return {
    matchedItems,
    primaryItem: matchedItems[0] || explicitTargetItem || null,
    registeredEntries,
    otherStoreEntries,
    sameStoreEntries,
    sameVarietyEntries,
    cheapestOverall,
    cheapestOtherStore,
    cheapestSameVariety,
    hasCandidatePrice,
    candidatePriceNum,
    candidateQtyNum,
    candidateUnitPrice,
    decisionVerdict
  };
};

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
  const [newStoreRating, setNewStoreRating] = useState('liked');
  const [newStoreOpinion, setNewStoreOpinion] = useState('');
  const [newStoreIsFavorite, setNewStoreIsFavorite] = useState(false);

  // Full item editing state
  const [editingItem, setEditingItem] = useState(null);

  // Similar product prompt modal state
  const [similarProductPrompt, setSimilarProductPrompt] = useState(null);

  // 1. Store & Equivalent Suggestions Explorer State ("Buscar sugerencias o tiendas donde puedan vender un producto o equivalente para ir a verificar")
  const [isExploringStores, setIsExploringStores] = useState(false);
  const [explorerQuery, setExplorerQuery] = useState('');
  const [explorerCategory, setExplorerCategory] = useState('Despensa');
  const [explorerTargetItem, setExplorerTargetItem] = useState(null);
  const [storeSuggestionsResult, setStoreSuggestionsResult] = useState(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // 2. Store Visit Mode State ("Elegir una tienda y tener la lista de productos que debo buscar para agregar en el comparador")
  const [isStoreVisitOpen, setIsStoreVisitOpen] = useState(false);
  const [selectedVisitStore, setSelectedVisitStore] = useState('Costco');
  const [storeVisitFilter, setStoreVisitFilter] = useState('to_verify'); // 'to_verify' | 'to_buy' | 'missing_here' | 'all'
  const [quickPendingProductName, setQuickPendingProductName] = useState('');
  const [quickPendingVarietyName, setQuickPendingVarietyName] = useState('');

  // 3. In-Store Live Price Evaluator & Decision Maker State ("Si estoy en la tienda y veo el precio pueda agregarla y decirme si en otras tiendas tienen ese producto u otro similar comparado solo con los que yo ya registré")
  const [inStoreChecker, setInStoreChecker] = useState(null);
  // inStoreChecker shape: { targetItem: Object|null, productName: string, category: string, storeName: string, variety: string, price: string, quantity: string, rating: string, opinion: string, isFavorite: boolean }

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
    if (addingStoreToItem || editingItem || similarProductPrompt || inStoreChecker) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [addingStoreToItem, editingItem, similarProductPrompt, inStoreChecker]);

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

  // Open Store & Equivalent Suggestions Explorer
  const handleOpenStoreExplorer = async (item = null) => {
    setIsExploringStores(true);
    setIsStoreVisitOpen(false);
    setIsAddingItem(false);

    if (item) {
      setExplorerTargetItem(item);
      setExplorerQuery(item.name || '');
      setExplorerCategory(item.category || 'Despensa');
      try {
        setIsLoadingSuggestions(true);
        const existingStores = (item.stores || []).map(s => s.storeName).filter(Boolean);
        const res = await suggestStoresAndEquivalents(item.name, item.category, existingStores, geminiApiKey);
        setStoreSuggestionsResult(res);
      } catch (err) {
        console.warn('Suggestion error:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      setExplorerTargetItem(null);
      if (!explorerQuery && searchTerm) {
        setExplorerQuery(searchTerm);
      }
    }
  };

  const handleSearchStoreSuggestions = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const q = explorerQuery.trim();
    if (!q) {
      showToast('warning', 'Escribe un producto', 'Ingresa el nombre del producto o insumo que deseas buscar.');
      return;
    }

    try {
      setIsLoadingSuggestions(true);
      const simMatches = findSimilarHouseholdItems(q, householdItems, 1);
      const matchedItem = simMatches.length > 0 ? simMatches[0].item : null;
      setExplorerTargetItem(matchedItem);

      const existingStores = matchedItem
        ? (matchedItem.stores || []).map(s => s.storeName).filter(Boolean)
        : [];
      const res = await suggestStoresAndEquivalents(q, explorerCategory, existingStores, geminiApiKey);
      setStoreSuggestionsResult(res);
    } catch (err) {
      showToast('warning', 'Aviso de Búsqueda', err.message || 'No se pudieron obtener sugerencias.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Add a store to "Pending Verification" (pendingStores) on an existing item or create the item for verification
  const handleAddPendingStore = (storeName, suggestedVariety = '', reason = '', explicitItem = null, fallbackProductName = '', fallbackCategory = 'Despensa') => {
    const cleanStore = String(storeName || '').trim();
    if (!cleanStore) return;
    const today = getLocalDateString();

    const target = explicitItem || explorerTargetItem || (
      fallbackProductName ? findSimilarHouseholdItems(fallbackProductName, householdItems, 1)?.[0]?.item : null
    );

    if (target && target.id) {
      setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
        if (item && item.id === target.id) {
          const currentPending = Array.isArray(item.pendingStores) ? item.pendingStores : [];
          const existsIdx = currentPending.findIndex(
            ps => ps.storeName?.toLowerCase().trim() === cleanStore.toLowerCase()
          );
          const newEntry = {
            storeName: cleanStore,
            suggestedVariety: String(suggestedVariety || '').trim(),
            reason: String(reason || '').trim(),
            addedAt: today
          };
          const updatedPending = existsIdx >= 0
            ? currentPending.map((ps, i) => (i === existsIdx ? newEntry : ps))
            : [...currentPending, newEntry];
          return {
            ...item,
            pendingStores: updatedPending
          };
        }
        return item;
      }));
      showToast('success', '📌 Anotado para Verificar', `Se agregó "${cleanStore}" a la lista de búsqueda de "${target.name}".`);
    } else {
      // Create a new product card with 0 prices and this pending store so the user has it in their store checklist
      const prodName = String(fallbackProductName || explorerQuery || 'Producto por verificar').trim();
      const newItem = sanitizeHouseholdItem({
        id: 'item-' + Date.now(),
        name: prodName,
        category: fallbackCategory || explorerCategory || 'Despensa',
        stores: [],
        pendingStores: [
          {
            storeName: cleanStore,
            suggestedVariety: String(suggestedVariety || '').trim(),
            reason: String(reason || '').trim(),
            addedAt: today
          }
        ],
        repurchaseVerdict: 'maybe',
        notes: suggestedVariety ? `Equivalente sugerido a buscar: ${suggestedVariety}` : ''
      });
      if (newItem) {
        setHouseholdItems(prev => [...(Array.isArray(prev) ? prev : []), newItem]);
        setExplorerTargetItem(newItem);
        showToast('success', '📌 Producto y Tienda Anotados', `Se creó "${prodName}" en tu lista para ir a verificar el precio en ${cleanStore}.`);
      }
    }
  };

  const handleRemovePendingStore = (itemId, storeName) => {
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        const currentPending = Array.isArray(item.pendingStores) ? item.pendingStores : [];
        return {
          ...item,
          pendingStores: currentPending.filter(
            ps => ps.storeName?.toLowerCase().trim() !== String(storeName || '').toLowerCase().trim()
          )
        };
      }
      return item;
    }));
    showToast('info', 'Verificación Removida', `Se quitó ${storeName} de pendientes por verificar.`);
  };

  // Quick add a product to verify inside the currently selected store in Store Visit Mode
  const handleAddQuickPendingToStore = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanProd = quickPendingProductName.trim();
    if (!cleanProd || !selectedVisitStore) return;

    const matches = findSimilarHouseholdItems(cleanProd, householdItems, 1);
    const matchedItem = matches.length > 0 ? matches[0].item : null;

    handleAddPendingStore(
      selectedVisitStore,
      quickPendingVarietyName.trim(),
      'Agregado manualmente a la lista de búsqueda de la tienda',
      matchedItem,
      cleanProd,
      'Despensa'
    );
    setQuickPendingProductName('');
    setQuickPendingVarietyName('');
  };

  // Open the In-Store Live Price Evaluator & Comparator modal
  const handleOpenInStoreChecker = ({
    item = null,
    storeName = '',
    variety = '',
    price = '',
    quantity = ''
  } = {}) => {
    const effectiveStore = storeName || (isStoreVisitOpen ? selectedVisitStore : 'Costco');
    const pendingForStore = item && Array.isArray(item.pendingStores)
      ? item.pendingStores.find(ps => ps.storeName?.toLowerCase().trim() === effectiveStore.toLowerCase().trim())
      : null;
    const existingStoreEntry = item && Array.isArray(item.stores)
      ? item.stores.find(s => s.storeName?.toLowerCase().trim() === effectiveStore.toLowerCase().trim())
      : null;

    const initialVariety = variety || pendingForStore?.suggestedVariety || existingStoreEntry?.variety || item?.favoriteVariety || '';
    const existingOp = (item && initialVariety) ? item.varietyOpinions?.[initialVariety] : null;

    setInStoreChecker({
      targetItem: item || null,
      productName: item?.name || '',
      category: item?.category || 'Despensa',
      storeName: effectiveStore,
      variety: initialVariety,
      price: price !== '' ? String(price) : (existingStoreEntry?.price ? String(existingStoreEntry.price) : ''),
      quantity: quantity !== '' ? String(quantity) : (existingStoreEntry?.quantity ? String(existingStoreEntry.quantity) : '1'),
      rating: existingOp?.rating || 'liked',
      opinion: existingOp?.opinion || '',
      isFavorite: Boolean(item && initialVariety && item.favoriteVariety === initialVariety)
    });
  };

  // Save decision from the In-Store Live Price Evaluator ("Comprar ahora y guardar" vs "Solo guardar precio en comparador")
  const handleSaveInStoreDecision = (buyDecision = 'save_only') => {
    if (!inStoreChecker) return;
    const cleanStore = String(inStoreChecker.storeName || '').trim() || 'Tienda';
    const cleanProd = String(inStoreChecker.productName || inStoreChecker.targetItem?.name || '').trim();
    const cleanVar = String(inStoreChecker.variety || '').trim();
    const p = safeNumber(inStoreChecker.price, 0);
    const q = safeNumber(inStoreChecker.quantity, 1);

    if (!cleanProd) {
      showToast('warning', 'Falta Nombre', 'Indica el nombre del producto que estás cotizando.');
      return;
    }
    if (p <= 0 || q <= 0) {
      showToast('warning', 'Falta Precio o Cantidad', 'Ingresa el precio y la cantidad que ves en la tienda.');
      return;
    }

    const today = getLocalDateString();
    const newStoreObj = {
      storeName: cleanStore,
      variety: cleanVar,
      price: p,
      quantity: q,
      unitPrice: p / q,
      updatedAt: today
    };

    // Find target item (either explicit or matched by name)
    let target = inStoreChecker.targetItem;
    if (!target) {
      const sim = findSimilarHouseholdItems(cleanProd, householdItems, 1);
      if (sim.length > 0 && sim[0].score >= 150) {
        target = sim[0].item;
      }
    }

    if (target && target.id) {
      setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
        if (item && item.id === target.id) {
          const currentStores = (Array.isArray(item.stores) ? item.stores : []).filter(s => s && typeof s === 'object');
          const filteredStores = currentStores.filter(
            s => !(s.storeName?.toLowerCase().trim() === cleanStore.toLowerCase() &&
                   (s.variety || '').toLowerCase().trim() === cleanVar.toLowerCase())
          );
          const updatedStores = [...filteredStores, newStoreObj];
          const updatedSubproducts = Array.from(new Set([
            ...(Array.isArray(item.subproducts) ? item.subproducts : []),
            ...updatedStores.map(s => s.variety).filter(Boolean)
          ]));

          // Remove this store from pendingStores now that the price has been verified!
          const updatedPending = (Array.isArray(item.pendingStores) ? item.pendingStores : []).filter(
            ps => ps.storeName?.toLowerCase().trim() !== cleanStore.toLowerCase()
          );

          const updatedOpinions = { ...(item.varietyOpinions || {}) };
          let updatedFavorite = item.favoriteVariety || '';
          if (cleanVar && (inStoreChecker.opinion || inStoreChecker.rating || inStoreChecker.isFavorite)) {
            updatedOpinions[cleanVar] = {
              opinion: String(inStoreChecker.opinion || updatedOpinions[cleanVar]?.opinion || '').trim(),
              rating: inStoreChecker.rating || updatedOpinions[cleanVar]?.rating || 'liked',
              isFavorite: Boolean(inStoreChecker.isFavorite || updatedOpinions[cleanVar]?.isFavorite)
            };
            if (inStoreChecker.isFavorite) {
              updatedFavorite = cleanVar;
            }
          }

          return {
            ...item,
            stores: updatedStores,
            pendingStores: updatedPending,
            subproducts: updatedSubproducts,
            preferredStore: item.preferredStore || cleanStore,
            repurchaseVerdict: buyDecision === 'bought' ? 'yes' : item.repurchaseVerdict,
            varietyOpinions: updatedOpinions,
            favoriteVariety: updatedFavorite
          };
        }
        return item;
      }));

      showToast(
        'success',
        buyDecision === 'bought' ? '🛒 ¡Comprado y Precio Actualizado!' : '💾 Precio Verificado y Guardado',
        buyDecision === 'bought'
          ? `Se registró "${target.name}" en ${cleanStore} ($${p.toFixed(2)}) con fecha de hoy y se marcó como "Ya tengo".`
          : `Se guardó el precio de ${cleanStore} ($${p.toFixed(2)}) en "${target.name}" para futuras comparaciones.`
      );
    } else {
      // Create new household item with this verified store price
      const created = sanitizeHouseholdItem({
        id: 'item-' + Date.now(),
        name: cleanProd,
        category: inStoreChecker.category || 'Despensa',
        stores: [newStoreObj],
        pendingStores: [],
        preferredStore: cleanStore,
        favoriteVariety: inStoreChecker.isFavorite ? cleanVar : '',
        varietyOpinions: cleanVar ? {
          [cleanVar]: {
            opinion: String(inStoreChecker.opinion || '').trim(),
            rating: inStoreChecker.rating || 'liked',
            isFavorite: Boolean(inStoreChecker.isFavorite)
          }
        } : {},
        repurchaseVerdict: buyDecision === 'bought' ? 'yes' : 'maybe',
        notes: ''
      });
      if (created) {
        setHouseholdItems(prev => [...(Array.isArray(prev) ? prev : []), created]);
        showToast(
          'success',
          buyDecision === 'bought' ? '🛒 Producto Creado y Comprado' : '💾 Nuevo Precio Registrado',
          `Se agregó "${cleanProd}" con precio de ${cleanStore} ($${p.toFixed(2)}).`
        );
      }
    }

    setInStoreChecker(null);
  };

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
    const today = getLocalDateString();
    const storesWithDates = (validStores || []).map(s => ({
      ...s,
      updatedAt: s.updatedAt || today
    }));
    const newItem = {
      id: Date.now().toString(),
      name: trimmedName,
      category: category || 'Skincare',
      stores: storesWithDates,
      preferredStore: storesWithDates[0]?.storeName || '',
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

  const handleMergeAndCompareWithExisting = (
    targetItem,
    newStores = [],
    newNotes = '',
    asVarietyName = '',
    varietyOpinion = '',
    varietyRating = 'liked',
    isFavorite = false
  ) => {
    if (!targetItem) return;
    const today = getLocalDateString();

    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === targetItem.id) {
        const existingStores = Array.isArray(item.stores) ? item.stores : [];
        const updatedStores = [...existingStores];
        const verifiedStoreNames = new Set();

        newStores.forEach(ns => {
          const varietyVal = String(ns.variety || asVarietyName || '').trim();
          const targetStoreName = String(ns.storeName || '').trim() || 'Tienda';
          const p = safeNumber(ns.price, 0);
          const q = safeNumber(ns.quantity, 1);
          const u = q > 0 ? p / q : 0;
          verifiedStoreNames.add(targetStoreName.toLowerCase());

          const preparedStore = {
            storeName: targetStoreName,
            variety: varietyVal,
            price: p,
            quantity: q,
            unitPrice: u,
            updatedAt: ns.updatedAt || today
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

        const updatedPending = (Array.isArray(item.pendingStores) ? item.pendingStores : []).filter(
          ps => !verifiedStoreNames.has(ps.storeName?.toLowerCase().trim())
        );

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

        const updatedOpinions = { ...(item.varietyOpinions || {}) };
        let updatedFavorite = item.favoriteVariety || '';

        const effectiveVariety = asVarietyName || newStores[0]?.variety || '';
        if (effectiveVariety && (varietyOpinion || varietyRating || isFavorite)) {
          updatedOpinions[effectiveVariety] = {
            opinion: varietyOpinion || updatedOpinions[effectiveVariety]?.opinion || '',
            rating: varietyRating || updatedOpinions[effectiveVariety]?.rating || 'liked',
            isFavorite: Boolean(isFavorite || updatedOpinions[effectiveVariety]?.isFavorite)
          };
          if (isFavorite) {
            updatedFavorite = effectiveVariety;
          }
        }

        return {
          ...item,
          stores: updatedStores,
          pendingStores: updatedPending,
          subproducts: updatedSubproducts,
          preferredStore: preferred,
          notes: combinedNotes,
          varietyOpinions: updatedOpinions,
          favoriteVariety: updatedFavorite
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

  const handleToggleFavoriteVariety = (itemId, varietyName) => {
    if (!varietyName) return;
    const cleanVariety = String(varietyName).trim();
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        const isCurrentFav = (item.favoriteVariety || '').toLowerCase().trim() === cleanVariety.toLowerCase();
        const newFav = isCurrentFav ? '' : cleanVariety;
        const currentOpinions = { ...(item.varietyOpinions || {}) };

        // Clear favorite flag on other varieties
        Object.keys(currentOpinions).forEach(k => {
          if (currentOpinions[k]) {
            currentOpinions[k] = { ...currentOpinions[k], isFavorite: false };
          }
        });

        if (newFav) {
          const existing = currentOpinions[newFav] || { opinion: '', rating: 'favorite' };
          currentOpinions[newFav] = {
            ...existing,
            rating: existing.rating === 'disliked' ? 'favorite' : (existing.rating || 'favorite'),
            isFavorite: true
          };
        }

        showToast('success', newFav ? '⭐ Subproducto Favorito' : 'Favorito Removido',
          newFav ? `"${cleanVariety}" marcado como tu favorito en ${item.name}` : `Se quitó la marca de favorito`);

        return {
          ...item,
          favoriteVariety: newFav,
          varietyOpinions: currentOpinions
        };
      }
      return item;
    }));
  };

  const handleSetVarietyRating = (itemId, varietyName, rating) => {
    if (!varietyName) return;
    const cleanVariety = String(varietyName).trim();
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        const currentOpinions = { ...(item.varietyOpinions || {}) };
        const existing = currentOpinions[cleanVariety] || { opinion: '', rating: 'neutral', isFavorite: false };
        const isFav = rating === 'favorite' || existing.isFavorite;

        currentOpinions[cleanVariety] = {
          ...existing,
          rating,
          isFavorite: isFav
        };

        let newFav = item.favoriteVariety;
        if (rating === 'favorite') {
          newFav = cleanVariety;
        }

        const label = rating === 'liked' ? 'Me gustó 👍' : rating === 'disliked' ? 'No me gustó 👎' : rating === 'favorite' ? 'Favorito ⭐' : 'Neutral 😐';
        showToast('info', 'Calificación Actualizada', `"${cleanVariety}": ${label}`);

        return {
          ...item,
          favoriteVariety: newFav,
          varietyOpinions: currentOpinions
        };
      }
      return item;
    }));
  };

  const handleUpdateVarietyOpinion = (itemId, varietyName, opinionText) => {
    if (!varietyName) return;
    const cleanVariety = String(varietyName).trim();
    const cleanText = String(opinionText || '').trim();
    setHouseholdItems(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        const currentOpinions = { ...(item.varietyOpinions || {}) };
        const existing = currentOpinions[cleanVariety] || { opinion: '', rating: 'liked', isFavorite: false };
        currentOpinions[cleanVariety] = {
          ...existing,
          opinion: cleanText
        };
        return {
          ...item,
          varietyOpinions: currentOpinions
        };
      }
      return item;
    }));
    if (cleanText) {
      showToast('success', 'Opinión Guardada', `"${cleanText.slice(0, 45)}${cleanText.length > 45 ? '...' : ''}"`);
    }
  };

  const handleOpenAddStore = (item, defaultVariety = '') => {
    setNewStoreName('Costco');
    const chosenVariety = defaultVariety || (selectedVarieties[item.id] !== 'ALL' ? selectedVarieties[item.id] || '' : '');
    setNewStoreVariety(chosenVariety);
    setNewStorePrice('');
    setNewStoreQty('');
    const existingOp = chosenVariety ? item.varietyOpinions?.[chosenVariety] : null;
    setNewStoreRating(existingOp?.rating || 'liked');
    setNewStoreOpinion(existingOp?.opinion || '');
    setNewStoreIsFavorite(chosenVariety ? (item.favoriteVariety === chosenVariety || existingOp?.isFavorite) : false);
    setAddingStoreToItem(item);
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

    // Scan for duplicate/similar items (checking both main item name and subproducts) before adding manually
    const similarMatches = findSimilarHouseholdItems(trimmedName, householdItems, 3);
    if (similarMatches && similarMatches.length > 0) {
      const topMatch = similarMatches[0];
      const suggestedVariety = topMatch.matchType === 'subproduct'
        ? topMatch.matchedSubproduct
        : deriveVarietySuggestion(trimmedName, topMatch.item.name);

      setSimilarProductPrompt({
        matches: similarMatches,
        topMatch,
        similarProduct: topMatch.item,
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
      favoriteVariety: item.favoriteVariety || '',
      varietyOpinions: { ...(item.varietyOpinions || {}) },
      pendingStores: Array.isArray(item.pendingStores) ? [...item.pendingStores] : [],
      notes: item.notes || '',
      stores: currentStores.length > 0
        ? currentStores.map(s => ({
            storeName: s.storeName || '',
            variety: s.variety || '',
            price: s.price !== undefined && s.price !== null ? s.price : '',
            quantity: s.quantity !== undefined && s.quantity !== null ? s.quantity : '',
            unitPrice: s.unitPrice || 0,
            updatedAt: s.updatedAt || getLocalDateString()
          }))
        : [{ storeName: 'Costco', variety: '', price: '', quantity: '', updatedAt: getLocalDateString() }]
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
    const today = getLocalDateString();

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
          unitPrice: q > 0 ? p / q : 0,
          updatedAt: s.updatedAt || today
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
      pendingStores: editingItem.pendingStores || [],
      preferredStore: prefStore,
      favoriteVariety: editingItem.favoriteVariety || '',
      varietyOpinions: editingItem.varietyOpinions || {},
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

  const handleAddStorePrice = (e, buyDecision = 'save_only') => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newStorePrice || !newStoreQty || !addingStoreToItem) return;

    const trimmedStore = String(newStoreName || '').trim() || 'Tienda';
    const trimmedVariety = String(newStoreVariety || '').trim();
    const p = safeNumber(newStorePrice, 0);
    const q = safeNumber(newStoreQty, 1);
    if (p <= 0 || q <= 0) return;

    const today = getLocalDateString();
    const newStoreObj = {
      storeName: trimmedStore,
      variety: trimmedVariety,
      price: p,
      quantity: q,
      unitPrice: p / q,
      updatedAt: today
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

        // Remove this store from pendingStores now that its price is verified
        const updatedPending = (Array.isArray(item.pendingStores) ? item.pendingStores : []).filter(
          ps => ps.storeName?.toLowerCase().trim() !== trimmedStore.toLowerCase()
        );

        const updatedOpinions = { ...(item.varietyOpinions || {}) };
        let updatedFavorite = item.favoriteVariety || '';

        if (trimmedVariety && (newStoreOpinion || newStoreRating || newStoreIsFavorite)) {
          updatedOpinions[trimmedVariety] = {
            opinion: newStoreOpinion.trim(),
            rating: newStoreRating || 'liked',
            isFavorite: Boolean(newStoreIsFavorite)
          };
          if (newStoreIsFavorite) {
            updatedFavorite = trimmedVariety;
          }
        }

        return {
          ...item,
          stores: updatedStores,
          pendingStores: updatedPending,
          subproducts: updatedSubproducts,
          preferredStore: item.preferredStore || trimmedStore,
          repurchaseVerdict: buyDecision === 'bought' ? 'yes' : item.repurchaseVerdict,
          varietyOpinions: updatedOpinions,
          favoriteVariety: updatedFavorite
        };
      }
      return item;
    }));

    showToast(
      'success',
      buyDecision === 'bought' ? '🛒 ¡Comprado y Precio Guardado!' : 'Precio Agregado',
      buyDecision === 'bought'
        ? `Se registró el costo en ${trimmedStore} y se marcó "${addingStoreToItem.name}" como comprado.`
        : `Se añadió costo para ${trimmedStore}${trimmedVariety ? ` (${trimmedVariety})` : ''}`
    );
    setNewStorePrice('');
    setNewStoreQty('');
    setNewStoreVariety('');
    setNewStoreRating('liked');
    setNewStoreOpinion('');
    setNewStoreIsFavorite(false);
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
      <div className="flex flex-col gap-3 bg-[#171a24] p-4 rounded-xl border border-[#e0a96d]/15">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar insumo, marca o nota..."
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
            onClick={() => {
              setIsAddingItem(!isAddingItem);
              if (!isAddingItem) {
                setIsExploringStores(false);
                setIsStoreVisitOpen(false);
              }
            }}
            className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 cursor-pointer transition-all self-stretch lg:self-auto justify-center shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Insumo</span>
          </button>
        </div>

        {/* Smart Shopping & Verification Action Bar */}
        {(() => {
          const totalPendingChecks = safeItemsList.reduce(
            (sum, it) => sum + (Array.isArray(it.pendingStores) ? it.pendingStores.length : 0),
            0
          );
          return (
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Button: Buscar sugerencias o tiendas donde vendan un producto o equivalente */}
                <button
                  type="button"
                  onClick={() => {
                    if (isExploringStores) {
                      setIsExploringStores(false);
                    } else {
                      handleOpenStoreExplorer(null);
                    }
                  }}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    isExploringStores
                      ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d] shadow-lg shadow-[#e0a96d]/20'
                      : 'bg-[#0b0c10] hover:bg-slate-900 text-[#e0a96d] border-[#e0a96d]/35'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>🧭 ¿Dónde lo venden? / Buscar Equivalentes</span>
                </button>

                {/* 2. Button: Elegir una tienda y ver la lista de productos que debo buscar */}
                <button
                  type="button"
                  onClick={() => {
                    setIsStoreVisitOpen(!isStoreVisitOpen);
                    if (!isStoreVisitOpen) {
                      setIsExploringStores(false);
                      setIsAddingItem(false);
                    }
                  }}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    isStoreVisitOpen
                      ? 'bg-emerald-500 text-[#0b0c10] border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-[#0b0c10] hover:bg-slate-900 text-emerald-300 border-emerald-500/35'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>🏪 Elegir Tienda (Lista por Buscar)</span>
                  {totalPendingChecks > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isStoreVisitOpen ? 'bg-[#0b0c10] text-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {totalPendingChecks} por verificar
                    </span>
                  )}
                </button>

                {/* 3. Button: Estoy en la tienda y veo el precio -> Cotizar y comparar con mis registros */}
                <button
                  type="button"
                  onClick={() => handleOpenInStoreChecker({ storeName: isStoreVisitOpen ? selectedVisitStore : 'Costco' })}
                  className="py-2 px-3.5 rounded-xl text-xs font-bold border bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>🏷️ Estoy en la Tienda: Vi un Precio (Comparar y Decidir)</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-400 hidden xl:inline">
                Compara en tiempo real contra los precios y fechas que tú ya registraste
              </span>
            </div>
          );
        })()}
      </div>

      {/* ===================================================================== */}
      {/* PANEL 1: BUSCADOR DE SUGERENCIAS DE TIENDAS Y EQUIVALENTES            */}
      {/* ("Buscar sugerencias o tiendas donde puedan vender un producto o       */}
      {/*  equivalente, no necesariamente para agregar pero sí para ir a        */}
      {/*  verificar el precio")                                                */}
      {/* ===================================================================== */}
      {isExploringStores && (
        <div className="bg-[#171a24] border border-[#e0a96d]/30 p-5 sm:p-6 rounded-2xl space-y-5 animate-fade-in shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 font-outfit">
                  ¿Dónde venden este producto o equivalente? (Guía para ir a verificar precios)
                </h3>
                <p className="text-xs text-slate-400">
                  Explora en qué tiendas buscar un producto o marcas equivalentes sin inventar precios. Anótalas en tu lista de "Por verificar" para cuando visites la tienda.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExploringStores(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              title="Cerrar buscador de sugerencias"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar for store suggestions */}
          <form onSubmit={handleSearchStoreSuggestions} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Producto o insumo que deseas buscar o comparar
              </label>
              <input
                type="text"
                placeholder="Ej. Jamón de pavo, Queso Oaxaca, Crema CeraVe, Detergente líquido..."
                value={explorerQuery}
                onChange={(e) => setExplorerQuery(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/25 rounded-xl py-2.5 px-3.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Categoría
              </label>
              <select
                value={explorerCategory}
                onChange={(e) => setExplorerCategory(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/25 rounded-xl py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
              >
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={isLoadingSuggestions}
                className="w-full btn-rose-gold py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isLoadingSuggestions ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Buscando tiendas...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Sugerir Tiendas y Equivalentes</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick product chips from your existing comparator */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Tus productos registrados:
            </span>
            {safeItemsList.map(it => (
              <button
                key={it.id}
                type="button"
                onClick={() => handleOpenStoreExplorer(it)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                  explorerTargetItem?.id === it.id
                    ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d] font-bold'
                    : 'bg-[#0b0c10] text-slate-300 hover:text-white border-slate-800 hover:border-[#e0a96d]/40'
                }`}
              >
                {it.name}
              </button>
            ))}
          </div>

          {/* Results of Store & Equivalent Suggestions */}
          {storeSuggestionsResult && (
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              {/* If matched with an existing user item, show what the user already has registered */}
              {(() => {
                const activeMatch = explorerTargetItem
                  ? safeItemsList.find(i => i.id === explorerTargetItem.id)
                  : (explorerQuery.trim() ? findSimilarHouseholdItems(explorerQuery.trim(), safeItemsList, 1)?.[0]?.item : null);

                return (
                  <>
                    {activeMatch && (
                      <div className="p-3.5 rounded-xl bg-[#0b0c10] border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              ✓ Producto en tu comparador: {activeMatch.name}
                            </span>
                            {activeMatch.favoriteVariety && (
                              <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>Favorito: {activeMatch.favoriteVariety}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {(activeMatch.stores || []).length} precio(s) ya registrado(s) • {(activeMatch.pendingStores || []).length} tienda(s) por verificar
                          </span>
                        </div>

                        {Array.isArray(activeMatch.stores) && activeMatch.stores.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {activeMatch.stores.map((st, idx) => (
                              <div key={idx} className="text-[11px] bg-[#171a24] px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                                <span className="font-bold text-slate-200">{st.storeName}</span>
                                {st.variety && <span className="text-amber-300">({st.variety})</span>}
                                <span className="text-[#e0a96d] font-bold">${safeNumber(st.price).toFixed(2)}</span>
                                <span className="text-[10px] text-slate-500">[{formatDisplayDate(st.updatedAt)}]</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tip Banner + Bulk Add Pending Button */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Sugerencias para "{storeSuggestionsResult.productTitle}"</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {storeSuggestionsResult.summaryTip}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const suggestions = storeSuggestionsResult.suggestions || [];
                          suggestions.forEach(sg => {
                            const alreadyHasPrice = activeMatch && (activeMatch.stores || []).some(
                              s => s.storeName?.toLowerCase().trim() === sg.storeName?.toLowerCase().trim()
                            );
                            if (!alreadyHasPrice) {
                              handleAddPendingStore(
                                sg.storeName,
                                sg.suggestedVariety,
                                sg.reason,
                                activeMatch,
                                storeSuggestionsResult.productTitle,
                                storeSuggestionsResult.detectedCategory
                              );
                            }
                          });
                        }}
                        className="px-3 py-2 rounded-xl bg-[#0b0c10] hover:bg-slate-900 text-[#e0a96d] border border-[#e0a96d]/40 text-xs font-bold shrink-0 cursor-pointer transition-all flex items-center gap-1.5 self-start sm:self-center"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>📌 Anotar todas las tiendas faltantes para ir a verificar</span>
                      </button>
                    </div>

                    {/* Grid of Suggested Stores & Equivalents */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {(storeSuggestionsResult.suggestions || []).map((sg, idx) => {
                        const existingPriceInStore = activeMatch && (activeMatch.stores || []).find(
                          s => s.storeName?.toLowerCase().trim() === sg.storeName?.toLowerCase().trim()
                        );
                        const isPendingInStore = activeMatch && (activeMatch.pendingStores || []).some(
                          ps => ps.storeName?.toLowerCase().trim() === sg.storeName?.toLowerCase().trim()
                        );

                        return (
                          <div
                            key={`${sg.storeName}-${idx}`}
                            className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                              isPendingInStore
                                ? 'bg-[#0b0c10] border-emerald-500/40 shadow-md'
                                : existingPriceInStore
                                ? 'bg-[#0b0c10]/70 border-slate-800'
                                : 'bg-[#0b0c10] border-[#e0a96d]/20 hover:border-[#e0a96d]/50'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <Store className="w-4 h-4 text-[#e0a96d]" />
                                  <span className="font-bold text-slate-100 text-sm">{sg.storeName}</span>
                                </div>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {sg.storeType || 'Tienda'}
                                </span>
                              </div>

                              <div className="p-2 rounded-lg bg-[#171a24] border border-slate-800/90 space-y-1">
                                <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Producto / Equivalente a buscar:</span>
                                </div>
                                <p className="text-xs font-semibold text-slate-100">
                                  {sg.suggestedVariety}
                                </p>
                                {sg.presentationTip && (
                                  <p className="text-[10px] text-slate-400">
                                    📦 {sg.presentationTip}
                                  </p>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                💡 {sg.reason}
                              </p>

                              {existingPriceInStore && (
                                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-300">
                                  ✓ Ya registraste aquí: <strong>${safeNumber(existingPriceInStore.price).toFixed(2)}</strong>
                                  {existingPriceInStore.variety ? ` (${existingPriceInStore.variety})` : ''} el <strong>{formatDisplayDate(existingPriceInStore.updatedAt)}</strong>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                              {isPendingInStore ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>📌 En tu lista para verificar</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedVisitStore(sg.storeName);
                                      setIsExploringStores(false);
                                      setIsStoreVisitOpen(true);
                                    }}
                                    className="text-[11px] font-bold text-[#e0a96d] hover:underline cursor-pointer"
                                  >
                                    Ver lista de {sg.storeName} →
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddPendingStore(
                                    sg.storeName,
                                    sg.suggestedVariety,
                                    sg.reason,
                                    activeMatch,
                                    storeSuggestionsResult.productTitle,
                                    storeSuggestionsResult.detectedCategory
                                  )}
                                  className="w-full py-2 px-3 rounded-lg bg-[#171a24] hover:bg-[#e0a96d] text-[#e0a96d] hover:text-[#0b0c10] border border-[#e0a96d]/35 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <ClipboardList className="w-3.5 h-3.5" />
                                  <span>📌 Anotar para ir a verificar en {sg.storeName}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenInStoreChecker({
                                  item: activeMatch,
                                  storeName: sg.storeName,
                                  variety: sg.suggestedVariety
                                })}
                                className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Scale className="w-3 h-3 text-amber-400" />
                                <span>Ya estoy en {sg.storeName} y veo el precio</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PANEL 2: MODO VISITA A TIENDA ("ELEGIR TIENDA Y LISTA POR BUSCAR")    */}
      {/* ("Un botón que me permita elegir una tienda y cuando vaya a ella      */}
      {/*  tener la lista de productos que debo buscar para agregar en el       */}
      {/*  comparador de precios")                                              */}
      {/* ===================================================================== */}
      {isStoreVisitOpen && (() => {
        // Compute all available stores (presets + any custom store used in stores or pendingStores)
        const allStoreNames = Array.from(new Set([
          ...storesPreset,
          ...safeItemsList.flatMap(it => [
            ...(it.stores || []).map(s => s.storeName),
            ...(it.pendingStores || []).map(ps => ps.storeName)
          ]).filter(Boolean)
        ]));

        const cleanSelectedStore = String(selectedVisitStore || 'Costco').trim();
        const normSelectedStore = cleanSelectedStore.toLowerCase();

        // Count items per store that are pending verification or need to buy
        const getStoreBadgeCount = (stName) => {
          const norm = String(stName || '').toLowerCase().trim();
          let pendingCount = 0;
          let missingOrNeedCount = 0;
          safeItemsList.forEach(it => {
            const isExplicitPending = (it.pendingStores || []).some(ps => ps.storeName?.toLowerCase().trim() === norm);
            const hasPriceHere = (it.stores || []).some(s => s.storeName?.toLowerCase().trim() === norm);
            if (isExplicitPending) pendingCount++;
            else if (!hasPriceHere || it.repurchaseVerdict === 'need_to_buy' || it.repurchaseVerdict === 'running_low') {
              missingOrNeedCount++;
            }
          });
          return { pendingCount, missingOrNeedCount };
        };

        // Filter products for the chosen store according to storeVisitFilter
        const storeChecklistItems = safeItemsList.filter(it => {
          const isExplicitPending = (it.pendingStores || []).some(
            ps => ps.storeName?.toLowerCase().trim() === normSelectedStore
          );
          const hasPriceHere = (it.stores || []).some(
            s => s.storeName?.toLowerCase().trim() === normSelectedStore
          );
          const isUrgentToBuy = it.repurchaseVerdict === 'need_to_buy' || it.repurchaseVerdict === 'running_low';

          if (storeVisitFilter === 'to_verify') {
            // Products explicitly marked to verify in this store + products missing price in this store + urgent to buy
            return isExplicitPending || !hasPriceHere || isUrgentToBuy;
          }
          if (storeVisitFilter === 'explicit_pending') {
            return isExplicitPending;
          }
          if (storeVisitFilter === 'to_buy') {
            return isUrgentToBuy;
          }
          return true; // 'all'
        }).sort((a, b) => {
          // Sort explicit pending first, then need_to_buy / running_low, then missing price in store
          const aPend = (a.pendingStores || []).some(ps => ps.storeName?.toLowerCase().trim() === normSelectedStore) ? 1 : 0;
          const bPend = (b.pendingStores || []).some(ps => ps.storeName?.toLowerCase().trim() === normSelectedStore) ? 1 : 0;
          if (aPend !== bPend) return bPend - aPend;

          const aUrgent = (a.repurchaseVerdict === 'need_to_buy' || a.repurchaseVerdict === 'running_low') ? 1 : 0;
          const bUrgent = (b.repurchaseVerdict === 'need_to_buy' || b.repurchaseVerdict === 'running_low') ? 1 : 0;
          return bUrgent - aUrgent;
        });

        return (
          <div className="bg-[#171a24] border border-emerald-500/35 p-5 sm:p-6 rounded-2xl space-y-5 animate-fade-in shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 font-outfit flex items-center gap-2">
                    <span>Modo Visita a Tienda: Lista de Productos por Buscar y Cotizar</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Elige la tienda donde estás (o a la que vas a ir) para ver qué productos buscar, verificar su precio y compararlo contra tus registros de otras tiendas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleOpenInStoreChecker({ storeName: cleanSelectedStore })}
                  className="btn-rose-gold py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>🏷️ Cotizar producto libre en {cleanSelectedStore}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStoreVisitOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                  title="Cerrar Modo Tienda"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Step 1: Store Selector Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>1. Selecciona la tienda a visitar:</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">¿Otra tienda?:</span>
                  <input
                    type="text"
                    list="stores-preset-list"
                    value={selectedVisitStore}
                    onChange={(e) => setSelectedVisitStore(e.target.value)}
                    placeholder="Escribe nombre de tienda..."
                    className="bg-[#0b0c10] border border-[#e0a96d]/30 rounded-lg py-1 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {allStoreNames.map(stName => {
                  const isSelected = stName.toLowerCase().trim() === normSelectedStore;
                  const { pendingCount } = getStoreBadgeCount(stName);
                  return (
                    <button
                      key={stName}
                      type="button"
                      onClick={() => setSelectedVisitStore(stName)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-emerald-500 text-[#0b0c10] border-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'bg-[#0b0c10] text-slate-300 hover:text-white border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>{stName}</span>
                      {pendingCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                          isSelected ? 'bg-[#0b0c10] text-emerald-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {pendingCount} 📌
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Filter Tabs + Quick Add to this Store's Search List */}
            <div className="p-3.5 rounded-xl bg-[#0b0c10] border border-slate-800 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStoreVisitFilter('to_verify')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      storeVisitFilter === 'to_verify'
                        ? 'bg-[#e0a96d] text-[#0b0c10]'
                        : 'bg-[#171a24] text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    🕵️ Por Buscar / Verificar en {cleanSelectedStore}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreVisitFilter('explicit_pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      storeVisitFilter === 'explicit_pending'
                        ? 'bg-[#e0a96d] text-[#0b0c10]'
                        : 'bg-[#171a24] text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📌 Solo Anotados para {cleanSelectedStore}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreVisitFilter('to_buy')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      storeVisitFilter === 'to_buy'
                        ? 'bg-amber-500 text-[#0b0c10]'
                        : 'bg-[#171a24] text-amber-300 hover:bg-slate-800 border border-amber-500/30'
                    }`}
                  >
                    🛒 Urgentes por Comprar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreVisitFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      storeVisitFilter === 'all'
                        ? 'bg-[#e0a96d] text-[#0b0c10]'
                        : 'bg-[#171a24] text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📋 Todos mis productos ({safeItemsList.length})
                  </button>
                </div>

                {/* Quick form to jot down a product to look for in this store */}
                <form onSubmit={handleAddQuickPendingToStore} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder={`+ Anotar producto a buscar en ${cleanSelectedStore}...`}
                    value={quickPendingProductName}
                    onChange={(e) => setQuickPendingProductName(e.target.value)}
                    className="bg-[#171a24] border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                  <input
                    type="text"
                    placeholder="Marca / equivalente (opcional)"
                    value={quickPendingVarietyName}
                    onChange={(e) => setQuickPendingVarietyName(e.target.value)}
                    className="bg-[#171a24] border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer shrink-0"
                  >
                    + Agregar a lista
                  </button>
                </form>
              </div>
            </div>

            {/* Step 3: Products Checklist for the Selected Store */}
            {storeChecklistItems.length === 0 ? (
              <div className="p-8 text-center bg-[#0b0c10] rounded-xl border border-slate-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-slate-200">
                  No tienes productos pendientes en este filtro para {cleanSelectedStore}.
                </p>
                <p className="text-xs text-slate-400">
                  Puedes cambiar a la pestaña "Todos mis productos" o usar el botón "¿Dónde lo venden?" para anotar sugerencias a verificar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {storeChecklistItems.map(item => {
                  const pendingEntry = (item.pendingStores || []).find(
                    ps => ps.storeName?.toLowerCase().trim() === normSelectedStore
                  );
                  const currentStorePrices = (item.stores || []).filter(
                    s => s.storeName?.toLowerCase().trim() === normSelectedStore
                  );
                  const otherStorePrices = (item.stores || []).filter(
                    s => s.storeName?.toLowerCase().trim() !== normSelectedStore
                  );
                  const cheapestOther = getCheapestStore(otherStorePrices);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                        pendingEntry
                          ? 'bg-[#0b0c10] border-amber-500/40 shadow-md'
                          : 'bg-[#0b0c10]/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] uppercase font-bold text-[#e0a96d] px-2 py-0.5 rounded bg-[#e0a96d]/10 border border-[#e0a96d]/20">
                                {item.category}
                              </span>
                              {pendingEntry && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <span>📌 Anotado para verificar en {cleanSelectedStore}</span>
                                </span>
                              )}
                              {currentStorePrices.length === 0 && !pendingEntry && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                  Sin precio registrado en {cleanSelectedStore}
                                </span>
                              )}
                              {item.repurchaseVerdict === 'need_to_buy' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  🛒 Necesito Comprar
                                </span>
                              )}
                              {item.repurchaseVerdict === 'running_low' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                                  ⚠️ Ya casi se acaba
                                </span>
                              )}
                            </div>

                            <h4 className="text-base font-bold text-slate-100 font-outfit mt-1">
                              {item.name}
                            </h4>

                            {item.favoriteVariety && (
                              <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>Tu variedad favorita: <strong>{item.favoriteVariety}</strong></span>
                              </div>
                            )}
                          </div>

                          {pendingEntry && (
                            <button
                              type="button"
                              onClick={() => handleRemovePendingStore(item.id, cleanSelectedStore)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              title="Quitar de pendientes en esta tienda"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Specific note of what to look for in this store */}
                        {pendingEntry && (pendingEntry.suggestedVariety || pendingEntry.reason) && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1">
                            {pendingEntry.suggestedVariety && (
                              <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                                <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Buscar en anaquel: {pendingEntry.suggestedVariety}</span>
                              </div>
                            )}
                            {pendingEntry.reason && (
                              <p className="text-[11px] text-slate-300">
                                💡 {pendingEntry.reason}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Current price in THIS store if already registered previously */}
                        {currentStorePrices.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                              Último precio que registraste en {cleanSelectedStore}:
                            </span>
                            {currentStorePrices.map((cs, cIdx) => {
                              const u = safeNumber(cs.quantity, 1) > 0 ? safeNumber(cs.price, 0) / safeNumber(cs.quantity, 1) : 0;
                              return (
                                <div key={cIdx} className="flex items-center justify-between text-xs text-slate-200">
                                  <span>
                                    <strong>{cs.variety || 'Estándar'}</strong> ({cs.quantity} u) • <span className="text-[10px] text-emerald-300">📅 {formatDisplayDate(cs.updatedAt)}</span>
                                  </span>
                                  <span className="font-bold text-emerald-300">
                                    ${safeNumber(cs.price).toFixed(2)} (${u.toFixed(3)}/ud)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Reference prices already registered in OTHER stores (with date!) */}
                        <div className="p-2.5 rounded-lg bg-[#171a24] border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              📊 Tus precios registrados en otras tiendas (para comparar):
                            </span>
                            {cheapestOther && (
                              <span className="text-[10px] font-bold text-emerald-400">
                                Mejor: {cheapestOther.storeName} (${cheapestOther.unitPriceNum.toFixed(3)}/ud)
                              </span>
                            )}
                          </div>

                          {otherStorePrices.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">
                              Aún no tienes precios registrados en otras tiendas para este producto.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {otherStorePrices.map((os, oIdx) => {
                                const p = safeNumber(os.price, 0);
                                const q = safeNumber(os.quantity, 1);
                                const u = q > 0 ? p / q : 0;
                                const isBest = cheapestOther && cheapestOther.storeName === os.storeName && (cheapestOther.variety || '') === (os.variety || '');
                                return (
                                  <div
                                    key={oIdx}
                                    className={`flex items-center justify-between text-[11px] px-2 py-1 rounded border ${
                                      isBest
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                        : 'bg-[#0b0c10]/60 border-slate-800/80 text-slate-300'
                                    }`}
                                  >
                                    <div className="truncate pr-2">
                                      <span className="font-bold">{os.storeName}</span>
                                      {os.variety && <span className="text-amber-300 font-medium"> • {os.variety}</span>}
                                      <span className="text-[10px] text-slate-400 ml-1.5">
                                        (📅 {formatDisplayDate(os.updatedAt)})
                                      </span>
                                    </div>
                                    <div className="shrink-0 text-right font-semibold">
                                      <span>${p.toFixed(2)}</span>
                                      <span className="text-[10px] text-slate-400"> / {q}u </span>
                                      <span className="text-[#e0a96d] font-bold">(${u.toFixed(3)}/u)</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action button when in the store and seeing the price */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenInStoreChecker({
                            item,
                            storeName: cleanSelectedStore,
                            variety: pendingEntry?.suggestedVariety || item.favoriteVariety || ''
                          })}
                          className="w-full btn-rose-gold py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <Scale className="w-4 h-4" />
                          <span>🏷️ Vi el precio en {cleanSelectedStore} → Comparar y Agregar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

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
                const matches = findSimilarHouseholdItems(itemName.trim(), householdItems, 3);
                if (!matches || matches.length === 0) return null;

                return (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs animate-fade-in shadow-inner">
                    <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Sugerencias de productos y subproductos existentes ({matches.length})</span>
                      </div>
                      <span className="text-[10px] text-amber-300/80 font-medium">
                        Detección por nombre y subpresentación
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {matches.map(({ item: matchedItem, matchType, matchedSubproduct }, mIdx) => {
                        const suggestedSub = matchType === 'subproduct' 
                          ? (deriveVarietySuggestion(itemName.trim(), matchedItem.name) || matchedSubproduct)
                          : deriveVarietySuggestion(itemName.trim(), matchedItem.name);
                        const hasFavorite = matchedItem.favoriteVariety;
                        const matchedVarietyOpinion = matchedSubproduct ? matchedItem.varietyOpinions?.[matchedSubproduct] : null;

                        return (
                          <div key={matchedItem.id || mIdx} className="bg-[#0b0c10]/85 p-3 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-100 text-sm">{matchedItem.name}</span>
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    {matchedItem.category}
                                  </span>
                                  {matchType === 'name' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                      ✓ Mismo producto principal
                                    </span>
                                  )}
                                  {matchType === 'subproduct' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                      <Tag className="w-2.5 h-2.5 text-amber-400" />
                                      <span>Ya tienes el subproducto "{matchedSubproduct}" aquí</span>
                                    </span>
                                  )}
                                  {matchType === 'both' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                      ⭐ Coincide en producto y subproducto
                                    </span>
                                  )}
                                </div>

                                {hasFavorite && (
                                  <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1 mt-1">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span>Tu favorito registrado en este producto: <strong>"{hasFavorite}"</strong></span>
                                  </div>
                                )}

                                {matchedVarietyOpinion && (
                                  <div className="text-[10.5px] text-slate-300 italic bg-slate-900/90 p-1.5 rounded mt-1 border border-slate-800">
                                    💬 Opinión guardada de "{matchedSubproduct}": <strong>"{matchedVarietyOpinion.opinion || 'Sin comentario escrito'}"</strong>
                                    {matchedVarietyOpinion.rating && ` (${matchedVarietyOpinion.rating === 'liked' ? '👍 Me gustó' : matchedVarietyOpinion.rating === 'disliked' ? '👎 No me gustó' : matchedVarietyOpinion.rating === 'favorite' ? '⭐ Favorito' : '😐 Regular'})`}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Subproducts list preview */}
                            {Array.isArray(matchedItem.subproducts) && matchedItem.subproducts.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                <span className="text-[10px] text-slate-400 font-semibold">Otras variedades:</span>
                                {matchedItem.subproducts.map((sp, sIdx) => (
                                  <span key={sIdx} className={`text-[10px] px-1.5 py-0.2 rounded border ${
                                    sp === matchedItem.favoriteVariety 
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                                      : 'bg-[#e0a96d]/10 text-[#e0a96d] border-[#e0a96d]/20'
                                  }`}>
                                    {sp === matchedItem.favoriteVariety ? `⭐ ${sp}` : sp}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Quick action buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-800/60">
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

                                    handleMergeAndCompareWithExisting(matchedItem, valid, itemNotes, suggestedSub);
                                  }}
                                  className="btn-rose-gold text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                                >
                                  <Tag className="w-3.5 h-3.5" />
                                  <span>🏷️ Guardar como subproducto "{suggestedSub}" en "{matchedItem.name}"</span>
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

                                  handleMergeAndCompareWithExisting(matchedItem, valid, itemNotes);
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowUpDown className="w-3.5 h-3.5 text-[#e0a96d]" />
                                <span>⚖️ Comparar en "{matchedItem.name}"</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(matchedItem)}
                                className="text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border border-slate-800"
                              >
                                Ver Ficha
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
            const itemVarieties = Array.from(new Set([
              ...(Array.isArray(item.subproducts) ? item.subproducts : []),
              ...(item.stores || []).map(s => s.variety?.trim()).filter(Boolean)
            ]));
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
                        {item.favoriteVariety && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span>Fav: {item.favoriteVariety}</span>
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
                        const isFav = (item.favoriteVariety || '').toLowerCase().trim() === v.toLowerCase().trim();
                        const op = item.varietyOpinions?.[v];
                        const r = op?.rating;

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
                            {isFav && (
                              <Star className={`w-3 h-3 ${isSelected ? 'fill-[#0b0c10] text-[#0b0c10]' : 'fill-amber-400 text-amber-400'}`} />
                            )}
                            <span>{v}</span>
                            {r === 'liked' && !isFav && <span>👍</span>}
                            {r === 'disliked' && <span>👎</span>}
                            {r === 'neutral' && <span>😐</span>}
                            <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-black/20 text-[#0b0c10]' : 'bg-slate-900 text-slate-400'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Global Favorite Spotlight when looking at all varieties */}
                  {currentVariety === 'ALL' && item.favoriteVariety && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
                      <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-amber-300">
                            ⭐ Subproducto Favorito: <strong>{item.favoriteVariety}</strong>
                          </span>
                          {item.varietyOpinions?.[item.favoriteVariety]?.rating && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                              {item.varietyOpinions[item.favoriteVariety].rating === 'liked' ? '👍 Me gustó' : '⭐ El mejor'}
                            </span>
                          )}
                        </div>
                        {item.varietyOpinions?.[item.favoriteVariety]?.opinion ? (
                          <p className="text-[11px] text-slate-300 italic mt-1 leading-relaxed">
                            "{item.varietyOpinions[item.favoriteVariety].opinion}"
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic mt-0.5">
                            Selecciona la pestaña "{item.favoriteVariety}" para anotar tu opinión o comentario.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interactive Subproduct Opinion Panel when a specific variety is selected */}
                  {currentVariety !== 'ALL' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#0b0c10] border border-[#e0a96d]/20 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#e0a96d]" />
                          <span className="text-xs font-bold text-slate-200">
                            Opinión de "{currentVariety}":
                          </span>
                        </div>

                        {/* Favorite Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleFavoriteVariety(item.id, currentVariety)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            (item.favoriteVariety || '').toLowerCase().trim() === currentVariety.toLowerCase().trim()
                              ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-300 hover:text-amber-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                          title={(item.favoriteVariety || '').toLowerCase().trim() === currentVariety.toLowerCase().trim() ? 'Quitar marca de favorito' : 'Marcar este subproducto como tu favorito'}
                        >
                          <Star className={`w-3.5 h-3.5 ${(item.favoriteVariety || '').toLowerCase().trim() === currentVariety.toLowerCase().trim() ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
                          <span>{(item.favoriteVariety || '').toLowerCase().trim() === currentVariety.toLowerCase().trim() ? '⭐ Es tu favorito' : 'Marcar como favorito'}</span>
                        </button>
                      </div>

                      {/* Quick Reaction Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-semibold">¿Qué tal te pareció?</span>
                        <button
                          type="button"
                          onClick={() => handleSetVarietyRating(item.id, currentVariety, 'liked')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                            item.varietyOpinions?.[currentVariety]?.rating === 'liked'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/60'
                          }`}
                        >
                          <span>👍 Me gustó</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetVarietyRating(item.id, currentVariety, 'neutral')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                            item.varietyOpinions?.[currentVariety]?.rating === 'neutral'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/60'
                          }`}
                        >
                          <span>😐 Regular</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetVarietyRating(item.id, currentVariety, 'disliked')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                            item.varietyOpinions?.[currentVariety]?.rating === 'disliked'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/60'
                          }`}
                        >
                          <span>👎 No me gustó</span>
                        </button>
                      </div>

                      {/* Text Opinion Input */}
                      <div className="pt-0.5">
                        <input
                          type="text"
                          defaultValue={item.varietyOpinions?.[currentVariety]?.opinion || ''}
                          key={`${item.id}-${currentVariety}`}
                          onBlur={(e) => handleUpdateVarietyOpinion(item.id, currentVariety, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleUpdateVarietyOpinion(item.id, currentVariety, e.currentTarget.value);
                            }
                          }}
                          placeholder={`Ej. "Es mi favorito hasta ahorita aunque el otro no está mal", "Aroma rico, no reseca"...`}
                          className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-1.5 px-3 text-slate-200 text-xs focus:outline-none focus:border-[#e0a96d] transition-colors placeholder:text-slate-500"
                        />
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          Se guarda automáticamente al escribir o presionar Enter.
                        </p>
                      </div>
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
                        const isFavoriteVariety = item.favoriteVariety && (item.favoriteVariety || '').toLowerCase().trim() === (store.variety || '').toLowerCase().trim();
                        
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
                                <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0 ${
                                  isFavoriteVariety
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                                    : 'bg-amber-500/10 text-amber-300/90 border-amber-500/25'
                                }`}>
                                  <Tag className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{store.variety}</span>
                                  {isFavoriteVariety && (
                                    <span className="text-[9px] text-amber-400 font-extrabold">⭐ Fav</span>
                                  )}
                                </span>
                              )}
                              {store.updatedAt && (
                                <span className="text-[9.5px] text-slate-500 flex items-center gap-0.5 shrink-0" title={`Último registro: ${store.updatedAt}`}>
                                  <Calendar className="w-2.5 h-2.5 text-slate-500" />
                                  <span>{formatDisplayDate(store.updatedAt)}</span>
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

                  {/* Pending Stores to Verify Section on Card */}
                  {Array.isArray(item.pendingStores) && item.pendingStores.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase text-amber-300 flex items-center gap-1">
                          <ClipboardList className="w-3 h-3 text-amber-400" />
                          <span>📌 Tiendas pendientes por ir a verificar precio ({item.pendingStores.length}):</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.pendingStores.map((ps, pIdx) => (
                          <div
                            key={`${ps.storeName}-${pIdx}`}
                            className="bg-[#0b0c10] border border-amber-500/30 rounded-lg px-2 py-1 text-[11px] flex items-center gap-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVisitStore(ps.storeName);
                                setIsStoreVisitOpen(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="font-bold text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                              title={`Ver lista de búsqueda de ${ps.storeName}`}
                            >
                              <Store className="w-3 h-3 text-amber-400" />
                              <span>{ps.storeName}</span>
                            </button>
                            {ps.suggestedVariety && (
                              <span className="text-slate-300 text-[10px] truncate max-w-[160px]" title={ps.suggestedVariety}>
                                ({ps.suggestedVariety})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenInStoreChecker({
                                item,
                                storeName: ps.storeName,
                                variety: ps.suggestedVariety || item.favoriteVariety || ''
                              })}
                              className="px-1.5 py-0.2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[9.5px] font-bold cursor-pointer"
                              title={`Registrar y comparar el precio visto en ${ps.storeName}`}
                            >
                              🏷️ Ya vi precio
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePendingStore(item.id, ps.storeName)}
                              className="text-slate-500 hover:text-rose-400 cursor-pointer"
                              title="Quitar de pendientes"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleOpenAddStore(item, currentVariety !== 'ALL' ? currentVariety : '')}
                      className="text-xs text-[#e0a96d] hover:text-[#f5d4af] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Precio / Subproducto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleOpenStoreExplorer(item);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs text-emerald-300 hover:text-emerald-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Buscar sugerencias de tiendas o equivalentes para ir a verificar"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>¿Dónde más buscarlo?</span>
                    </button>
                  </div>

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

              {/* Favorite Variety Selector & Opinions Management */}
              {(() => {
                const editingVarieties = Array.from(new Set(
                  (editingItem.stores || []).map(s => String(s.variety || '').trim()).filter(Boolean)
                ));
                if (editingVarieties.length === 0) return null;

                return (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span>Subproducto Favorito y Calificaciones</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Elige tu variedad favorita y anota tus opiniones o comentarios personales
                      </span>
                    </div>

                    {/* Select top favorite variety */}
                    <div className="bg-[#0b0c10] p-3 rounded-xl border border-amber-500/20 space-y-1.5">
                      <label className="block text-[11px] font-semibold text-amber-300">
                        ⭐ ¿Cuál es tu variedad / subproducto favorito de este producto?
                      </label>
                      <select
                        value={editingItem.favoriteVariety || ''}
                        onChange={(e) => {
                          const chosen = e.target.value;
                          const currentOps = { ...(editingItem.varietyOpinions || {}) };
                          Object.keys(currentOps).forEach(k => {
                            if (currentOps[k]) currentOps[k] = { ...currentOps[k], isFavorite: false };
                          });
                          if (chosen) {
                            currentOps[chosen] = {
                              ...(currentOps[chosen] || { opinion: '', rating: 'favorite' }),
                              rating: currentOps[chosen]?.rating === 'disliked' ? 'favorite' : (currentOps[chosen]?.rating || 'favorite'),
                              isFavorite: true
                            };
                          }
                          setEditingItem({
                            ...editingItem,
                            favoriteVariety: chosen,
                            varietyOpinions: currentOps
                          });
                        }}
                        className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-1.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                      >
                        <option value="">(Ninguno seleccionado como favorito aún)</option>
                        {editingVarieties.map(v => (
                          <option key={v} value={v}>⭐ {v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Individual opinions & ratings per variety */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Opiniones y comentarios por tipo o marca:
                      </span>
                      {editingVarieties.map(v => {
                        const opObj = editingItem.varietyOpinions?.[v] || { opinion: '', rating: 'liked', isFavorite: false };
                        const isFav = (editingItem.favoriteVariety || '') === v || opObj.isFavorite;

                        return (
                          <div key={v} className="bg-[#0b0c10] p-2.5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-[#e0a96d]" />
                                <span className="font-bold text-slate-200 text-xs">{v}</span>
                                {isFav && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                                    <span>Favorito</span>
                                  </span>
                                )}
                              </div>

                              {/* Rating buttons */}
                              <div className="flex items-center gap-1">
                                {['liked', 'neutral', 'disliked'].map(r => (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() => {
                                      const currentOps = { ...(editingItem.varietyOpinions || {}) };
                                      currentOps[v] = {
                                        ...(currentOps[v] || { opinion: '', isFavorite: isFav }),
                                        rating: r
                                      };
                                      setEditingItem({ ...editingItem, varietyOpinions: currentOps });
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                      opObj.rating === r
                                        ? (r === 'liked' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : r === 'disliked' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40')
                                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
                                    }`}
                                  >
                                    {r === 'liked' ? '👍 Me gustó' : r === 'disliked' ? '👎 No me gustó' : '😐 Regular'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <input
                                type="text"
                                value={opObj.opinion || ''}
                                onChange={(e) => {
                                  const currentOps = { ...(editingItem.varietyOpinions || {}) };
                                  currentOps[v] = {
                                    ...(currentOps[v] || { rating: 'liked', isFavorite: isFav }),
                                    opinion: e.target.value
                                  };
                                  setEditingItem({ ...editingItem, varietyOpinions: currentOps });
                                }}
                                placeholder={`Opinión de "${v}" (ej. Es mi favorito hasta ahorita aunque el otro no está mal...)`}
                                className="w-full bg-[#171a24] border border-slate-700 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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

      {/* Quick Add Price / Subproduct Modal Dialog (with Live Registered Comparison) */}
      {addingStoreToItem && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={(e) => handleAddStorePrice(e, 'save_only')} className="bg-[#171a24] border border-[#e0a96d]/25 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80 shrink-0">
              <div>
                <h3 className="text-md font-bold text-slate-100 font-outfit">Agregar Precio o Subproducto</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Para: <strong>{addingStoreToItem.name}</strong> (compara al instante con tus registros)</p>
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
            
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 py-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <label className="block text-xs font-semibold text-slate-400">Subproducto / Marca (Opcional)</label>
                    <Tag className="w-3 h-3 text-[#e0a96d]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ej. Pechuga de Pavo San Rafael, FUD..."
                    value={newStoreVariety}
                    onChange={(e) => setNewStoreVariety(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad (Uds/Grs/Ml) *</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 12 (rollos) o 250 (grs)"
                    value={newStoreQty}
                    onChange={(e) => setNewStoreQty(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                    required
                  />
                </div>
              </div>

              {/* Live Comparison against User's Registered Data */}
              {(() => {
                const liveEval = evaluateInStorePriceAgainstRegistered({
                  productQuery: addingStoreToItem.name,
                  varietyQuery: newStoreVariety,
                  storeName: newStoreName,
                  price: newStorePrice,
                  quantity: newStoreQty,
                  householdItems: safeItemsList,
                  explicitTargetItem: addingStoreToItem
                });

                return (
                  <div className="p-3 rounded-xl bg-[#0b0c10] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-[#e0a96d]" />
                        <span>Comparativa con tus precios ya registrados:</span>
                      </span>
                      {liveEval.hasCandidatePrice && (
                        <span className="text-[11px] font-bold text-[#e0a96d]">
                          Aquí: ${liveEval.candidateUnitPrice.toFixed(3)} / ud
                        </span>
                      )}
                    </div>

                    {liveEval.decisionVerdict && (
                      <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                        liveEval.decisionVerdict.color === 'emerald'
                          ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                          : liveEval.decisionVerdict.color === 'amber'
                          ? 'bg-amber-500/10 border-amber-500/35 text-amber-200'
                          : liveEval.decisionVerdict.color === 'rose'
                          ? 'bg-rose-500/10 border-rose-500/35 text-rose-200'
                          : 'bg-blue-500/10 border-blue-500/35 text-blue-200'
                      }`}>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{liveEval.decisionVerdict.badge}:</span>
                          <span>{liveEval.decisionVerdict.title}</span>
                        </div>
                        <p className="text-[11px] opacity-90 leading-relaxed">
                          {liveEval.decisionVerdict.message}
                        </p>
                      </div>
                    )}

                    {liveEval.registeredEntries.length > 0 ? (
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {liveEval.registeredEntries.map((re, rIdx) => (
                          <div
                            key={rIdx}
                            className={`flex items-center justify-between text-[11px] p-1.5 rounded border ${
                              re.isSameOrSimilarVariety
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                                : 'bg-[#171a24] border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-100">{re.storeName}</span>
                              {re.variety && <span className="text-amber-300"> ({re.variety})</span>}
                              <span className="text-[10px] text-slate-400 ml-1">
                                [📅 {formatDisplayDate(re.updatedAt)}]
                              </span>
                            </div>
                            <div className="shrink-0 font-semibold text-right">
                              <span>${re.price.toFixed(2)}</span>
                              <span className="text-[10px] text-slate-400"> / {re.quantity}u </span>
                              <span className="text-[#e0a96d] font-bold">(${re.unitPrice.toFixed(3)}/u)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Aún no tenías otros precios registrados para este insumo.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Optional Opinion and Favorite rating for this variety */}
              <div className="p-3 rounded-xl bg-[#0b0c10] border border-[#e0a96d]/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Opinión del Subproducto</span>
                  </label>
                  
                  {/* Favorite checkbox toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-amber-300">
                    <input
                      type="checkbox"
                      checked={newStoreIsFavorite}
                      onChange={(e) => setNewStoreIsFavorite(e.target.checked)}
                      className="rounded border-[#e0a96d]/40 text-[#e0a96d] focus:ring-0 cursor-pointer"
                    />
                    <span>⭐ Marcar como favorito</span>
                  </label>
                </div>

                {/* Rating selector buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Calificación:</span>
                  <button
                    type="button"
                    onClick={() => setNewStoreRating('liked')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      newStoreRating === 'liked'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/60'
                    }`}
                  >
                    <span>👍 Me gustó</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStoreRating('neutral')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      newStoreRating === 'neutral'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/60'
                    }`}
                  >
                    <span>😐 Regular</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStoreRating('disliked')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      newStoreRating === 'disliked'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/60'
                    }`}
                  >
                    <span>👎 No me gustó</span>
                  </button>
                </div>

                {/* Opinion comment input */}
                <div>
                  <input
                    type="text"
                    placeholder={`Comentario (ej. "Es mi favorito hasta ahorita", "Sabor rico")...`}
                    value={newStoreOpinion}
                    onChange={(e) => setNewStoreOpinion(e.target.value)}
                    className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-4 mt-2 border-t border-slate-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setAddingStoreToItem(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer transition-all"
              >
                💾 Solo Guardar Precio
              </button>
              <button
                type="button"
                onClick={(e) => handleAddStorePrice(e, 'bought')}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all shadow-md"
              >
                🛒 Comprar y Guardar Precio
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: "ESTOY EN LA TIENDA Y VEO EL PRECIO" — COTIZADOR Y DECISIÓN  */}
      {/* ("Si estoy en la tienda y veo el precio pueda agregarla y decirme si  */}
      {/*  en otras tiendas tienen ese producto u otro similar comparado solo   */}
      {/*  con los que yo ya registré, con su fecha y precio, para tomar la     */}
      {/*  opción de comprar el producto o no")                                 */}
      {/* ===================================================================== */}
      {inStoreChecker && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/35 rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl animate-modal-pop my-auto max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-start gap-3 mb-4 pb-3 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 font-outfit">
                    Estoy en la Tienda: Cotizar Precio y Comparar con mis Registros
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Compara exclusivamente contra los productos, marcas, precios y fechas que tú ya registraste para decidir si te conviene comprarlo hoy.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInStoreChecker(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar cotizador"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const liveAnalysis = evaluateInStorePriceAgainstRegistered({
                productQuery: inStoreChecker.productName,
                varietyQuery: inStoreChecker.variety,
                storeName: inStoreChecker.storeName,
                price: inStoreChecker.price,
                quantity: inStoreChecker.quantity,
                householdItems: safeItemsList,
                explicitTargetItem: inStoreChecker.targetItem
              });

              const knownVarieties = Array.from(new Set(
                liveAnalysis.matchedItems.flatMap(it => [
                  ...(it.subproducts || []),
                  ...(it.stores || []).map(s => s.variety)
                ]).filter(Boolean)
              ));

              return (
                <>
                  <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-1 custom-scrollbar">
                    {/* Store & Product Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#0b0c10] p-3.5 rounded-xl border border-slate-800">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                          🏪 Tienda donde estás *
                        </label>
                        <input
                          type="text"
                          list="stores-preset-list"
                          value={inStoreChecker.storeName}
                          onChange={(e) => setInStoreChecker({ ...inStoreChecker, storeName: e.target.value })}
                          placeholder="Ej. Sam's Club, Costco..."
                          className="w-full bg-[#171a24] border border-emerald-500/35 rounded-lg py-2 px-3 text-slate-100 text-xs font-semibold focus:outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          📦 Producto Principal *
                        </label>
                        <input
                          type="text"
                          list="existing-products-datalist"
                          value={inStoreChecker.productName}
                          onChange={(e) => {
                            const val = e.target.value;
                            const exactMatch = safeItemsList.find(
                              i => i.name.toLowerCase().trim() === val.toLowerCase().trim()
                            );
                            setInStoreChecker({
                              ...inStoreChecker,
                              productName: val,
                              targetItem: exactMatch || null,
                              category: exactMatch ? exactMatch.category : inStoreChecker.category
                            });
                          }}
                          placeholder="Ej. Jamón, Papel Higiénico, Jabón..."
                          className="w-full bg-[#171a24] border border-[#e0a96d]/25 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                        />
                        <datalist id="existing-products-datalist">
                          {safeItemsList.map(it => (
                            <option key={it.id} value={it.name} />
                          ))}
                        </datalist>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Categoría
                        </label>
                        <select
                          value={inStoreChecker.category || 'Despensa'}
                          onChange={(e) => setInStoreChecker({ ...inStoreChecker, category: e.target.value })}
                          className="w-full bg-[#171a24] border border-slate-700 rounded-lg py-2 px-2.5 text-slate-200 text-xs focus:outline-none focus:border-[#e0a96d]"
                        >
                          {categories.filter(c => c !== 'All').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Variety & Price seen in store */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#0b0c10] p-3.5 rounded-xl border border-[#e0a96d]/25">
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-bold text-amber-300 mb-1">
                          🏷️ Marca / Subproducto / Equivalente que ves
                        </label>
                        <input
                          type="text"
                          list="known-varieties-datalist"
                          value={inStoreChecker.variety}
                          onChange={(e) => setInStoreChecker({ ...inStoreChecker, variety: e.target.value })}
                          placeholder="Ej. FUD Virginia de Pavo, San Rafael, Kirkland..."
                          className="w-full bg-[#171a24] border border-amber-500/30 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                        />
                        <datalist id="known-varieties-datalist">
                          {knownVarieties.map(v => (
                            <option key={v} value={v} />
                          ))}
                        </datalist>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-[#e0a96d] mb-1">
                          💲 Precio en tienda ($) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={inStoreChecker.price}
                          onChange={(e) => setInStoreChecker({ ...inStoreChecker, price: e.target.value })}
                          placeholder="Ej. 58.00"
                          className="w-full bg-[#171a24] border border-[#e0a96d]/40 rounded-lg py-2 px-3 text-slate-100 text-xs font-bold focus:outline-none focus:border-[#e0a96d]"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          ⚖️ Cantidad (Grs/Uds) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={inStoreChecker.quantity}
                          onChange={(e) => setInStoreChecker({ ...inStoreChecker, quantity: e.target.value })}
                          placeholder="Ej. 250 o 1000"
                          className="w-full bg-[#171a24] border border-slate-700 rounded-lg py-2 px-3 text-slate-100 text-xs font-bold focus:outline-none focus:border-[#e0a96d]"
                        />
                      </div>

                      {liveAnalysis.hasCandidatePrice && (
                        <div className="sm:col-span-12 pt-1 flex items-center justify-between text-xs border-t border-slate-800/80">
                          <span className="text-slate-400">
                            Costo unitario calculado en <strong>{inStoreChecker.storeName || 'esta tienda'}</strong>:
                          </span>
                          <span className="text-sm font-extrabold text-[#e0a96d]">
                            ${liveAnalysis.candidateUnitPrice.toFixed(3)} por unidad ({inStoreChecker.quantity} u por ${liveAnalysis.candidatePriceNum.toFixed(2)})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* REAL-TIME DECISION VERDICT BANNER */}
                    {liveAnalysis.decisionVerdict && (
                      <div className={`p-4 rounded-xl border-2 space-y-1.5 shadow-lg ${
                        liveAnalysis.decisionVerdict.color === 'emerald'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100'
                          : liveAnalysis.decisionVerdict.color === 'amber'
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-100'
                          : liveAnalysis.decisionVerdict.color === 'rose'
                          ? 'bg-rose-500/10 border-rose-500/50 text-rose-100'
                          : 'bg-blue-500/10 border-blue-500/50 text-blue-100'
                      }`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-black/30">
                            {liveAnalysis.decisionVerdict.badge}
                          </span>
                          <span className="text-[11px] font-semibold opacity-80">
                            Basado 100% en tus registros previos
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold font-outfit">
                          {liveAnalysis.decisionVerdict.title}
                        </h4>
                        <p className="text-xs leading-relaxed opacity-95">
                          {liveAnalysis.decisionVerdict.message}
                        </p>
                      </div>
                    )}

                    {/* REGISTERED PRICES IN OTHER STORES & EQUIVALENTS (Strict User Data Only) */}
                    <div className="p-4 rounded-xl bg-[#0b0c10] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-[#e0a96d]" />
                            <span>Tus Precios y Productos Similares Ya Registrados ({liveAnalysis.registeredEntries.length})</span>
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Comparando con lo que tú ya registraste en tu historial (incluyendo fecha, tienda y subproducto)
                          </p>
                        </div>
                      </div>

                      {liveAnalysis.registeredEntries.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          No se encontraron registros previos de "{inStoreChecker.productName || 'este producto'}" en tu comparador. Al guardarlo hoy será tu primera referencia.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {liveAnalysis.registeredEntries.map((entry, idx) => {
                            const isCheapestReg = idx === 0;
                            const diffFromCandidate = liveAnalysis.hasCandidatePrice
                              ? liveAnalysis.candidateUnitPrice - entry.unitPrice
                              : 0;
                            const pctFromCandidate = (liveAnalysis.hasCandidatePrice && entry.unitPrice > 0)
                              ? (diffFromCandidate / entry.unitPrice) * 100
                              : 0;

                            return (
                              <div
                                key={`${entry.storeName}-${entry.variety}-${idx}`}
                                className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                                  entry.isSameOrSimilarVariety
                                    ? 'bg-amber-500/10 border-amber-500/40'
                                    : isCheapestReg
                                    ? 'bg-emerald-500/5 border-emerald-500/35'
                                    : 'bg-[#171a24] border-slate-800'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-100 text-sm">
                                      {entry.storeName}
                                    </span>
                                    {entry.isSameStore && (
                                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        Misma tienda (registro anterior)
                                      </span>
                                    )}
                                    {entry.variety ? (
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                        <Tag className="w-3 h-3" />
                                        <span>{entry.variety}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">({entry.itemName})</span>
                                    )}
                                    {entry.isSameOrSimilarVariety && (
                                      <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                                        Misma marca / equivalente
                                      </span>
                                    )}
                                    {entry.isFavoriteVariety && (
                                      <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        <span>Tu Favorito</span>
                                      </span>
                                    )}
                                    {isCheapestReg && (
                                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                        🏆 Tu mejor precio registrado
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                                      <Calendar className="w-3 h-3 text-[#e0a96d]" />
                                      <span>Registrado el: <strong>{formatDisplayDate(entry.updatedAt)}</strong> ({entry.updatedAt})</span>
                                    </span>
                                    {entry.opinion && (
                                      <span className="italic text-slate-300">
                                        💬 "{entry.opinion}"
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="sm:text-right shrink-0 space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                                  <div className="text-sm font-bold text-slate-100">
                                    ${entry.price.toFixed(2)} <span className="text-[11px] font-normal text-slate-400">por {entry.quantity} u</span>
                                  </div>
                                  <div className="text-xs font-bold text-[#e0a96d]">
                                    ${entry.unitPrice.toFixed(3)} / ud
                                  </div>
                                  {liveAnalysis.hasCandidatePrice && (
                                    <div className={`text-[10px] font-bold ${
                                      diffFromCandidate < -0.0001
                                        ? 'text-emerald-400'
                                        : diffFromCandidate > 0.0001
                                        ? 'text-rose-400'
                                        : 'text-blue-300'
                                    }`}>
                                      {diffFromCandidate < -0.0001
                                        ? `Hoy ahorras ${Math.abs(pctFromCandidate).toFixed(1)}% vs este registro`
                                        : diffFromCandidate > 0.0001
                                        ? `En ${entry.storeName} estaba ${pctFromCandidate.toFixed(1)}% más barato`
                                        : 'Mismo precio por unidad'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision Action Buttons */}
                  <div className="pt-4 mt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setInStoreChecker(null)}
                      className="py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer transition-all"
                    >
                      ✕ No comprar ni guardar
                    </button>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveInStoreDecision('save_only')}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/35 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>💾 No Comprar Hoy, Solo Guardar Precio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveInStoreDecision('bought')}
                        className="btn-rose-gold py-2.5 px-5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>🛒 ¡Sí Comprar! Guardar Precio y Marcar Comprado</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Similar Product Confirmation / Subproduct Comparison Prompt Modal */}
      {similarProductPrompt && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-scale-up my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-outfit">
                    ¿Deseas agregarlo como subproducto o variedad?
                  </h3>
                  <p className="text-xs text-slate-400">
                    {similarProductPrompt.topMatch?.matchType === 'subproduct'
                      ? `Detectamos que ya registraste la variedad "${similarProductPrompt.topMatch.matchedSubproduct}" dentro de "${similarProductPrompt.similarProduct.name}".`
                      : `Detectamos que ya tienes "${similarProductPrompt.similarProduct.name}". Puedes guardarlo como subproducto para mantener tu comparador ordenado.`}
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

            {/* If multiple matches found (e.g. name match + subproduct match on another item), let user pick */}
            {similarProductPrompt.matches && similarProductPrompt.matches.length > 1 && (
              <div className="p-3 bg-[#0b0c10] border border-amber-500/20 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-amber-300">
                  Coincidencias encontradas ({similarProductPrompt.matches.length}):
                </span>
                <div className="space-y-1.5">
                  {similarProductPrompt.matches.map(({ item: mItem, matchType, matchedSubproduct }, idx) => {
                    const isSelected = mItem.id === similarProductPrompt.similarProduct.id;
                    const altSuggested = matchType === 'subproduct'
                      ? (deriveVarietySuggestion(similarProductPrompt.newName, mItem.name) || matchedSubproduct)
                      : deriveVarietySuggestion(similarProductPrompt.newName, mItem.name);

                    return (
                      <div
                        key={mItem.id || idx}
                        onClick={() => {
                          setSimilarProductPrompt(prev => ({
                            ...prev,
                            similarProduct: mItem,
                            topMatch: similarProductPrompt.matches[idx],
                            suggestedVariety: altSuggested
                          }));
                        }}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-100">{mItem.name}</span>
                          <span className="text-[10px] text-slate-400">({mItem.category})</span>
                          {matchType === 'subproduct' && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                              Tiene variedad "{matchedSubproduct}"
                            </span>
                          )}
                          {matchType === 'name' && (
                            <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              Mismo Producto
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-[#e0a96d]">
                          {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

                {similarProductPrompt.similarProduct.favoriteVariety && (
                  <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>Favorito: <strong>{similarProductPrompt.similarProduct.favoriteVariety}</strong></span>
                  </div>
                )}

                {similarProductPrompt.topMatch?.matchedSubproduct && similarProductPrompt.similarProduct.varietyOpinions?.[similarProductPrompt.topMatch.matchedSubproduct]?.opinion && (
                  <div className="text-[10.5px] text-slate-300 italic bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    💬 "{similarProductPrompt.similarProduct.varietyOpinions[similarProductPrompt.topMatch.matchedSubproduct].opinion}"
                  </div>
                )}

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
