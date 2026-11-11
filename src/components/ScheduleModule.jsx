import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  PlusCircle, 
  Ruler, 
  Droplets, 
  Trash, 
  Edit3, 
  Save, 
  X, 
  Calendar, 
  Sparkles, 
  Heart, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Stethoscope, 
  Scissors, 
  Smile, 
  Activity, 
  ChevronRight, 
  Bell,
  Layers,
  CalendarCheck,
  ArrowRight,
  ShoppingBag,
  ShoppingCart,
  Ban,
  Lightbulb,
  Bot
} from 'lucide-react';
import { sanitizeScheduleList, sanitizeSelfCareList, extractRoutineProductsFromText, sanitizeRoutineProduct } from '../utils/sanitizers';
import { findSimilarity } from '../utils/similarity';
import { 
  getLocalDateString, 
  getYesterdayDateString, 
  formatDisplayDate, 
  formatFullDisplayDate,
  calculateNextDueDate,
  parseLocalDate, 
  getDaysDifference 
} from '../utils/dateUtils';
import BagEssentialsChecklist from './BagEssentialsChecklist';
import SimilarityDialogModal from './SimilarityDialogModal';

export default function ScheduleModule({
  weight,
  setWeight,
  height,
  setHeight,
  waterIntake,
  setWaterIntake,
  schedule = [],
  setSchedule,
  householdItems = [],
  setHouseholdItems,
  selfCareActivities = [],
  setSelfCareActivities,
  bagEssentials = [],
  setBagEssentials,
  showToast,
  setActiveModule,
  onAskCopilotProduct
}) {
  // Navigation Tabs: 'daily' | 'selfcare'
  const [activeTab, setActiveTab] = useState('daily');
  const [similarPrompt, setSimilarPrompt] = useState(null);
  
  // Daily Schedule state
  const [newTitle, setNewTitle] = useState('');
  const [newHour, setNewHour] = useState('08');
  const [newMinute, setNewMinute] = useState('00');
  const [newPeriod, setNewPeriod] = useState('AM');
  const [newDesc, setNewDesc] = useState('');
  const [newRoutineStatus, setNewRoutineStatus] = useState('active'); // 'active' | 'idea'
  const [newProductDraft, setNewProductDraft] = useState('');
  const [newProductDraftStatus, setNewProductDraftStatus] = useState('owned');
  const [newProductsList, setNewProductsList] = useState([]);
  const [routineFilter, setRoutineFilter] = useState('all'); // 'all' | 'active' | 'idea' | 'to_buy' | 'never'
  const [inlineAddProductItemId, setInlineAddProductItemId] = useState(null);
  const [inlineProductName, setInlineProductName] = useState('');
  const [inlineProductStatus, setInlineProductStatus] = useState('owned');
  const [copilotProductInput, setCopilotProductInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editProductDraft, setEditProductDraft] = useState('');
  const [editProductDraftStatus, setEditProductDraftStatus] = useState('owned');

  // Self-Care Calendar state
  const [selfCareFilter, setSelfCareFilter] = useState('all'); // 'all' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom'
  const [isAddingSelfCare, setIsAddingSelfCare] = useState(false);
  const [editingSelfCareItem, setEditingSelfCareItem] = useState(null);

  // Lock body scroll when editing modal is open
  useEffect(() => {
    if (editingItem || editingSelfCareItem) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [editingItem, editingSelfCareItem]);

  // New Self-Care form fields
  const [scTitle, setScTitle] = useState('');
  const [scFrequency, setScFrequency] = useState('weekly');
  const [scCustomValue, setScCustomValue] = useState(1);
  const [scCustomUnit, setScCustomUnit] = useState('weeks'); // 'days' | 'weeks' | 'months' | 'years'
  const [scCategory, setScCategory] = useState('beauty');
  const [scNotes, setScNotes] = useState('');
  const [scProtocol, setScProtocol] = useState('');
  const [scLastDate, setScLastDate] = useState(() => getLocalDateString());

  // Water goal: weight * 35 ml
  const waterGoal = Math.round(weight * 35);
  const waterPercent = Math.min(100, Math.round((waterIntake / waterGoal) * 100));

  // BMI (IMC)
  const imc = (weight / (height * height)).toFixed(1);
  const getImcStatus = (val) => {
    if (val < 18.5) return { label: 'Bajo peso', color: 'text-amber-400' };
    if (val < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (val < 30) return { label: 'Sobrepeso', color: 'text-amber-400' };
    return { label: 'Obesidad', color: 'text-rose-500' };
  };
  const imcStatus = getImcStatus(parseFloat(imc));

  const calculateCategory = (hour, minute, period) => {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 19) return 'afternoon';
    return 'night';
  };

  const getMinutesFromMidnight = (timeStr) => {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();
    
    // Check 12-hour format: "08:00 AM", "8:30 PM", "10:00pm"
    const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const period = match12[3] ? match12[3].toUpperCase() : null;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }

    // Check 24-hour format: "22:00", "07:30"
    const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const h = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      return h * 60 + m;
    }

    return 0;
  };

  const getNightSortMinutes = (timeStr) => {
    const mins = getMinutesFromMidnight(timeStr);
    // In Night section (19:00 to 04:59), early morning hours 00:00 - 04:59 (< 300 mins) belong after 23:59 (+ 1440 mins)
    return mins < 300 ? mins + 1440 : mins;
  };

  const normalizeProductText = (str) =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const findMatchingHouseholdItem = (productName) => {
    if (!productName || !Array.isArray(householdItems) || householdItems.length === 0) return null;
    const normProd = normalizeProductText(productName);
    if (!normProd) return null;
    const stopWords = new Set(['con', 'para', 'del', 'los', 'las', 'una', 'uno', 'por', 'min', 'uso', 'crema', 'jabon', 'serum', 'suero', 'facial', 'corporal', 'medios', 'puntas', 'disuelto']);
    const prodTokens = normProd.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));

    for (const hItem of householdItems) {
      if (!hItem) continue;
      const normH = normalizeProductText(hItem.name || '');
      if (!normH) continue;
      if (normH === normProd || normH.includes(normProd) || normProd.includes(normH)) {
        return hItem;
      }
      if (prodTokens.length > 0) {
        const hTokens = new Set(normH.split(' ').filter(w => w.length >= 3));
        const matches = prodTokens.filter(t => hTokens.has(t));
        if (matches.length >= 2 || (prodTokens.length === 1 && matches.length === 1 && prodTokens[0].length >= 4)) {
          return hItem;
        }
      }
    }
    return null;
  };

  const getEffectiveProductStatus = (prod) => {
    if (!prod) return 'owned';
    if (prod.status && ['owned', 'to_buy', 'to_try', 'never'].includes(prod.status) && prod.status !== 'owned') {
      return prod.status;
    }
    const matchedH = findMatchingHouseholdItem(prod.name);
    if (matchedH && !prod.manualOverride) {
      if (matchedH.repurchaseVerdict === 'no') return 'never';
      if (matchedH.repurchaseVerdict === 'need_to_buy' || matchedH.repurchaseVerdict === 'running_low') return 'to_buy';
      return 'owned';
    }
    return prod.status || 'owned';
  };

  const removeProductMentionFromDesc = (desc = '', productName = '') => {
    if (!desc || !productName) return desc;
    let updated = String(desc);
    const normTarget = normalizeProductText(productName);

    // Special clean patterns for common routine phrases
    const specialPatterns = [
      { key: 'perspirex', regex: /\s*\.?\s*perspirex\s*\/?\s*drysol\s*(\([^)]*\))?\.?/gi },
      { key: 'acondicionador', regex: /\s*,?\s*acondicionador(\s+de\s+medios\s+a\s+puntas)?\s*(\([^)]*\))?/gi },
      { key: 'shampoo', regex: /\s*,?\s*shampoo\s+de\s+chile\s*\/?\s*romero/gi },
      { key: 'jabon de arroz', regex: /\s*,?\s*jab[oó]n\s+de\s+arroz/gi },
      { key: 'cerave pm', regex: /\s*\+?\s*cerave\s+pm\s*\+?/gi },
      { key: 'limpiador facial cerave', regex: /\s*,?\s*limpiador\s+facial\s+cerave/gi },
      { key: 'concha nacar', regex: /\s*\+?\s*concha\s+n[aá]car\s*\+?/gi },
      { key: 'teatrical aclaradora', regex: /\s*\+?\s*teatrical\s+aclaradora\s*\+?/gi },
      { key: 'retinol', regex: /\s*\+?\s*(s[eé]rum\s+de\s+)?retinol\s*\+?/gi },
      { key: 'turbante', regex: /\s*,?\s*turbante\s+de\s+microfibra/gi },
      { key: 'crema de urea', regex: /\s*,?\s*crema\s+de\s+urea(\s+en\s+codos\/talones)?/gi },
      { key: 'fps 30', regex: /\s*,?\s*crema\s+hidratante\s+con\s+fps\s*30\+?/gi }
    ];

    let matchedSpecial = false;
    for (const sp of specialPatterns) {
      if (normTarget.includes(sp.key)) {
        const nextStr = updated.replace(sp.regex, '');
        if (nextStr !== updated) {
          updated = nextStr;
          matchedSpecial = true;
        }
      }
    }

    if (!matchedSpecial) {
      const escaped = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const directRegex = new RegExp(`(\\s*[,+•-]\\s*)?${escaped}(\\s*\\([^)]*\\))?`, 'gi');
      updated = updated.replace(directRegex, '');
    }

    updated = updated
      .replace(/^\s*[,+.;-]\s*/g, '')
      .replace(/\s*,\s*,/g, ',')
      .replace(/\s*\+\s*\+/g, ' + ')
      .replace(/\bNoches\s*\+\s*/gi, 'Noches ')
      .replace(/\s+\./g, '.')
      .replace(/\.\s*\./g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (updated && !/[.!]$/.test(updated)) {
      updated += '.';
    }
    return updated;
  };

  const handleToggleRoutineStatus = (scheduleItemId) => {
    setSchedule(prev =>
      sanitizeScheduleList(prev).map(item => {
        if (String(item.id) !== String(scheduleItemId)) return item;
        const nextStatus = item.routineStatus === 'idea' ? 'active' : 'idea';
        showToast(
          'info',
          nextStatus === 'active' ? '✅ Rutina Activa' : '💡 Guardada como Sugerencia / Idea',
          nextStatus === 'active'
            ? `"${item.title}" marcada como activa en tu día a día.`
            : `"${item.title}" marcada como sugerencia/idea que aún no aplicas.`
        );
        return { ...item, routineStatus: nextStatus };
      })
    );
  };

  const handleSetRoutineProductStatus = (scheduleItemId, productId, nextStatus) => {
    let targetProdName = '';
    setSchedule(prev =>
      sanitizeScheduleList(prev).map(item => {
        if (String(item.id) !== String(scheduleItemId)) return item;
        const currentProds = Array.isArray(item.products) ? item.products : extractRoutineProductsFromText(item.desc, item.title);
        const updatedProds = currentProds.map(p => {
          if (p.id === productId) {
            targetProdName = p.name;
            return { ...p, status: nextStatus, manualOverride: true };
          }
          return p;
        });
        return { ...item, products: updatedProds };
      })
    );

    if (targetProdName && setHouseholdItems) {
      const matchedH = findMatchingHouseholdItem(targetProdName);
      const verdictMap = { owned: 'yes', to_buy: 'need_to_buy', to_try: 'need_to_buy', never: 'no' };
      const mappedVerdict = verdictMap[nextStatus] || 'yes';

      if (matchedH) {
        setHouseholdItems(prev =>
          (Array.isArray(prev) ? prev : []).map(h =>
            h && h.id === matchedH.id ? { ...h, repurchaseVerdict: mappedVerdict } : h
          )
        );
      } else if (nextStatus === 'to_buy' || nextStatus === 'to_try') {
        setHouseholdItems(prev => [
          ...(Array.isArray(prev) ? prev : []),
          {
            id: 'item-' + Date.now(),
            name: targetProdName,
            category: 'Skincare',
            stores: [],
            pendingStores: [],
            subproducts: [],
            favoriteVariety: '',
            varietyOpinions: {},
            preferredStore: '',
            repurchaseVerdict: 'need_to_buy',
            notes: nextStatus === 'to_try'
              ? 'Agregado desde Mi Rutina Diaria (Por comprar y probar).'
              : 'Agregado desde Mi Rutina Diaria (Por comprar).'
          }
        ]);
      }
    }

    const statusLabels = {
      owned: '✅ Ya lo tengo en casa',
      to_buy: '🛒 Por comprar (sincronizado con Insumos)',
      to_try: '🧪 Por probar / Por comprar y probar',
      never: '🚫 No volver a usar (puedes quitarlo de la rutina con 🗑️)'
    };
    if (targetProdName) {
      showToast('info', targetProdName, statusLabels[nextStatus] || 'Estado actualizado');
    }
  };

  const handleRemoveProductFromRoutine = (scheduleItemId, prod) => {
    if (!prod) return;
    setSchedule(prev =>
      sanitizeScheduleList(prev).map(item => {
        if (String(item.id) !== String(scheduleItemId)) return item;
        const currentProds = Array.isArray(item.products) ? item.products : extractRoutineProductsFromText(item.desc, item.title);
        const updatedProds = currentProds.filter(p => p.id !== prod.id && p.name !== prod.name);
        const cleanedDesc = removeProductMentionFromDesc(item.desc, prod.name);
        const prevRemoved = Array.isArray(item.removedProductNames) ? item.removedProductNames : [];
        const removedKey = String(prod.name || '').toLowerCase().trim();
        return {
          ...item,
          products: updatedProds,
          removedProductNames: removedKey ? Array.from(new Set([...prevRemoved, removedKey])) : prevRemoved,
          desc: cleanedDesc
        };
      })
    );
    showToast('info', 'Producto Eliminado de la Rutina', `Se quitó "${prod.name}" de este paso de tu rutina.`);
  };

  const handleAddInlineProductToRoutine = (scheduleItemId) => {
    const cleanName = inlineProductName.trim();
    if (!cleanName) return;

    setSchedule(prev =>
      sanitizeScheduleList(prev).map(item => {
        if (String(item.id) !== String(scheduleItemId)) return item;
        const currentProds = Array.isArray(item.products) ? item.products : extractRoutineProductsFromText(item.desc, item.title);
        const newProd = sanitizeRoutineProduct({
          id: 'rp-' + Date.now(),
          name: cleanName,
          status: inlineProductStatus
        });
        const normDesc = normalizeProductText(item.desc || '');
        const normName = normalizeProductText(cleanName);
        const updatedDesc = normDesc.includes(normName)
          ? item.desc
          : (item.desc ? `${item.desc.replace(/\.\s*$/, '')}, ${cleanName}.` : cleanName);

        return {
          ...item,
          desc: updatedDesc,
          products: [...currentProds, newProd].filter(Boolean)
        };
      })
    );

    if (inlineProductStatus === 'to_buy' && setHouseholdItems && !findMatchingHouseholdItem(cleanName)) {
      setHouseholdItems(prev => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: 'item-' + Date.now(),
          name: cleanName,
          category: 'Skincare',
          stores: [],
          pendingStores: [],
          subproducts: [],
          favoriteVariety: '',
          varietyOpinions: {},
          preferredStore: '',
          repurchaseVerdict: 'need_to_buy',
          notes: 'Agregado desde Mi Rutina Diaria.'
        }
      ]);
    }

    showToast('success', 'Producto Agregado al Paso', `Se añadió "${cleanName}" a este bloque de tu rutina.`);
    setInlineProductName('');
    setInlineProductStatus('owned');
    setInlineAddProductItemId(null);
  };

  const executeSaveScheduleActivity = (trimmedTitle) => {
    const timeStr = `${newHour}:${newMinute} ${newPeriod}`;
    const cat = calculateCategory(newHour, newMinute, newPeriod);
    const extracted = extractRoutineProductsFromText(newDesc, trimmedTitle);
    const mergedProducts = [...newProductsList];
    extracted.forEach(ext => {
      if (!mergedProducts.some(p => normalizeProductText(p.name) === normalizeProductText(ext.name))) {
        mergedProducts.push(ext);
      }
    });

    const newItem = {
      id: Date.now(),
      time: timeStr,
      title: trimmedTitle,
      desc: newDesc,
      category: cat,
      completed: false,
      routineStatus: newRoutineStatus,
      products: mergedProducts
    };

    setSchedule([...schedule, newItem]);
    setNewTitle('');
    setNewDesc('');
    setNewRoutineStatus('active');
    setNewProductsList([]);
    setNewProductDraft('');
    setIsAdding(false);
    setSimilarPrompt(null);
    showToast('success', 'Actividad Añadida', `Se ha programado "${trimmedTitle}"`);
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    // Scan for duplicate/similar items before adding manually
    const similar = findSimilarity(trimmedTitle, schedule, 'title');
    if (similar) {
      setSimilarPrompt({
        kind: 'schedule',
        description: 'Detectamos una actividad similar en tu horario diario:',
        existingLabel: 'Ya programada',
        existingName: similar.title || '',
        existingMeta: similar.time || '',
        existingNotes: similar.desc || '',
        newLabel: 'Nueva actividad',
        newName: trimmedTitle,
        newMeta: `${newHour}:${newMinute} ${newPeriod}`
      });
      return;
    }

    executeSaveScheduleActivity(trimmedTitle);
  };

  const handleToggleComplete = (id) => {
    const updated = schedule.map(item => {
      if (item.id === id) {
        const nextState = !item.completed;
        if (nextState) {
          showToast('success', 'Tarea Completada', `¡Buen trabajo con: ${item.title}!`);
        }
        return { ...item, completed: nextState };
      }
      return item;
    });
    setSchedule(updated);
  };

  const handleDeleteItem = (id, title) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${title || 'esta actividad'}" del horario?`)) {
      return;
    }
    setSchedule(schedule.filter(item => item.id !== id));
    showToast('info', 'Actividad Eliminada', `Se eliminó "${title}"`);
  };

  const handleEditClick = (item) => {
    const str = String(item.time || '').trim();
    const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    let h = "08";
    let m = "00";
    let p = "AM";
    if (match12) {
      h = match12[1].padStart(2, '0');
      m = match12[2];
      p = match12[3].toUpperCase();
    } else {
      const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) {
        let rawH = parseInt(match24[1], 10);
        m = match24[2];
        p = rawH >= 12 ? 'PM' : 'AM';
        if (rawH > 12) rawH -= 12;
        if (rawH === 0) rawH = 12;
        h = rawH.toString().padStart(2, '0');
      }
    }
    setEditingItem({ 
      ...item, 
      hour: h, 
      minute: m, 
      period: p,
      routineStatus: item.routineStatus || 'active',
      products: Array.isArray(item.products) ? item.products : extractRoutineProductsFromText(item.desc, item.title)
    });
    setEditProductDraft('');
    setEditProductDraftStatus('owned');
  };

  const handleSaveEdit = () => {
    if (!editingItem.title.trim()) return;
    setSchedule(schedule.map(item => item.id === editingItem.id ? editingItem : item));
    showToast('success', 'Actividad Actualizada', `Se guardó "${editingItem.title}"`);
    setEditingItem(null);
  };

  // Group by category and sort chronologically (with sanitized safety)
  const safeSchedule = sanitizeScheduleList(schedule);

  const matchesRoutineFilter = (item) => {
    if (!item) return false;
    if (routineFilter === 'active') return (item.routineStatus || 'active') === 'active';
    if (routineFilter === 'idea') return item.routineStatus === 'idea';
    if (routineFilter === 'to_buy') {
      const prods = Array.isArray(item.products) ? item.products : [];
      return prods.some(p => {
        const st = getEffectiveProductStatus(p);
        return st === 'to_buy' || st === 'to_try';
      });
    }
    if (routineFilter === 'to_try') {
      const prods = Array.isArray(item.products) ? item.products : [];
      return prods.some(p => getEffectiveProductStatus(p) === 'to_try');
    }
    if (routineFilter === 'never') {
      const prods = Array.isArray(item.products) ? item.products : [];
      return prods.some(p => getEffectiveProductStatus(p) === 'never');
    }
    return true;
  };

  const activeRoutineCount = safeSchedule.filter(i => (i.routineStatus || 'active') === 'active').length;
  const ideaRoutineCount = safeSchedule.filter(i => i.routineStatus === 'idea').length;
  const toBuyRoutineCount = safeSchedule.filter(i => (i.products || []).some(p => {
    const st = getEffectiveProductStatus(p);
    return st === 'to_buy' || st === 'to_try';
  })).length;
  const toTryRoutineCount = safeSchedule.filter(i => (i.products || []).some(p => getEffectiveProductStatus(p) === 'to_try')).length;
  const neverRoutineCount = safeSchedule.filter(i => (i.products || []).some(p => getEffectiveProductStatus(p) === 'never')).length;

  const filteredDailySchedule = safeSchedule.filter(matchesRoutineFilter);

  const buildFlexibleProductRegexPattern = (name = '') => {
    return String(name)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/['’]/g, "['’]")
      .replace(/\s+/g, '\\s+');
  };

  const renderInlineProductBadge = (item, prod, matchedText, key) => {
    const effStatus = getEffectiveProductStatus(prod);
    const isOwned = effStatus === 'owned';
    const isToBuy = effStatus === 'to_buy';
    const isToTry = effStatus === 'to_try';
    const isNever = effStatus === 'never';

    const isFilterHighlighted =
      (routineFilter === 'to_buy' && (isToBuy || isToTry)) ||
      (routineFilter === 'to_try' && isToTry) ||
      (routineFilter === 'never' && isNever);

    const statusBadgeMeta = isNever
      ? { icon: '🚫', label: 'No volver a usar', cls: 'bg-rose-950/60 border-rose-500/50 text-rose-200' }
      : isToTry
      ? { icon: '🧪', label: 'Por probar', cls: 'bg-violet-950/60 border-violet-400/50 text-violet-100' }
      : isToBuy
      ? { icon: '🛒', label: 'Por comprar', cls: 'bg-amber-950/60 border-amber-400/50 text-amber-100' }
      : { icon: '✅', label: 'Ya lo tengo', cls: 'bg-emerald-950/45 border-emerald-500/40 text-emerald-100' };

    return (
      <span
        key={key}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 my-0.5 rounded-md border text-[11px] leading-tight align-baseline transition-all ${statusBadgeMeta.cls} ${
          isFilterHighlighted ? 'ring-2 ring-[#e0a96d] shadow-md scale-[1.02]' : ''
        }`}
      >
        <span className={`font-semibold ${isNever ? 'line-through text-rose-300/85' : ''}`}>
          {matchedText || prod.name}
        </span>
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.2 rounded bg-black/25"
          title={`Estado actual: ${statusBadgeMeta.icon} ${statusBadgeMeta.label}`}
        >
          <span>{statusBadgeMeta.icon}</span>
        </span>
        <span className="inline-flex items-center gap-0.5 pl-1 border-l border-white/15">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSetRoutineProductStatus(item.id, prod.id, 'owned');
            }}
            title="✅ Ya lo tengo en casa"
            className={`px-0.5 rounded text-[10px] transition-all cursor-pointer ${
              isOwned ? 'bg-emerald-500/35 ring-1 ring-emerald-400/60' : 'opacity-40 hover:opacity-100 hover:bg-white/10'
            }`}
          >
            ✅
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSetRoutineProductStatus(item.id, prod.id, 'to_buy');
            }}
            title="🛒 Por comprar (sincroniza con Insumos)"
            className={`px-0.5 rounded text-[10px] transition-all cursor-pointer ${
              isToBuy ? 'bg-amber-500/35 ring-1 ring-amber-400/60' : 'opacity-40 hover:opacity-100 hover:bg-white/10'
            }`}
          >
            🛒
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSetRoutineProductStatus(item.id, prod.id, 'to_try');
            }}
            title="🧪 Por comprar y probar / Por probar"
            className={`px-0.5 rounded text-[10px] transition-all cursor-pointer ${
              isToTry ? 'bg-violet-500/35 ring-1 ring-violet-400/60' : 'opacity-40 hover:opacity-100 hover:bg-white/10'
            }`}
          >
            🧪
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSetRoutineProductStatus(item.id, prod.id, 'never');
            }}
            title="🚫 No volver a usar / comprar"
            className={`px-0.5 rounded text-[10px] transition-all cursor-pointer ${
              isNever ? 'bg-rose-500/40 ring-1 ring-rose-400/60' : 'opacity-40 hover:opacity-100 hover:bg-white/10'
            }`}
          >
            🚫
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveProductFromRoutine(item.id, prod);
            }}
            title={`Quitar "${prod.name}" de este paso de la rutina`}
            className={`ml-0.5 px-1 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-0.5 transition-all cursor-pointer ${
              isNever
                ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-sm'
                : 'text-slate-300/70 hover:text-rose-300 hover:bg-rose-500/20'
            }`}
          >
            <Trash2 className="w-2.5 h-2.5" />
            {isNever && <span>Quitar</span>}
          </button>
        </span>
      </span>
    );
  };

  const renderDescriptionWithInlineProducts = (item) => {
    const rawDesc = String(item?.desc || '');
    const itemProducts = Array.isArray(item?.products) ? item.products.filter(p => p && p.name) : [];
    if (!rawDesc) return { inlineNodes: null, unmatchedProducts: itemProducts };
    if (itemProducts.length === 0) {
      return { inlineNodes: rawDesc, unmatchedProducts: [] };
    }

    // Sort longest product names first so specific products match before shorter substrings
    const sortedProds = [...itemProducts].sort((a, b) => b.name.length - a.name.length);
    const patternParts = sortedProds
      .map(p => buildFlexibleProductRegexPattern(p.name))
      .filter(Boolean);

    if (patternParts.length === 0) {
      return { inlineNodes: rawDesc, unmatchedProducts: itemProducts };
    }

    const combinedRegex = new RegExp(`(${patternParts.join('|')})`, 'gi');
    const matchedProdIds = new Set();
    const nodes = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(rawDesc)) !== null) {
      const matchStart = match.index;
      const matchedStr = match[0];
      if (matchStart > lastIndex) {
        nodes.push(rawDesc.slice(lastIndex, matchStart));
      }

      const normMatched = normalizeProductText(matchedStr);
      const matchedProd =
        sortedProds.find(p => normalizeProductText(p.name) === normMatched) ||
        sortedProds.find(p => {
          const np = normalizeProductText(p.name);
          return np && (normMatched.includes(np) || np.includes(normMatched));
        });

      if (matchedProd) {
        matchedProdIds.add(matchedProd.id);
        nodes.push(renderInlineProductBadge(item, matchedProd, matchedStr, `${item.id}-inline-${matchStart}`));
      } else {
        nodes.push(matchedStr);
      }

      lastIndex = matchStart + matchedStr.length;
    }

    if (lastIndex < rawDesc.length) {
      nodes.push(rawDesc.slice(lastIndex));
    }

    const unmatchedProducts = itemProducts.filter(p => !matchedProdIds.has(p.id));
    return { inlineNodes: nodes, unmatchedProducts };
  };

  const dailySections = {
    morning: { 
      label: 'Mañana (05:00 AM - 11:59 AM)', 
      items: filteredDailySchedule
        .filter(i => i && (i.category === 'morning' || i.category === 'hygiene'))
        .sort((a, b) => getMinutesFromMidnight(a.time) - getMinutesFromMidnight(b.time))
    },
    afternoon: { 
      label: 'Tarde (12:00 PM - 06:59 PM)', 
      items: filteredDailySchedule
        .filter(i => i && i.category === 'afternoon')
        .sort((a, b) => getMinutesFromMidnight(a.time) - getMinutesFromMidnight(b.time))
    },
    night: { 
      label: 'Noche (07:00 PM - 04:59 AM)', 
      items: filteredDailySchedule
        .filter(i => i && i.category === 'night')
        .sort((a, b) => getNightSortMinutes(a.time) - getNightSortMinutes(b.time))
    }
  };

  // ==========================================
  // SELF-CARE CALENDAR LOGIC & CALCULATIONS
  // ==========================================
  const frequencyMeta = {
    weekly: { label: 'Semanal (7 días)', short: 'Semanal', days: 7, badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    biweekly: { label: 'Quincenal (15 días)', short: 'Quincenal', days: 15, badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    monthly: { label: 'Mensual (30 días)', short: 'Mensual', days: 30, badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    bimonthly: { label: 'Bimestral (60 días)', short: 'Cada 2 meses', days: 60, badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
    quarterly: { label: 'Trimestral (90 días)', short: 'Cada 3 meses', days: 90, badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    biannual: { label: 'Semestral (180 días)', short: 'Cada 6 meses', days: 180, badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    annual: { label: 'Anual (365 días)', short: 'Anual (Médico)', days: 365, badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    custom: { label: 'Personalizado', short: 'Personalizado', days: null, badge: 'bg-[#e0a96d]/15 text-[#e0a96d] border-[#e0a96d]/30' }
  };

  const getFrequencyDetails = (activity) => {
    if (activity.frequency === 'custom' || activity.customValue) {
      const val = Math.max(1, parseInt(activity.customValue, 10) || 1);
      const unit = activity.customUnit || 'days';
      let totalDays = val;
      let unitLabel = val === 1 ? 'día' : 'días';
      if (unit === 'days') {
        totalDays = val;
        unitLabel = val === 1 ? 'día' : 'días';
      } else if (unit === 'weeks') {
        totalDays = val * 7;
        unitLabel = val === 1 ? 'semana' : 'semanas';
      } else if (unit === 'months') {
        totalDays = val * 30;
        unitLabel = val === 1 ? 'mes' : 'meses';
      } else if (unit === 'years') {
        totalDays = val * 365;
        unitLabel = val === 1 ? 'año' : 'años';
      }
      return {
        label: `Cada ${val} ${unitLabel} (${totalDays}d)`,
        short: `Cada ${val} ${unitLabel}`,
        days: activity.daysInterval || totalDays,
        badge: 'bg-[#e0a96d]/15 text-[#e0a96d] border-[#e0a96d]/30'
      };
    }
    return frequencyMeta[activity.frequency] || frequencyMeta.monthly;
  };

  const categoryIcons = {
    beauty: '💅',
    wellness: '💆‍♀️',
    hair: '✂️',
    health: '🩺',
    other: '✨'
  };

  const getSelfCareStatus = (activity) => {
    const freqInfo = getFrequencyDetails(activity);
    const interval = activity.daysInterval || freqInfo.days || 30;
    if (!activity.lastCompletedDate) {
      return {
        status: 'pending_first',
        label: 'Pendiente de inicio',
        badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
        daysRemaining: null,
        daysElapsed: null,
        nextDueDateStr: 'Sin registro previo',
        nextDueDateFullStr: 'Sin registro previo',
        lastDateStr: 'Nunca',
        lastDateFullStr: 'Nunca',
        percentCycle: 0
      };
    }

    const todayStr = getLocalDateString();
    const daysElapsed = Math.max(0, getDaysDifference(activity.lastCompletedDate, todayStr));
    const daysRemaining = interval - daysElapsed;

    const nextDueDateObj = calculateNextDueDate(activity.lastCompletedDate, interval);
    const nextDueDateStr = nextDueDateObj ? formatDisplayDate(nextDueDateObj) : 'Fecha no definida';
    const nextDueDateFullStr = nextDueDateObj ? formatFullDisplayDate(nextDueDateObj) : 'Fecha no definida';
    
    const lastDateStr = formatDisplayDate(activity.lastCompletedDate);
    const lastDateFullStr = formatFullDisplayDate(activity.lastCompletedDate);

    const percentCycle = Math.min(100, Math.max(0, Math.round((daysElapsed / interval) * 100)));

    if (daysRemaining < 0) {
      const overdueDays = Math.abs(daysRemaining);
      return {
        status: 'overdue',
        label: `Vencido hace ${overdueDays} d`,
        fullLabel: `Vencido hace ${overdueDays} día${overdueDays === 1 ? '' : 's'}`,
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        daysRemaining,
        daysElapsed,
        nextDueDateStr,
        nextDueDateFullStr,
        lastDateStr,
        lastDateFullStr,
        percentCycle: 100,
        isUrgent: true
      };
    }

    if (daysRemaining <= 3) {
      return {
        status: 'due_soon',
        label: daysRemaining === 0 ? '¡Toca Hoy!' : `Vence en ${daysRemaining} d`,
        fullLabel: daysRemaining === 0 ? '¡Toca realizarlo hoy!' : `Vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}`,
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        daysRemaining,
        daysElapsed,
        nextDueDateStr,
        nextDueDateFullStr,
        lastDateStr,
        lastDateFullStr,
        percentCycle,
        isDueSoon: true
      };
    }

    return {
      status: 'good',
      label: `Al día (${daysRemaining} d)`,
      fullLabel: `Al día (próximo: ${nextDueDateStr})`,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      daysRemaining,
      daysElapsed,
      nextDueDateStr,
      nextDueDateFullStr,
      lastDateStr,
      lastDateFullStr,
      percentCycle
    };
  };

  const handleUpdateSelfCareDate = (id, newDate, title) => {
    const targetDate = newDate || getLocalDateString();
    const updated = (selfCareActivities || []).map(item => {
      if (item.id === id) {
        return { ...item, lastCompletedDate: targetDate };
      }
      return item;
    });
    setSelfCareActivities(updated);

    const targetItem = (selfCareActivities || []).find(a => a.id === id);
    const actTitle = title || targetItem?.title || 'Actividad';
    const formatted = formatFullDisplayDate(targetDate);
    
    // Calculate next date for the toast message
    const freqInfo = targetItem ? getFrequencyDetails(targetItem) : { days: 30 };
    const interval = targetItem?.daysInterval || freqInfo.days || 30;
    const nextDateObj = calculateNextDueDate(targetDate, interval);
    const nextFormatted = nextDateObj ? formatFullDisplayDate(nextDateObj) : 'Próximamente';

    showToast(
      'success',
      '¡Fecha Actualizada!',
      `"${actTitle}": Realizado el ${formatted}. Próxima sesión: ${nextFormatted}.`
    );
  };

  const handleMarkSelfCareCompletedToday = (id, title) => {
    handleUpdateSelfCareDate(id, getLocalDateString(), title);
  };

  const executeSaveSelfCareActivity = (trimmedTitle) => {
    let days = 30;
    if (scFrequency === 'custom') {
      const val = Math.max(1, parseInt(scCustomValue, 10) || 1);
      if (scCustomUnit === 'days') days = val;
      else if (scCustomUnit === 'weeks') days = val * 7;
      else if (scCustomUnit === 'months') days = val * 30;
      else if (scCustomUnit === 'years') days = val * 365;
    } else {
      days = frequencyMeta[scFrequency]?.days || 30;
    }

    const newItem = {
      id: 'sc-' + Date.now(),
      title: trimmedTitle,
      frequency: scFrequency,
      daysInterval: days,
      customValue: scFrequency === 'custom' ? (parseInt(scCustomValue, 10) || 1) : null,
      customUnit: scFrequency === 'custom' ? scCustomUnit : null,
      lastCompletedDate: scLastDate || null,
      category: scCategory,
      notes: scNotes.trim(),
      protocol: scProtocol.trim()
    };

    setSelfCareActivities([...selfCareActivities, newItem]);
    setScTitle('');
    setScNotes('');
    setScProtocol('');
    setScFrequency('weekly');
    setScCustomValue(1);
    setScCustomUnit('weeks');
    setScLastDate(getLocalDateString());
    setIsAddingSelfCare(false);
    setSimilarPrompt(null);
    showToast('success', 'Actividad Registrada', `Se añadió "${newItem.title}" al calendario de autocuidado.`);
  };

  const handleAddSelfCare = (e) => {
    e.preventDefault();
    const trimmedTitle = scTitle.trim();
    if (!trimmedTitle) return;

    // Scan for duplicate/similar activities before adding manually
    const similar = findSimilarity(trimmedTitle, selfCareActivities, 'title');
    if (similar) {
      setSimilarPrompt({
        kind: 'selfcare',
        description: 'Ya tienes una actividad similar en tu calendario de autocuidado:',
        existingLabel: 'Actividad existente',
        existingName: similar.title || '',
        existingMeta: `Cada ${similar.daysInterval || 2} días`,
        existingNotes: similar.protocol || similar.notes || '',
        newLabel: 'Nueva actividad',
        newName: trimmedTitle,
        newMeta: scCategory
      });
      return;
    }

    executeSaveSelfCareActivity(trimmedTitle);
  };

  const handleDeleteSelfCare = (id, title) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la actividad de autocuidado "${title || 'esta actividad'}"?`)) {
      return;
    }
    setSelfCareActivities(selfCareActivities.filter(a => a.id !== id));
    showToast('info', 'Actividad Eliminada', `Se eliminó "${title}" del calendario.`);
  };

  const handleSaveEditSelfCare = () => {
    if (!editingSelfCareItem?.title?.trim()) return;
    let days = 30;
    if (editingSelfCareItem.frequency === 'custom') {
      const val = Math.max(1, parseInt(editingSelfCareItem.customValue, 10) || 1);
      const unit = editingSelfCareItem.customUnit || 'days';
      if (unit === 'days') days = val;
      else if (unit === 'weeks') days = val * 7;
      else if (unit === 'months') days = val * 30;
      else if (unit === 'years') days = val * 365;
    } else {
      days = frequencyMeta[editingSelfCareItem.frequency]?.days || editingSelfCareItem.daysInterval || 30;
    }

    const updated = selfCareActivities.map(a => 
      a.id === editingSelfCareItem.id 
        ? { 
            ...editingSelfCareItem, 
            daysInterval: days,
            customValue: editingSelfCareItem.frequency === 'custom' ? (parseInt(editingSelfCareItem.customValue, 10) || 1) : null,
            customUnit: editingSelfCareItem.frequency === 'custom' ? (editingSelfCareItem.customUnit || 'days') : null
          } 
        : a
    );
    setSelfCareActivities(updated);
    showToast('success', 'Actividad Actualizada', `Se guardaron los cambios de "${editingSelfCareItem.title}".`);
    setEditingSelfCareItem(null);
  };

  // Safe normalized self-care list & filters
  const safeSelfCare = sanitizeSelfCareList(selfCareActivities);

  // Filter self-care activities
  const filteredSelfCare = safeSelfCare.filter(item => {
    if (!item) return false;
    if (selfCareFilter === 'all') return true;
    if (selfCareFilter === 'weekly') return item.frequency === 'weekly' || item.frequency === 'biweekly';
    if (selfCareFilter === 'monthly') return item.frequency === 'monthly' || item.frequency === 'bimonthly';
    if (selfCareFilter === 'quarterly') return item.frequency === 'quarterly' || item.frequency === 'biannual';
    if (selfCareFilter === 'annual') return item.frequency === 'annual';
    if (selfCareFilter === 'custom') return item.frequency === 'custom' || !!item.customValue;
    return true;
  });

  // Sort self-care activities by urgency:
  // 1. Pending first or Overdue (ordered by most overdue first: -185d before -2d)
  // 2. Due today (0 days remaining)
  // 3. Due soon / upcoming in ascending days remaining (1d, 2d, 5d, 30d, 365d)
  const sortedSelfCare = [...filteredSelfCare].sort((a, b) => {
    const stA = getSelfCareStatus(a);
    const stB = getSelfCareStatus(b);

    const getSortWeight = (st) => {
      if (st.status === 'pending_first' || st.daysRemaining === null || isNaN(st.daysRemaining)) {
        return -999999;
      }
      return st.daysRemaining;
    };

    return getSortWeight(stA) - getSortWeight(stB);
  });

  // Calculate self-care global metrics
  const pendingSelfCareAlerts = safeSelfCare.filter(a => {
    if (!a) return false;
    const st = getSelfCareStatus(a);
    return st.isUrgent || st.isDueSoon || st.status === 'pending_first';
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Module Tabs */}
      <div className="flex flex-wrap border-b border-[#e0a96d]/15 gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`py-2.5 px-5 font-outfit text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'daily' 
              ? 'border-[#e0a96d] text-[#e0a96d]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>⏰ Mi Rutina Diaria</span>
        </button>

        <button
          onClick={() => setActiveTab('selfcare')}
          className={`py-2.5 px-5 font-outfit text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 relative ${
            activeTab === 'selfcare' 
              ? 'border-[#e0a96d] text-[#e0a96d]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#e0a96d]" />
          <span>🌿 Calendario de Autocuidado</span>
          {pendingSelfCareAlerts.length > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded-full font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {pendingSelfCareAlerts.length} pendiente{pendingSelfCareAlerts.length === 1 ? '' : 's'}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bag')}
          className={`py-2.5 px-5 font-outfit text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 relative ${
            activeTab === 'bag' 
              ? 'border-[#e0a96d] text-[#e0a96d]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-[#e0a96d]" />
          <span>🎒 Bolso & Cosas para Salir</span>
          <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold border ${
            bagEssentials.filter(i => i.packed).length === bagEssentials.length && bagEssentials.length > 0
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-[#11131a] text-slate-300 border-slate-700'
          }`}>
            {bagEssentials.filter(i => i.packed).length}/{bagEssentials.length}
          </span>
        </button>
      </div>

      {/* ========================================== */}
      {/* VIEW: DAILY ROUTINE (CRONOGRAMA) */}
      {/* ========================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Smart Self-Care Alert Banner in Daily View */}
          {pendingSelfCareAlerts.length > 0 && (
            <div className="bg-gradient-to-r from-[#171a24] via-[#1f1a24] to-[#171a24] border border-[#e0a96d]/25 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#e0a96d]/10 border border-[#e0a96d]/30 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-[#e0a96d]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-[#e0a96d] tracking-wider">
                      Autocuidado Periódico de Hoy
                    </span>
                    <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/25 px-1.5 py-0.2 rounded font-semibold">
                      {pendingSelfCareAlerts.length} sugerencia{pendingSelfCareAlerts.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 font-outfit mt-0.5">
                    {pendingSelfCareAlerts[0].title} — <span className="text-slate-300 font-normal">{getSelfCareStatus(pendingSelfCareAlerts[0]).label}</span>
                  </h4>
                  {pendingSelfCareAlerts[0].protocol && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {pendingSelfCareAlerts[0].protocol}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleMarkSelfCareCompletedToday(pendingSelfCareAlerts[0].id, pendingSelfCareAlerts[0].title)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Realizado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('selfcare')}
                  className="btn-rose-gold text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                >
                  <span>Ver Calendario</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Exit Checklist Reminder in Daily View */}
          <div className="bg-[#171a24] border border-[#e0a96d]/20 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#e0a96d]/10 border border-[#e0a96d]/25 text-[#e0a96d] shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <span>Cosas para Salir (Bolso & EDC)</span>
                  <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold border ${
                    bagEssentials.filter(i => i.packed).length === bagEssentials.length && bagEssentials.length > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-[#e0a96d]/20 text-[#e0a96d] border-[#e0a96d]/30'
                  }`}>
                    {bagEssentials.filter(i => i.packed).length} de {bagEssentials.length} listas
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Asegúrate de llevar tus 18 cosas esenciales antes de salir (llaves, tarjetas, dinero, cargador, lentes, etc.).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('bag')}
              className="btn-rose-gold text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
            >
              <span>Revisar Bolso</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Profiler and Water Intake Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Profile Card */}
            <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#e0a96d]/10 text-[#e0a96d]">
                    <Ruler className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 font-outfit">Perfil Antropométrico</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Peso Corporal (kg)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setWeight(val);
                        }}
                        className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-[#e0a96d] transition-colors"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-500">kg</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Estatura (m)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={height}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setHeight(val);
                        }}
                        className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-[#e0a96d] transition-colors"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-500">m</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b0c10] border border-[#e0a96d]/10 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Índice de Masa Corporal (IMC)</span>
                  <span className="text-2xl font-extrabold text-[#e0a96d] font-outfit">{imc} kg/m²</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Estado</span>
                  <span className={`text-sm font-bold ${imcStatus.color}`}>{imcStatus.label}</span>
                </div>
              </div>
            </div>

            {/* Water Hydration Card */}
            <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-[#e0a96d]/5 pointer-events-none transition-all duration-700" 
                style={{ height: `${waterPercent}%` }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#e0a96d]/10 text-[#e0a96d]">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 font-outfit">Consumo Hídrico Diario</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium bg-[#0b0c10] border border-[#e0a96d]/15 px-2.5 py-1 rounded-full">
                    Meta: {(waterGoal / 1000).toFixed(2)} L ({waterGoal} ml)
                  </span>
                </div>

                <div className="flex justify-between items-baseline mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#e0a96d] font-outfit">{waterIntake}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ {waterGoal} ml</span>
                  </div>
                  <span className="text-sm font-bold text-[#e0a96d]">{waterPercent}%</span>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full bg-[#0b0c10] h-3 rounded-full overflow-hidden mb-5 border border-[#e0a96d]/10">
                  <div 
                    className="bg-gradient-to-r from-[#e0a96d] to-[#f5d4af] h-full progress-bar-transition rounded-full"
                    style={{ width: `${waterPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 relative z-10">
                <button
                  onClick={() => {
                    setWaterIntake(waterIntake + 250);
                    showToast('info', 'Consumo de Agua', 'Añadido +250 ml de agua');
                  }}
                  className="bg-[#0b0c10] border border-[#e0a96d]/20 hover:border-[#e0a96d]/50 hover:bg-[#e0a96d]/5 text-slate-200 text-xs font-semibold py-2 px-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1"
                >
                  <span>+250 ml</span>
                  <span className="text-[10px] text-slate-500 font-normal">Taza chica</span>
                </button>
                <button
                  onClick={() => {
                    setWaterIntake(waterIntake + 500);
                    showToast('info', 'Consumo de Agua', 'Añadido +500 ml de agua');
                  }}
                  className="bg-[#0b0c10] border border-[#e0a96d]/20 hover:border-[#e0a96d]/50 hover:bg-[#e0a96d]/5 text-slate-200 text-xs font-semibold py-2 px-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1"
                >
                  <span>+500 ml</span>
                  <span className="text-[10px] text-slate-500 font-normal">Vaso termo</span>
                </button>
                <button
                  onClick={() => {
                    setWaterIntake(0);
                    showToast('warning', 'Consumo Reiniciado', 'Se ha restablecido el contador de agua');
                  }}
                  className="bg-[#0b0c10] border border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-400 text-xs font-semibold py-2 px-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
                  aria-label="Reiniciar contador de agua"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

          </div>

          {/* Routine Timeline */}
          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 font-outfit">Cronograma de Rutina Diaria</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Distingue entre pasos que <strong>ya aplicas</strong> y <strong>sugerencias/ideas por aplicar</strong>, y controla el estado de cada producto (✅ Ya lo tengo, 🛒 Por comprar, 🚫 No volver a usar).
                </p>
              </div>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Actividad / Idea</span>
              </button>
            </div>

            {/* Copilot IA Quick Product Integration Bar */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0b0c10] via-[#141722] to-[#0b0c10] border border-[#e0a96d]/25 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e0a96d]/15 border border-[#e0a96d]/30 flex items-center justify-center text-[#e0a96d] shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100 block">
                    🧴 ¿Compraste un producto nuevo o quieres integrar uno a tu rutina?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Dile a <strong>Copilot IA</strong> qué compraste y te recomendará a qué hora, en qué paso y orden agregarlo sin chocar con otros activos.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <input
                  type="text"
                  value={copilotProductInput}
                  onChange={(e) => setCopilotProductInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && copilotProductInput.trim() && onAskCopilotProduct) {
                      e.preventDefault();
                      onAskCopilotProduct(`Compré este nuevo producto: "${copilotProductInput.trim()}". ¿Cómo, a qué hora y en qué paso de mi rutina diaria me recomiendas agregarlo?`);
                      setCopilotProductInput('');
                    }
                  }}
                  placeholder="Ej. Sérum de Vitamina C, Ácido Glicólico, Contorno de ojos..."
                  className="flex-1 lg:w-64 bg-[#171a24] border border-[#e0a96d]/25 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-[#e0a96d]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const prodText = copilotProductInput.trim();
                    const promptToSend = prodText
                      ? `Compré este nuevo producto: "${prodText}". ¿Cómo, a qué hora y en qué paso de mi rutina diaria me recomiendas agregarlo?`
                      : 'Compré un producto nuevo y quiero que me recomiendes en qué paso y horario de mi rutina diaria agregarlo.';
                    if (onAskCopilotProduct) {
                      onAskCopilotProduct(promptToSend);
                      setCopilotProductInput('');
                    } else if (setActiveModule) {
                      setActiveModule('copilot');
                    }
                  }}
                  className="btn-rose-gold text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recomendar en Copilot IA</span>
                </button>
              </div>
            </div>

            {/* Filter Bar for Routine Steps & Product States */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRoutineFilter('all')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    routineFilter === 'all'
                      ? 'bg-[#e0a96d]/20 text-[#e0a96d] border-[#e0a96d]/40'
                      : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Todas ({safeSchedule.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoutineFilter('active')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    routineFilter === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-emerald-300'
                  }`}
                >
                  <span>✅ Aplicando ({activeRoutineCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoutineFilter('idea')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    routineFilter === 'idea'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-amber-300'
                  }`}
                >
                  <span>💡 Sugerencias / Aún no aplico ({ideaRoutineCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoutineFilter('to_buy')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    routineFilter === 'to_buy'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-sky-300'
                  }`}
                >
                  <span>🛒 Con productos por comprar ({toBuyRoutineCount})</span>
                </button>
                {toTryRoutineCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setRoutineFilter('to_try')}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      routineFilter === 'to_try'
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                        : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-violet-300'
                    }`}
                  >
                    <span>🧪 Por probar ({toTryRoutineCount})</span>
                  </button>
                )}
                {neverRoutineCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setRoutineFilter('never')}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      routineFilter === 'never'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-[#0b0c10] text-rose-400/80 border-rose-500/25 hover:text-rose-300'
                    }`}
                  >
                    <span>🚫 Con productos a quitar ({neverRoutineCount})</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="text-emerald-400">✅</span> Ya lo tengo</span>
                <span className="flex items-center gap-1"><span className="text-amber-400">🛒</span> Por comprar</span>
                <span className="flex items-center gap-1"><span className="text-violet-400">🧪</span> Por probar</span>
                <span className="flex items-center gap-1"><span className="text-rose-400">🚫</span> No volver a usar</span>
              </div>
            </div>

            {/* Add Form Container */}
            {isAdding && (
              <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Hora</label>
                    <div className="flex gap-1.5">
                      <select
                        value={newHour}
                        onChange={(e) => setNewHour(e.target.value)}
                        className="flex-1 bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-1 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      
                      <span className="text-slate-400 self-center font-bold text-xs">:</span>

                      <select
                        value={newMinute}
                        onChange={(e) => setNewMinute(e.target.value)}
                        className="flex-1 bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-1 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                      >
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>

                      <select
                        value={newPeriod}
                        onChange={(e) => setNewPeriod(e.target.value)}
                        className="flex-1 bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-1 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Título de la Actividad o Idea</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ej. Estiramiento matutino o Aplicar Tónico de Ácido Glicólico"
                      className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                      required
                    />
                    {(() => {
                      const sim = findSimilarity(newTitle, schedule, 'title');
                      if (!sim) return null;
                      return (
                        <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5 animate-fade-in">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                          <span>
                            Probablemente esta actividad ya existe como <strong>"{sim.title}"</strong> ({sim.time}).
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Routine Status Selector (Active vs Idea/Suggestion) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">¿Ya aplicas este paso o es una idea/sugerencia?</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRoutineStatus('active')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          newRoutineStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#171a24] text-slate-400 border-slate-800'
                        }`}
                      >
                        <span>✅ Ya lo aplico</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRoutineStatus('idea')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          newRoutineStatus === 'idea'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-[#171a24] text-slate-400 border-slate-800'
                        }`}
                      >
                        <span>💡 Sugerencia / Idea por aplicar</span>
                      </button>
                    </div>
                  </div>

                  {/* Optional Product Adder */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Productos que usa este paso (Opcional)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newProductDraft}
                        onChange={(e) => setNewProductDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newProductDraft.trim()) {
                            e.preventDefault();
                            setNewProductsList(prev => [
                              ...prev,
                              { id: 'rp-' + Date.now(), name: newProductDraft.trim(), status: newProductDraftStatus, manualOverride: true }
                            ]);
                            setNewProductDraft('');
                          }
                        }}
                        placeholder="Ej. Sérum Niacinamida..."
                        className="flex-1 bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                      />
                      <select
                        value={newProductDraftStatus}
                        onChange={(e) => setNewProductDraftStatus(e.target.value)}
                        className="bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-1.5 px-2 text-slate-100 text-[11px] focus:outline-none cursor-pointer"
                      >
                        <option value="owned">✅ Lo tengo</option>
                        <option value="to_buy">🛒 Por comprar</option>
                        <option value="to_try">🧪 Por probar</option>
                        <option value="never">🚫 No usar</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newProductDraft.trim()) return;
                          setNewProductsList(prev => [
                            ...prev,
                            { id: 'rp-' + Date.now(), name: newProductDraft.trim(), status: newProductDraftStatus, manualOverride: true }
                          ]);
                          setNewProductDraft('');
                        }}
                        className="bg-[#e0a96d]/20 hover:bg-[#e0a96d]/30 text-[#e0a96d] border border-[#e0a96d]/30 px-2.5 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    {newProductsList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {newProductsList.map((p) => (
                          <span key={p.id} className="inline-flex items-center gap-1 text-[10px] bg-[#171a24] border border-slate-700 px-2 py-0.5 rounded-full text-slate-200">
                            <span>{p.status === 'owned' ? '✅' : p.status === 'to_buy' ? '🛒' : '🚫'}</span>
                            <span>{p.name}</span>
                            <button
                              type="button"
                              onClick={() => setNewProductsList(prev => prev.filter(x => x.id !== p.id))}
                              className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción / Método</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Ej. Abrazo de rodillas 30s, Gato-vaca..."
                    className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-20 resize-none"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block mb-1">Fase Asignada (Auto)</span>
                    <span className="inline-block text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#e0a96d]/10 border border-[#e0a96d]/30 text-[#e0a96d] uppercase tracking-wider">
                      {(() => {
                        const cat = calculateCategory(newHour, newMinute, newPeriod);
                        return cat === 'morning' ? 'Mañana' : cat === 'afternoon' ? 'Tarde' : 'Noche';
                      })()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                    >
                      Programar
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Timeline List */}
            <div className="space-y-6">
              {Object.entries(dailySections).map(([key, section]) => (
                <div key={key} className="space-y-3">
                  <h4 className="text-xs font-bold text-[#e0a96d] tracking-wider uppercase bg-[#0b0c10] px-3 py-1.5 rounded-lg border border-[#e0a96d]/10">
                    {section.label}
                  </h4>
                  
                  {section.items.length === 0 ? (
                    <p className="text-xs text-slate-500 italic pl-3">No hay actividades registradas para este filtro en esta fase.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {section.items.map((item) => {
                        const isIdea = item.routineStatus === 'idea';

                        return (
                          <div 
                            key={item.id} 
                            className={`p-3.5 rounded-xl flex flex-col gap-2.5 transition-all border ${
                              item.completed 
                                ? 'bg-[#0b0c10]/40 border-slate-800/40 opacity-60' 
                                : isIdea
                                ? 'bg-[#0b0c10]/80 border-amber-500/25 hover:border-amber-500/45'
                                : 'bg-[#0b0c10] border-[#e0a96d]/10 hover:border-[#e0a96d]/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Checkbox */}
                                <button
                                  onClick={() => handleToggleComplete(item.id)}
                                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                                    item.completed 
                                      ? 'bg-[#e0a96d] border-[#e0a96d] text-[#0b0c10]' 
                                      : 'border-slate-600 hover:border-[#e0a96d]'
                                  }`}
                                  aria-label={`Marcar ${item.title} como ${item.completed ? 'incompleta' : 'completa'}`}
                                >
                                  {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-[#e0a96d] font-outfit">{item.time}</span>
                                    <h5 className={`text-sm font-semibold text-slate-200 ${item.completed ? 'line-through text-slate-500' : ''}`}>
                                      {item.title}
                                    </h5>

                                    {/* Routine Active vs Suggestion/Idea Toggle Pill */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRoutineStatus(item.id)}
                                      title="Haz clic para alternar entre 'Ya lo aplico' y 'Sugerencia / Idea que aún no aplico'"
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                                        isIdea
                                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                                      }`}
                                    >
                                      {isIdea ? (
                                        <>
                                          <Lightbulb className="w-3 h-3" />
                                          <span>Sugerencia / Aún no aplico</span>
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3 h-3" />
                                          <span>Aplicando</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {(() => {
                                    const { inlineNodes, unmatchedProducts } = renderDescriptionWithInlineProducts(item);
                                    return (
                                      <>
                                        {item.desc && (
                                          <div className={`text-xs text-slate-300 mt-1.5 whitespace-pre-line leading-7 ${item.completed ? 'text-slate-600' : ''}`}>
                                            {inlineNodes}
                                          </div>
                                        )}

                                        {/* Extra products not literally inside desc + Quick inline button to add a product */}
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                          {unmatchedProducts.map((prod) =>
                                            renderInlineProductBadge(item, prod, prod.name, `${item.id}-extra-${prod.id}`)
                                          )}

                                          {inlineAddProductItemId === item.id ? (
                                            <div className="inline-flex items-center gap-1 bg-[#171a24] border border-[#e0a96d]/40 rounded-lg p-1">
                                              <input
                                                type="text"
                                                value={inlineProductName}
                                                onChange={(e) => setInlineProductName(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddInlineProductToRoutine(item.id);
                                                  } else if (e.key === 'Escape') {
                                                    setInlineAddProductItemId(null);
                                                  }
                                                }}
                                                placeholder="Nombre del producto..."
                                                className="bg-[#0b0c10] border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-100 w-36 focus:outline-none focus:border-[#e0a96d]"
                                                autoFocus
                                              />
                                              <select
                                                value={inlineProductStatus}
                                                onChange={(e) => setInlineProductStatus(e.target.value)}
                                                className="bg-[#0b0c10] border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 cursor-pointer"
                                              >
                                                <option value="owned">✅ Lo tengo</option>
                                                <option value="to_buy">🛒 Por comprar</option>
                                                <option value="to_try">🧪 Por probar</option>
                                                <option value="never">🚫 No usar</option>
                                              </select>
                                              <button
                                                type="button"
                                                onClick={() => handleAddInlineProductToRoutine(item.id)}
                                                className="bg-[#e0a96d] text-[#0b0c10] font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer"
                                              >
                                                Guardar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setInlineAddProductItemId(null);
                                                  setInlineProductName('');
                                                }}
                                                className="text-slate-400 hover:text-slate-200 px-1 text-xs cursor-pointer"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setInlineAddProductItemId(item.id);
                                                setInlineProductName('');
                                                setInlineProductStatus('owned');
                                              }}
                                              className="text-[10px] font-semibold text-slate-400 hover:text-[#e0a96d] bg-[#171a24]/60 hover:bg-[#171a24] border border-dashed border-slate-700 hover:border-[#e0a96d]/40 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                              title="Agregar un producto o idea a este paso de la rutina"
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span>Producto</span>
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleEditClick(item)}
                                  className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                                  title="Editar actividad"
                                  aria-label={`Editar ${item.title}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.title)}
                                  className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                                  title="Eliminar actividad"
                                  aria-label={`Eliminar ${item.title}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW: SELF-CARE CALENDAR (PERIODIC CARE) */}
      {/* ========================================== */}
      {activeTab === 'selfcare' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Hero Header & Metrics */}
          <div className="bg-[#171a24] border border-[#e0a96d]/20 p-6 rounded-2xl relative overflow-hidden shadow-xl">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#e0a96d]/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-[#e0a96d]/10 border border-[#e0a96d]/25 text-[#e0a96d]">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-[#e0a96d] uppercase tracking-wider font-mono">
                    AURA Health & Self-Care Protocol
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 font-outfit">
                  Calendario de Autocuidado & Salud Preventiva
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Monitorea tus rituales semanales, mensuales, trimestrales y chequeos médicos anuales. El sistema calcula automáticamente los días transcurridos y te avisa cuándo toca tu próxima sesión.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSelfCare(!isAddingSelfCare)}
                  className="btn-rose-gold text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Actividad</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
              <div className="p-3 bg-[#0b0c10] border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Total Actividades</span>
                <span className="text-lg font-bold text-slate-100 font-outfit">
                  {selfCareActivities.length}
                </span>
              </div>
              <div className="p-3 bg-[#0b0c10] border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Al Día (Al Corriente)</span>
                <span className="text-lg font-bold text-emerald-400 font-outfit">
                  {selfCareActivities.filter(a => getSelfCareStatus(a).status === 'good').length}
                </span>
              </div>
              <div className="p-3 bg-[#0b0c10] border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Próximas a Vencer</span>
                <span className="text-lg font-bold text-amber-400 font-outfit">
                  {selfCareActivities.filter(a => getSelfCareStatus(a).status === 'due_soon').length}
                </span>
              </div>
              <div className="p-3 bg-[#0b0c10] border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Vencidas / Pendientes</span>
                <span className="text-lg font-bold text-rose-400 font-outfit">
                  {selfCareActivities.filter(a => getSelfCareStatus(a).status === 'overdue' || getSelfCareStatus(a).status === 'pending_first').length}
                </span>
              </div>
            </div>
          </div>

          {/* Add Self-Care Activity Form */}
          {isAddingSelfCare && (
            <form onSubmit={handleAddSelfCare} className="bg-[#171a24] border border-[#e0a96d]/25 p-6 rounded-2xl space-y-4 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-sm font-bold text-slate-100 font-outfit flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#e0a96d]" />
                  <span>Nueva Actividad de Autocuidado Periódico</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingSelfCare(false)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre de la Actividad</label>
                  <input
                    type="text"
                    placeholder="Ej. Drenaje Linfático Facial, Sesión de Podología..."
                    value={scTitle}
                    onChange={(e) => setScTitle(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                    required
                  />
                  {(() => {
                    const sim = findSimilarity(scTitle, selfCareActivities, 'title');
                    if (!sim) return null;
                    return (
                      <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5 animate-fade-in">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                        <span>
                          Probablemente esta actividad ya existe como <strong>"{sim.title}"</strong> ({sim.protocol || 'Ciclo de ' + (sim.daysInterval || 7) + 'd'}).
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Frecuencia / Ciclo</label>
                  <select
                    value={scFrequency}
                    onChange={(e) => setScFrequency(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    <option value="weekly">Semanal (7 días)</option>
                    <option value="biweekly">Quincenal (15 días)</option>
                    <option value="monthly">Mensual (30 días)</option>
                    <option value="bimonthly">Bimestral (60 días / Cada 2 meses)</option>
                    <option value="quarterly">Trimestral (Cada 3 meses / 90d)</option>
                    <option value="biannual">Semestral (Cada 6 meses / 180d)</option>
                    <option value="annual">Anual (Prevención Médica / 365d)</option>
                    <option value="custom">✨ Personalizado (X días / semanas / meses / años)</option>
                  </select>
                </div>

                {scFrequency === 'custom' && (
                  <div className="sm:col-span-3 p-3.5 bg-[#0b0c10] border border-[#e0a96d]/30 rounded-xl space-y-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#e0a96d]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Definir Intervalo Personalizado:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Cada:</span>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={scCustomValue}
                          onChange={(e) => setScCustomValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-20 bg-[#171a24] border border-[#e0a96d]/40 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs text-center font-bold focus:outline-none focus:border-[#e0a96d]"
                        />
                        <select
                          value={scCustomUnit}
                          onChange={(e) => setScCustomUnit(e.target.value)}
                          className="bg-[#171a24] border border-[#e0a96d]/40 rounded-lg py-1.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                        >
                          <option value="days">Día(s)</option>
                          <option value="weeks">Semana(s)</option>
                          <option value="months">Mes(es)</option>
                          <option value="years">Año(s)</option>
                        </select>
                      </div>
                      <div className="text-xs text-slate-400">
                        ⚡ Ciclo estimado:{' '}
                        <strong className="text-[#e0a96d] font-mono">
                          {scCustomUnit === 'days' && `${scCustomValue} día(s)`}
                          {scCustomUnit === 'weeks' && `${scCustomValue * 7} días (${scCustomValue} sem)`}
                          {scCustomUnit === 'months' && `${scCustomValue * 30} días (~${scCustomValue} mes${scCustomValue > 1 ? 'es' : ''})`}
                          {scCustomUnit === 'years' && `${scCustomValue * 365} días (${scCustomValue} año${scCustomValue > 1 ? 's' : ''})`}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
                  <select
                    value={scCategory}
                    onChange={(e) => setScCategory(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    <option value="beauty">💅 Belleza & Manos</option>
                    <option value="wellness">💆‍♀️ Bienestar & Masajes</option>
                    <option value="hair">✂️ Capilar & Cejas</option>
                    <option value="health">🩺 Salud & Prevención Médica</option>
                    <option value="other">✨ Otro Ritual</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-400">Fecha de Última Realización</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setScLastDate(getLocalDateString())}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                        title="Hoy"
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => setScLastDate(getYesterdayDateString())}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                        title="Ayer"
                      >
                        Ayer
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={scLastDate}
                    onChange={(e) => setScLastDate(e.target.value)}
                    onClick={(e) => e.target.showPicker?.()}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer font-medium"
                  />
                </div>

                {/* Live Preview Box for Add Form */}
                <div className="sm:col-span-3 p-3 bg-[#0b0c10] border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#e0a96d]" /> Última fecha:
                    </span>
                    <strong className="text-slate-200">{formatFullDisplayDate(scLastDate)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                    <span className="text-[#e0a96d] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Próxima sesión calculada:
                    </span>
                    <strong className="text-[#e0a96d] font-bold font-outfit">
                      {(() => {
                        let days = 30;
                        if (scFrequency === 'custom') {
                          const val = Math.max(1, parseInt(scCustomValue, 10) || 1);
                          if (scCustomUnit === 'days') days = val;
                          else if (scCustomUnit === 'weeks') days = val * 7;
                          else if (scCustomUnit === 'months') days = val * 30;
                          else if (scCustomUnit === 'years') days = val * 365;
                        } else {
                          days = frequencyMeta[scFrequency]?.days || 30;
                        }
                        const nextD = calculateNextDueDate(scLastDate, days);
                        return nextD ? formatFullDisplayDate(nextD) : 'Fecha no definida';
                      })()}
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Notas Cortas</label>
                  <input
                    type="text"
                    placeholder="Ej. Con aceite de almendras o cita en clínica"
                    value={scNotes}
                    onChange={(e) => setScNotes(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Protocolo Especial / Instrucciones (Opcional)
                  </label>
                  <textarea
                    placeholder="Ej. Usa el esmalte amargo Mavala Stop y el anillo de enfoque si sientes ansiedad por morder tus uñas o jalar tu cabello..."
                    value={scProtocol}
                    onChange={(e) => setScProtocol(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingSelfCare(false)}
                  className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-lg cursor-pointer transition-all"
                >
                  Guardar Actividad
                </button>
              </div>
            </form>
          )}

          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelfCareFilter('all')}
              className={`text-xs font-bold py-1.5 px-4 rounded-full border shrink-0 transition-all cursor-pointer ${
                selfCareFilter === 'all'
                  ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                  : 'bg-[#171a24] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              Todas ({selfCareActivities.length})
            </button>
            <button
              onClick={() => setSelfCareFilter('weekly')}
              className={`text-xs font-bold py-1.5 px-4 rounded-full border shrink-0 transition-all cursor-pointer ${
                selfCareFilter === 'weekly'
                  ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                  : 'bg-[#171a24] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              💅 Semanales
            </button>
            <button
              onClick={() => setSelfCareFilter('monthly')}
              className={`text-xs font-bold py-1.5 px-4 rounded-full border shrink-0 transition-all cursor-pointer ${
                selfCareFilter === 'monthly'
                  ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                  : 'bg-[#171a24] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              💆‍♀️ Mensuales / Bimestrales
            </button>
            <button
              onClick={() => setSelfCareFilter('quarterly')}
              className={`text-xs font-bold py-1.5 px-4 rounded-full border shrink-0 transition-all cursor-pointer ${
                selfCareFilter === 'quarterly'
                  ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                  : 'bg-[#171a24] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              ✂️ Trimestrales (3 meses)
            </button>
            <button
              onClick={() => setSelfCareFilter('annual')}
              className={`text-xs font-bold py-1.5 px-4 rounded-full border shrink-0 transition-all cursor-pointer ${
                selfCareFilter === 'annual'
                  ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                  : 'bg-[#171a24] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              🩺 Anuales (Prevención Médica)
            </button>
            <button
              onClick={() => setSelfCareFilter('custom')}
              className={`text-xs font-bold py-1.5 px-4 rounded-full border shrink-0 transition-all cursor-pointer ${
                selfCareFilter === 'custom'
                  ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                  : 'bg-[#171a24] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              ✨ Personalizadas
            </button>
          </div>

          {/* Self-Care Activities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sortedSelfCare.length === 0 ? (
              <div className="col-span-full p-10 bg-[#171a24] border border-slate-800 rounded-xl text-center space-y-3">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  No hay actividades registradas en esta categoría.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingSelfCare(true)}
                  className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Actividad</span>
                </button>
              </div>
            ) : (
              sortedSelfCare.map((activity) => {
                const info = getSelfCareStatus(activity);
                const freq = getFrequencyDetails(activity);
                const catIcon = categoryIcons[activity.category] || '✨';

                return (
                  <SelfCareCardItem
                    key={activity.id}
                    activity={activity}
                    info={info}
                    freq={freq}
                    catIcon={catIcon}
                    onUpdateDate={handleUpdateSelfCareDate}
                    onEdit={setEditingSelfCareItem}
                    onDelete={handleDeleteSelfCare}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW: BAG & EXIT ESSENTIALS CHECKLIST */}
      {/* ========================================== */}
      {activeTab === 'bag' && (
        <div className="space-y-6 animate-fade-in">
          <BagEssentialsChecklist
            bagEssentials={bagEssentials}
            setBagEssentials={setBagEssentials}
            showToast={showToast}
          />
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT MODAL: DAILY TIMELINE ITEM */}
      {/* ========================================== */}
      {editingItem && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-100 font-outfit">Editar Actividad</h4>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Hora</label>
                <div className="flex gap-1.5">
                  <select
                    value={editingItem.hour || "08"}
                    onChange={(e) => {
                      const h = e.target.value;
                      const m = editingItem.minute || "00";
                      const p = editingItem.period || "AM";
                      setEditingItem({
                        ...editingItem,
                        hour: h,
                        time: `${h}:${m} ${p}`,
                        category: calculateCategory(h, m, p)
                      });
                    }}
                    className="flex-1 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-1 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  
                  <span className="text-slate-400 self-center font-bold text-xs">:</span>

                  <select
                    value={editingItem.minute || "00"}
                    onChange={(e) => {
                      const h = editingItem.hour || "08";
                      const m = e.target.value;
                      const p = editingItem.period || "AM";
                      setEditingItem({
                        ...editingItem,
                        minute: m,
                        time: `${h}:${m} ${p}`,
                        category: calculateCategory(h, m, p)
                      });
                    }}
                    className="flex-1 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-1 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={editingItem.period || "AM"}
                    onChange={(e) => {
                      const h = editingItem.hour || "08";
                      const m = editingItem.minute || "00";
                      const p = e.target.value;
                      setEditingItem({
                        ...editingItem,
                        period: p,
                        time: `${h}:${m} ${p}`,
                        category: calculateCategory(h, m, p)
                      });
                    }}
                    className="flex-1 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-1 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Título</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Estado en tu Rutina</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, routineStatus: 'active' })}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      (editingItem.routineStatus || 'active') === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-[#0b0c10] text-slate-400 border-slate-800'
                    }`}
                  >
                    ✅ Aplicando
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, routineStatus: 'idea' })}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      editingItem.routineStatus === 'idea'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-[#0b0c10] text-slate-400 border-slate-800'
                    }`}
                  >
                    💡 Sugerencia / Idea
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción / Método</label>
                <textarea
                  value={editingItem.desc}
                  onChange={(e) => setEditingItem({ ...editingItem, desc: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Productos de este paso</label>
                <div className="flex gap-1.5 mb-2">
                  <input
                    type="text"
                    value={editProductDraft}
                    onChange={(e) => setEditProductDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editProductDraft.trim()) {
                        e.preventDefault();
                        const nextProds = [
                          ...(Array.isArray(editingItem.products) ? editingItem.products : []),
                          { id: 'rp-' + Date.now(), name: editProductDraft.trim(), status: editProductDraftStatus, manualOverride: true }
                        ];
                        setEditingItem({ ...editingItem, products: nextProds });
                        setEditProductDraft('');
                      }
                    }}
                    placeholder="Agregar producto..."
                    className="flex-1 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                  <select
                    value={editProductDraftStatus}
                    onChange={(e) => setEditProductDraftStatus(e.target.value)}
                    className="bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-1.5 px-2 text-slate-100 text-[11px] cursor-pointer"
                  >
                    <option value="owned">✅ Lo tengo</option>
                    <option value="to_buy">🛒 Por comprar</option>
                    <option value="to_try">🧪 Por probar</option>
                    <option value="never">🚫 No usar</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editProductDraft.trim()) return;
                      const nextProds = [
                        ...(Array.isArray(editingItem.products) ? editingItem.products : []),
                        { id: 'rp-' + Date.now(), name: editProductDraft.trim(), status: editProductDraftStatus, manualOverride: true }
                      ];
                      setEditingItem({ ...editingItem, products: nextProds });
                      setEditProductDraft('');
                    }}
                    className="bg-[#e0a96d]/20 text-[#e0a96d] border border-[#e0a96d]/30 px-2.5 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {Array.isArray(editingItem.products) && editingItem.products.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {editingItem.products.map((prod) => (
                      <div key={prod.id} className="inline-flex items-center gap-1 bg-[#0b0c10] border border-slate-700 px-2 py-1 rounded-lg text-[11px] text-slate-200">
                        <span>{prod.status === 'owned' ? '✅' : prod.status === 'to_buy' ? '🛒' : prod.status === 'to_try' ? '🧪' : '🚫'}</span>
                        <span>{prod.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextProds = editingItem.products.filter(p => p.id !== prod.id);
                            const nextDesc = removeProductMentionFromDesc(editingItem.desc, prod.name);
                            setEditingItem({ ...editingItem, products: nextProds, desc: nextDesc });
                          }}
                          className="text-slate-400 hover:text-rose-400 ml-1 cursor-pointer"
                          title="Quitar producto y limpiar de la descripción"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">Fase Asignada (Auto)</span>
                <span className="inline-block text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#e0a96d]/10 border border-[#e0a96d]/30 text-[#e0a96d] uppercase tracking-wider">
                  {editingItem.category === 'morning' ? 'Mañana' : editingItem.category === 'afternoon' ? 'Tarde' : 'Noche'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all shadow-md"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================== */}
      {/* EDIT MODAL: SELF-CARE ACTIVITY */}
      {/* ========================================== */}
      {editingSelfCareItem && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e0a96d]" />
                <span>Editar Actividad de Autocuidado</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingSelfCareItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1.5 flex-1 py-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingSelfCareItem.title || ''}
                  onChange={(e) => setEditingSelfCareItem({ ...editingSelfCareItem, title: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Frecuencia</label>
                  <select
                    value={editingSelfCareItem.frequency || 'monthly'}
                    onChange={(e) => setEditingSelfCareItem({ ...editingSelfCareItem, frequency: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    <option value="weekly">Semanal (7 días)</option>
                    <option value="biweekly">Quincenal (15 días)</option>
                    <option value="monthly">Mensual (30 días)</option>
                    <option value="bimonthly">Bimestral (60 días / Cada 2 meses)</option>
                    <option value="quarterly">Trimestral (90 días / Cada 3 meses)</option>
                    <option value="biannual">Semestral (180 días / Cada 6 meses)</option>
                    <option value="annual">Anual (365 días / Prevención Médica)</option>
                    <option value="custom">✨ Personalizado (X días / semanas / meses / años)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
                  <select
                    value={editingSelfCareItem.category || 'beauty'}
                    onChange={(e) => setEditingSelfCareItem({ ...editingSelfCareItem, category: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    <option value="beauty">💅 Belleza & Manos</option>
                    <option value="wellness">💆‍♀️ Bienestar & Masajes</option>
                    <option value="hair">✂️ Capilar & Cejas</option>
                    <option value="health">🩺 Salud & Prevención Médica</option>
                    <option value="other">✨ Otro Ritual</option>
                  </select>
                </div>
              </div>

              {editingSelfCareItem.frequency === 'custom' && (
                <div className="p-3.5 bg-[#0b0c10] border border-[#e0a96d]/30 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#e0a96d]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Definir Intervalo Personalizado:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Cada:</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={editingSelfCareItem.customValue || 1}
                        onChange={(e) => setEditingSelfCareItem({
                          ...editingSelfCareItem,
                          customValue: Math.max(1, parseInt(e.target.value, 10) || 1)
                        })}
                        className="w-20 bg-[#171a24] border border-[#e0a96d]/40 rounded-lg py-1.5 px-2.5 text-slate-100 text-xs text-center font-bold focus:outline-none focus:border-[#e0a96d]"
                      />
                      <select
                        value={editingSelfCareItem.customUnit || 'days'}
                        onChange={(e) => setEditingSelfCareItem({
                          ...editingSelfCareItem,
                          customUnit: e.target.value
                        })}
                        className="bg-[#171a24] border border-[#e0a96d]/40 rounded-lg py-1.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                      >
                        <option value="days">Día(s)</option>
                        <option value="weeks">Semana(s)</option>
                        <option value="months">Mes(es)</option>
                        <option value="years">Año(s)</option>
                      </select>
                    </div>
                    <div className="text-xs text-slate-400">
                      ⚡ Ciclo estimado:{' '}
                      <strong className="text-[#e0a96d] font-mono">
                        {(editingSelfCareItem.customUnit || 'days') === 'days' && `${editingSelfCareItem.customValue || 1} día(s)`}
                        {(editingSelfCareItem.customUnit || 'days') === 'weeks' && `${(editingSelfCareItem.customValue || 1) * 7} días (${editingSelfCareItem.customValue || 1} sem)`}
                        {(editingSelfCareItem.customUnit || 'days') === 'months' && `${(editingSelfCareItem.customValue || 1) * 30} días (~${editingSelfCareItem.customValue || 1} mes${(editingSelfCareItem.customValue || 1) > 1 ? 'es' : ''})`}
                        {(editingSelfCareItem.customUnit || 'days') === 'years' && `${(editingSelfCareItem.customValue || 1) * 365} días (${editingSelfCareItem.customValue || 1} año${(editingSelfCareItem.customValue || 1) > 1 ? 's' : ''})`}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-400">Fecha Última Realización</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingSelfCareItem({ ...editingSelfCareItem, lastCompletedDate: getLocalDateString() })}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                      title="Establecer fecha de hoy"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSelfCareItem({ ...editingSelfCareItem, lastCompletedDate: getYesterdayDateString() })}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                      title="Establecer fecha de ayer"
                    >
                      Ayer
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={editingSelfCareItem.lastCompletedDate || ''}
                  onChange={(e) => setEditingSelfCareItem({ ...editingSelfCareItem, lastCompletedDate: e.target.value })}
                  onClick={(e) => e.target.showPicker?.()}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer font-medium"
                />
              </div>

              {/* Live Calculation Preview Box in Edit Modal */}
              <div className="p-3.5 bg-[#0b0c10] border border-[#e0a96d]/30 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-[#e0a96d] flex items-center gap-1.5 uppercase font-mono">
                  <Sparkles className="w-3.5 h-3.5" /> Cálculo automático de citas
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Última realizada:</span>
                  <strong className="text-slate-200">{formatFullDisplayDate(editingSelfCareItem.lastCompletedDate)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Frecuencia / Intervalo:</span>
                  <strong className="text-slate-200">
                    {editingSelfCareItem.frequency === 'custom' 
                      ? `Cada ${editingSelfCareItem.customValue || 1} ${editingSelfCareItem.customUnit || 'días'}` 
                      : (frequencyMeta[editingSelfCareItem.frequency]?.label || 'Mensual')}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800">
                  <span className="text-[#e0a96d] font-semibold">Próxima Cita / Sesión:</span>
                  <strong className="text-[#e0a96d] font-bold font-outfit text-sm">
                    {(() => {
                      let days = 30;
                      if (editingSelfCareItem.frequency === 'custom') {
                        const val = Math.max(1, parseInt(editingSelfCareItem.customValue, 10) || 1);
                        const u = editingSelfCareItem.customUnit || 'days';
                        if (u === 'days') days = val;
                        else if (u === 'weeks') days = val * 7;
                        else if (u === 'months') days = val * 30;
                        else if (u === 'years') days = val * 365;
                      } else {
                        days = frequencyMeta[editingSelfCareItem.frequency]?.days || editingSelfCareItem.daysInterval || 30;
                      }
                      const nextDate = calculateNextDueDate(editingSelfCareItem.lastCompletedDate, days);
                      return nextDate ? formatFullDisplayDate(nextDate) : 'Fecha no definida';
                    })()}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notas Cortas</label>
                <input
                  type="text"
                  value={editingSelfCareItem.notes || ''}
                  onChange={(e) => setEditingSelfCareItem({ ...editingSelfCareItem, notes: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Protocolo / Instrucciones Especiales</label>
                <textarea
                  value={editingSelfCareItem.protocol || ''}
                  onChange={(e) => setEditingSelfCareItem({ ...editingSelfCareItem, protocol: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setEditingSelfCareItem(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditSelfCare}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all shadow-md"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <SimilarityDialogModal
        isOpen={Boolean(similarPrompt)}
        title="Posible Similitud"
        description={similarPrompt?.description}
        existingLabel={similarPrompt?.existingLabel}
        existingName={similarPrompt?.existingName || ''}
        existingMeta={similarPrompt?.existingMeta || ''}
        existingNotes={similarPrompt?.existingNotes || ''}
        newLabel={similarPrompt?.newLabel}
        newName={similarPrompt?.newName || ''}
        newMeta={similarPrompt?.newMeta || ''}
        onCancel={() => setSimilarPrompt(null)}
        onConfirm={() => {
          if (!similarPrompt?.newName) return;
          if (similarPrompt.kind === 'schedule') {
            executeSaveScheduleActivity(similarPrompt.newName);
          } else {
            executeSaveSelfCareActivity(similarPrompt.newName);
          }
        }}
      />

    </div>
  );
}

// Subcomponent for individual Self-Care activity cards to isolate date picker state and prevent UI freezing/lagging
function SelfCareCardItem({
  activity,
  info,
  freq,
  catIcon,
  onUpdateDate,
  onEdit,
  onDelete
}) {
  const [selectedDate, setSelectedDate] = useState(activity.lastCompletedDate || getLocalDateString());
  const dateInputRef = useRef(null);
  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayDateString();

  // Sync internal input date when external activity changes
  useEffect(() => {
    setSelectedDate(activity.lastCompletedDate || getLocalDateString());
  }, [activity.lastCompletedDate]);

  const hasUnsavedDate = Boolean(selectedDate && selectedDate !== (activity.lastCompletedDate || ''));
  const isSavedToday = activity.lastCompletedDate === todayStr;
  const isSavedYesterday = activity.lastCompletedDate === yesterdayStr;

  // Calculate live preview for unsaved date
  const liveInterval = activity.daysInterval || freq.days || 30;
  const liveNextDueDate = selectedDate ? calculateNextDueDate(selectedDate, liveInterval) : null;
  const liveNextDueDateStr = liveNextDueDate ? formatFullDisplayDate(liveNextDueDate) : 'Fecha no definida';

  const handleSaveCustomDate = () => {
    if (!selectedDate) return;
    onUpdateDate(activity.id, selectedDate, activity.title);
  };

  const handleSetToday = () => {
    setSelectedDate(todayStr);
    onUpdateDate(activity.id, todayStr, activity.title);
  };

  const handleSetYesterday = () => {
    setSelectedDate(yesterdayStr);
    onUpdateDate(activity.id, yesterdayStr, activity.title);
  };

  return (
    <div
      className={`bg-[#171a24] border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg transition-all ${
        info.isUrgent
          ? 'border-rose-500/30 shadow-rose-500/5'
          : info.isDueSoon
          ? 'border-amber-500/30 shadow-amber-500/5'
          : 'border-[#e0a96d]/15 hover:border-[#e0a96d]/30'
      }`}
    >
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg p-1.5 rounded-lg bg-[#0b0c10] border border-slate-800 shadow-sm">
              {catIcon}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${freq.badge}`}>
              {freq.short}
            </span>
          </div>

          {/* Status badge */}
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${info.badgeClass}`}>
            {info.status === 'good' && <Check className="w-3 h-3 text-emerald-400" />}
            {info.status === 'due_soon' && <Clock className="w-3 h-3 text-amber-400" />}
            {info.status === 'overdue' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
            <span>{info.label}</span>
          </span>
        </div>

        {/* Title & Notes */}
        <div>
          <h4 className="text-base font-bold text-slate-100 font-outfit">
            {activity.title}
          </h4>
          {activity.notes && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {activity.notes}
            </p>
          )}
        </div>

        {/* Protocol Highlights */}
        {activity.protocol && (
          <div className="mt-3 p-3 bg-[#0b0c10] border border-[#e0a96d]/15 rounded-xl text-xs space-y-1">
            <span className="text-[10px] font-bold text-[#e0a96d] uppercase font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Protocolo de Ejecución
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {activity.protocol}
            </p>
          </div>
        )}

        {/* Highlighted Dates Display Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-[#0b0c10] border border-slate-800/90 rounded-xl shadow-inner">
          {/* Last Completed Date */}
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-[#e0a96d]/10 text-[#e0a96d] shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Última Realización</span>
              <span className="text-xs sm:text-sm font-bold text-slate-100 block">
                {info.lastDateFullStr || formatFullDisplayDate(activity.lastCompletedDate)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {activity.lastCompletedDate 
                  ? (info.daysElapsed === 0 ? 'Realizado hoy' : info.daysElapsed === 1 ? 'Realizado ayer' : `Hace ${info.daysElapsed} días`) 
                  : 'Sin fecha previa'}
              </span>
            </div>
          </div>

          {/* Next Scheduled Date */}
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-indigo-300 uppercase font-mono block">Próxima Sesión</span>
              <span className="text-xs sm:text-sm font-bold text-[#e0a96d] block">
                {info.nextDueDateFullStr}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {info.daysRemaining !== null 
                  ? (info.daysRemaining > 0 
                     ? `En ${info.daysRemaining} día${info.daysRemaining === 1 ? '' : 's'}` 
                     : info.daysRemaining === 0 
                     ? '¡Toca hoy!' 
                     : `Vencida hace ${Math.abs(info.daysRemaining)} d`) 
                  : 'Pendiente'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar Cycle */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-medium">
            <span>Ciclo de {freq.days} días</span>
            <span className={`${info.isUrgent ? 'text-rose-400 font-bold' : info.isDueSoon ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}`}>
              {info.percentCycle}% transcurrido
            </span>
          </div>
          <div className="w-full bg-[#0b0c10] h-2 rounded-full overflow-hidden border border-slate-900">
            <div
              className={`h-full rounded-full progress-bar-transition ${
                info.isUrgent
                  ? 'bg-rose-500'
                  : info.isDueSoon
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${info.percentCycle}%` }}
            />
          </div>
        </div>
      </div>

      {/* Date Selector & Action Buttons Bar */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        {/* Unsaved Date Preview Banner */}
        {hasUnsavedDate && (
          <div className="p-3 bg-[#11131a] border border-[#e0a96d]/60 rounded-xl space-y-2 animate-fade-in shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#e0a96d] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#e0a96d]" />
                <span>Nueva fecha a registrar:</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                Sin guardar aún
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-1 border-y border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">Última Realización:</span>
                <strong className="text-slate-100">{formatFullDisplayDate(selectedDate)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#e0a96d] block">Próxima Sesión Calculada:</span>
                <strong className="text-[#e0a96d] font-bold">{liveNextDueDateStr}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedDate(activity.lastCompletedDate || getLocalDateString())}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomDate}
                className="btn-rose-gold text-xs font-bold py-1.5 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Fecha ({formatDisplayDate(selectedDate)})</span>
              </button>
            </div>
          </div>
        )}

        {/* Date Selector and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Date Selector & Quick shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Clickable Date Input Box */}
            <div 
              onClick={() => dateInputRef.current?.showPicker?.()}
              className="flex items-center gap-1.5 bg-[#0b0c10] border border-slate-800 hover:border-[#e0a96d]/60 focus-within:border-[#e0a96d] rounded-lg px-2.5 py-1.5 transition-all cursor-pointer shadow-inner"
              title="Haz clic para abrir el calendario y seleccionar cualquier fecha (ej. 25 de septiembre)"
            >
              <Calendar className="w-3.5 h-3.5 text-[#e0a96d] shrink-0" />
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustomDate();
                }}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-mono font-medium"
                title="Selecciona la fecha exacta en que fuiste / lo realizaste"
              />
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSetToday}
                className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                  isSavedToday
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                title="Guardar como realizado hoy"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                  isSavedYesterday
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                title="Guardar como realizado ayer"
              >
                Ayer
              </button>
            </div>
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center justify-end gap-1.5 shrink-0">
            {hasUnsavedDate ? (
              <button
                type="button"
                onClick={handleSaveCustomDate}
                className="btn-rose-gold text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                title={`Guardar la fecha seleccionada (${formatDisplayDate(selectedDate)})`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Fecha</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSetToday}
                className={`text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow ${
                  isSavedToday
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'btn-rose-gold'
                }`}
                title="Marcar como realizado hoy"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavedToday ? 'Hecho Hoy ✓' : 'Realizado Hoy'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(activity)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Editar detalles y configuración"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(activity.id, activity.title)}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Eliminar actividad"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
