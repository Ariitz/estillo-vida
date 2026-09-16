import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Droplets,
  Sparkles,
  Search,
  CheckCircle2,
  Plus,
  Heart,
  ShieldAlert,
  Sun,
  Flame,
  Moon,
  Zap,
  Info,
  Sliders,
  Camera,
  Upload,
  RefreshCw,
  BookOpen,
  HelpCircle,
  X,
  Pencil,
  Trash2,
  Eye,
  Check,
  ChevronRight,
  Bookmark,
  Share2,
  AlertTriangle,
  Feather,
  Smile,
  Activity,
  Compass,
  Layers,
  Wind
} from 'lucide-react';
import {
  DOTERRA_CATALOG,
  DEFAULT_DIFFUSER_BLENDS,
  MOOD_ARCHETYPES
} from '../data/doterraCatalog';
import {
  analyzeAromatherapyMood,
  scanDoterraCatalogImage,
  generateAromatherapyAlchemy
} from '../utils/geminiService';

export default function AromatherapyModule({
  userOils = [],
  setUserOils,
  customBlends = [],
  setCustomBlends,
  geminiApiKey = '',
  showToast = () => {}
}) {
  // Active Tab: 'boticario' | 'mood' | 'scanner' | 'recetario' | 'seguridad'
  const [activeTab, setActiveTab] = useState('boticario');

  // ============================================================================
  // TAB 1: BOTICARIO & INVENTARIO STATE
  // ============================================================================
  const [boticarioFilter, setBoticarioFilter] = useState('all'); // 'all', 'owned', 'singles', 'blends', category
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOilDetail, setSelectedOilDetail] = useState(null);
  const [isCustomOilModalOpen, setIsCustomOilModalOpen] = useState(false);
  const [customOilForm, setCustomOilForm] = useState({
    name: '',
    trademarkName: '',
    brand: 'dōTERRA',
    type: 'single',
    category: 'mood',
    categoryLabel: 'Bienestar',
    aroma: '',
    methods: ['A', 'T'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: '',
    keyBenefits: '',
    level: '100%',
    notes: ''
  });

  // Ensure catalog merges seamlessly with user-saved inventory
  const mergedOils = useMemo(() => {
    // If userOils is empty or missing items from catalog, merge catalog defaults
    const userMap = new Map((userOils || []).map(o => [o.id, o]));
    
    // Process catalog items with user overrides
    const catalogMerged = DOTERRA_CATALOG.map(catOil => {
      const userEntry = userMap.get(catOil.id);
      if (userEntry) {
        return { ...catOil, ...userEntry, inInventory: userEntry.inInventory ?? true };
      }
      return { ...catOil, inInventory: Boolean(catOil.defaultInInventory) };
    });

    // Add any completely custom oils added by user
    const customOnly = (userOils || []).filter(o => o.isCustom && !DOTERRA_CATALOG.some(c => c.id === o.id));

    return [...catalogMerged, ...customOnly];
  }, [userOils]);

  // Filtered oils for display
  const filteredOils = useMemo(() => {
    return mergedOils.filter(oil => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = oil.name?.toLowerCase().includes(q);
        const matchTrade = oil.trademarkName?.toLowerCase().includes(q);
        const matchAroma = oil.aroma?.toLowerCase().includes(q);
        const matchEmotion = oil.emotionalProperty?.toLowerCase().includes(q);
        const matchBenefits = Array.isArray(oil.keyBenefits) && oil.keyBenefits.some(b => b.toLowerCase().includes(q));
        if (!matchName && !matchTrade && !matchAroma && !matchEmotion && !matchBenefits) {
          return false;
        }
      }

      // Tab filter
      if (boticarioFilter === 'owned') return oil.inInventory;
      if (boticarioFilter === 'singles') return oil.type === 'single';
      if (boticarioFilter === 'blends') return oil.type === 'blend';
      if (boticarioFilter !== 'all') return oil.category === boticarioFilter;

      return true;
    });
  }, [mergedOils, boticarioFilter, searchQuery]);

  const ownedOilsCount = useMemo(() => mergedOils.filter(o => o.inInventory).length, [mergedOils]);

  // Toggle oil in inventory
  const handleToggleInventory = (oil) => {
    const updatedList = mergedOils.map(item => {
      if (item.id === oil.id) {
        const nextState = !item.inInventory;
        return { ...item, inInventory: nextState };
      }
      return item;
    });
    setUserOils(updatedList);
    showToast(
      'success',
      oil.inInventory ? 'Aceite Retirado' : '¡Aceite en Boticario!',
      `${oil.name} ahora ${oil.inInventory ? 'está marcado como ausente' : 'está activo en tu boticario'}.`
    );
  };

  // Update oil level/notes
  const handleUpdateOilMeta = (oilId, field, val) => {
    const updatedList = mergedOils.map(item => {
      if (item.id === oilId) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setUserOils(updatedList);
  };

  // Save new custom oil
  const handleSaveCustomOil = (e) => {
    e.preventDefault();
    if (!customOilForm.name.trim()) {
      showToast('error', 'Campo Requerido', 'Ingresa el nombre del aceite.');
      return;
    }

    const newOil = {
      id: 'custom-oil-' + Date.now(),
      name: customOilForm.name.trim(),
      trademarkName: customOilForm.trademarkName.trim() || customOilForm.name.trim(),
      botanicalName: '',
      brand: customOilForm.brand || 'dōTERRA',
      type: customOilForm.type,
      category: customOilForm.category,
      categoryLabel: customOilForm.categoryLabel,
      aroma: customOilForm.aroma || 'Fresco y aromático',
      methods: customOilForm.methods.length > 0 ? customOilForm.methods : ['A', 'T'],
      sensitivity: customOilForm.sensitivity,
      photosensitive: customOilForm.photosensitive,
      emotionalProperty: customOilForm.emotionalProperty || 'Aceite de bienestar y armonía',
      keyBenefits: customOilForm.keyBenefits ? customOilForm.keyBenefits.split('\n').filter(Boolean) : ['Bienestar integral'],
      description: 'Aceite personalizado registrado en boticario.',
      inInventory: true,
      level: customOilForm.level || '100%',
      notes: customOilForm.notes || '',
      isCustom: true
    };

    const updated = [...mergedOils, newOil];
    setUserOils(updated);
    setIsCustomOilModalOpen(false);
    setCustomOilForm({
      name: '',
      trademarkName: '',
      brand: 'dōTERRA',
      type: 'single',
      category: 'mood',
      categoryLabel: 'Bienestar',
      aroma: '',
      methods: ['A', 'T'],
      sensitivity: 'N',
      photosensitive: false,
      emotionalProperty: '',
      keyBenefits: '',
      level: '100%',
      notes: ''
    });
    showToast('success', 'Aceite Creado', `Se agregó "${newOil.name}" a tu boticario.`);
  };

  // ============================================================================
  // TAB 2: ESTADO DE ÁNIMO & ALQUIMIA IA STATE
  // ============================================================================
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [moodDescription, setMoodDescription] = useState('');
  const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);
  const [moodRecommendation, setMoodRecommendation] = useState(null);

  const handleSelectArchetype = (arch) => {
    setSelectedArchetype(arch.id);
    setMoodDescription(`Me siento con ${arch.label.toLowerCase()}: ${arch.subtitle}. Necesito ${arch.targetEmotion.toLowerCase()}.`);
  };

  const handleGenerateMoodBlend = async () => {
    if (!moodDescription.trim()) {
      showToast('error', 'Describe tu Estado', 'Escribe cómo te sientes o elige una emoción.');
      return;
    }

    setIsAnalyzingMood(true);
    setMoodRecommendation(null);

    try {
      const activeOils = mergedOils.filter(o => o.inInventory);
      const result = await analyzeAromatherapyMood(moodDescription, activeOils, geminiApiKey);
      setMoodRecommendation(result);
      showToast('success', '¡Alquimia Creada!', 'Se formuló una sinergia adaptada a tus aceites y emociones.');
    } catch (err) {
      console.error('Mood blend error:', err);
      showToast('error', 'Error en Alquimia', err.message || 'No se pudo generar la mezcla.');
    } finally {
      setIsAnalyzingMood(false);
    }
  };

  // Save AI blend into custom blends
  const handleSaveMoodBlendToFavorites = () => {
    if (!moodRecommendation) return;

    const newBlend = {
      id: 'ai-blend-' + Date.now(),
      name: moodRecommendation.blendName,
      category: 'mood',
      categoryLabel: 'Emocional IA',
      type: 'diffuser',
      targetVibe: moodRecommendation.targetEmotion,
      ingredients: moodRecommendation.diffuserFormula?.drops?.map(d => ({
        oilId: d.oilName.toLowerCase().replace(/\s+/g, '-'),
        oilName: d.oilName,
        drops: d.drops
      })) || [],
      totalDrops: moodRecommendation.diffuserFormula?.totalDrops || 8,
      carrierMl: 0,
      bestTime: 'Cuando necesites este soporte emocional',
      notes: `${moodRecommendation.affirmation} | ${moodRecommendation.scientificRationale}`,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    setCustomBlends(prev => [newBlend, ...(prev || [])]);
    showToast('success', 'Guardado en Recetario', `"${newBlend.name}" se guardó en tus mezclas favoritas.`);
  };

  // ============================================================================
  // TAB 3: SCANNER DE CATÁLOGO & PEDIDOS STATE
  // ============================================================================
  const [scannerImage, setScannerImage] = useState(null);
  const [scannerMime, setScannerMime] = useState('image/jpeg');
  const [isScanningCatalog, setIsScanningCatalog] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Formato Inválido', 'Por favor selecciona una imagen PNG o JPG.');
      return;
    }

    setScannerMime(file.type);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target.result.split(',')[1];
      setScannerImage(base64Data);
      setScanResults(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunCatalogScan = async () => {
    if (!scannerImage) {
      showToast('error', 'Sube una Imagen', 'Selecciona una foto del catálogo, factura o pedido.');
      return;
    }

    setIsScanningCatalog(true);
    setScanResults(null);

    try {
      const activeOils = mergedOils.filter(o => o.inInventory);
      const res = await scanDoterraCatalogImage(scannerImage, scannerMime, activeOils, geminiApiKey);
      setScanResults(res);
      showToast('success', 'Escaneo Finalizado', `Se auditaron ${res.detectedCount || 0} productos dōTERRA.`);
    } catch (err) {
      console.error('Catalog scan error:', err);
      showToast('error', 'Error de Escaneo', err.message || 'No se pudo procesar la imagen.');
    } finally {
      setIsScanningCatalog(false);
    }
  };

  // Add missing product from scan directly to inventory
  const handleAddScannedToInventory = (product) => {
    // Check if it matches existing catalog item
    const existingIndex = mergedOils.findIndex(o => 
      o.id === product.id || 
      o.name.toLowerCase() === product.name.toLowerCase() ||
      o.trademarkName?.toLowerCase() === product.trademarkName?.toLowerCase()
    );

    let updated = [];
    if (existingIndex >= 0) {
      updated = mergedOils.map((o, idx) => idx === existingIndex ? { ...o, inInventory: true } : o);
    } else {
      const newCustom = {
        id: product.id || 'scan-' + Date.now(),
        name: product.name,
        trademarkName: product.trademarkName || product.name,
        botanicalName: '',
        brand: 'dōTERRA',
        type: product.name.toLowerCase().includes('guard') || product.name.toLowerCase().includes('balance') ? 'blend' : 'single',
        category: 'mood',
        categoryLabel: product.category || 'Bienestar',
        aroma: 'Aromático dōTERRA',
        methods: product.methods || ['A', 'T'],
        sensitivity: 'N',
        photosensitive: Boolean(product.photosensitive),
        emotionalProperty: product.keyBenefit || 'Propiedades terapéuticas dōTERRA',
        keyBenefits: product.keyBenefit ? [product.keyBenefit] : ['Soporte integral'],
        description: 'Producto detectado e importado por Scanner dōTERRA.',
        inInventory: true,
        level: '100%',
        notes: 'Importado de catálogo.',
        isCustom: true
      };
      updated = [...mergedOils, newCustom];
    }

    setUserOils(updated);
    showToast('success', '¡Añadido a Boticario!', `"${product.name}" ya forma parte de tus aceites activos.`);
  };

  // ============================================================================
  // TAB 4: RECETARIO & SINERGIAS STATE
  // ============================================================================
  const [recipeFilter, setRecipeFilter] = useState('all'); // 'all', 'can-make', 'focus', 'calm', 'immunity', 'relief'
  const [isCustomRecipeModalOpen, setIsCustomRecipeModalOpen] = useState(false);
  const [customRecipeForm, setCustomRecipeForm] = useState({
    name: '',
    category: 'mood',
    type: 'diffuser',
    targetVibe: '',
    ingredientsText: '', // "Menta: 3, Naranja: 3, Incienso: 2"
    bestTime: 'En cualquier momento',
    notes: ''
  });

  const allBlends = useMemo(() => {
    return [...(customBlends || []), ...DEFAULT_DIFFUSER_BLENDS];
  }, [customBlends]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    const ownedIds = new Set(mergedOils.filter(o => o.inInventory).map(o => o.id));
    const ownedNames = new Set(mergedOils.filter(o => o.inInventory).map(o => o.name.toLowerCase()));

    return allBlends.filter(recipe => {
      // Check if user can make it
      const canMake = recipe.ingredients.every(ing => {
        if (ing.oilId && ownedIds.has(ing.oilId)) return true;
        const n = (ing.oilName || '').toLowerCase();
        return Array.from(ownedNames).some(owned => n.includes(owned) || owned.includes(n));
      });

      if (recipeFilter === 'can-make') return canMake;
      if (recipeFilter !== 'all') return recipe.category === recipeFilter;
      return true;
    });
  }, [allBlends, recipeFilter, mergedOils]);

  const handleSaveCustomRecipe = (e) => {
    e.preventDefault();
    if (!customRecipeForm.name.trim()) {
      showToast('error', 'Nombre Requerido', 'Ingresa un nombre para tu mezcla.');
      return;
    }

    // Parse ingredientsText (e.g., "Menta: 3, Naranja: 3")
    const lines = customRecipeForm.ingredientsText.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    const ingredients = lines.map(line => {
      const parts = line.split(/[:=-]/);
      const name = parts[0]?.trim() || 'Aceite';
      const drops = parseInt(parts[1]?.trim() || '2', 10) || 2;
      return {
        oilId: name.toLowerCase().replace(/\s+/g, '-'),
        oilName: name,
        drops
      };
    });

    if (ingredients.length === 0) {
      ingredients.push({ oilId: 'lavender', oilName: 'Lavanda', drops: 4 });
    }

    const totalDrops = ingredients.reduce((sum, i) => sum + i.drops, 0);

    const newRecipe = {
      id: 'custom-recipe-' + Date.now(),
      name: customRecipeForm.name.trim(),
      category: customRecipeForm.category,
      categoryLabel: customRecipeForm.category === 'focus' ? 'Enfoque' : (customRecipeForm.category === 'calm' ? 'Calma' : 'Bienestar'),
      type: customRecipeForm.type,
      targetVibe: customRecipeForm.targetVibe || 'Mezcla personalizada',
      ingredients,
      totalDrops,
      carrierMl: customRecipeForm.type === 'rollon' ? 10 : 0,
      bestTime: customRecipeForm.bestTime || 'Cuando lo requieras',
      notes: customRecipeForm.notes || '',
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    setCustomBlends(prev => [newRecipe, ...(prev || [])]);
    setIsCustomRecipeModalOpen(false);
    setCustomRecipeForm({
      name: '',
      category: 'mood',
      type: 'diffuser',
      targetVibe: '',
      ingredientsText: '',
      bestTime: 'En cualquier momento',
      notes: ''
    });
    showToast('success', 'Receta Guardada', `"${newRecipe.name}" se añadió a tu recetario.`);
  };

  // ============================================================================
  // TAB 5: CALCULADORA DE DILUCIÓN & SEGURIDAD STATE
  // ============================================================================
  const [calcBottleSize, setCalcBottleSize] = useState(10); // 5, 10, 15, 30 ml
  const [calcDilutionPercent, setCalcDilutionPercent] = useState(2); // 1%, 2%, 3%, 5%, 10%

  const calculatedDrops = useMemo(() => {
    // Standard rule: 1 ml ~ 20 drops
    const totalBottleDrops = calcBottleSize * 20;
    const essentialDrops = Math.round((totalBottleDrops * calcDilutionPercent) / 100);
    const carrierMl = calcBottleSize - (essentialDrops * 0.05);
    return {
      essentialDrops: Math.max(1, essentialDrops),
      carrierMl: parseFloat(carrierMl.toFixed(1))
    };
  }, [calcBottleSize, calcDilutionPercent]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ============================================================================ */}
      {/* 1. HERO HEADER WITH STATS & QUICK VIBES */}
      {/* ============================================================================ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#11131a] via-[#171a24] to-[#0b0c10] border border-[#e0a96d]/20 p-6 lg:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e0a96d]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e0a96d]/10 border border-[#e0a96d]/30 text-[#e0a96d] text-xs font-semibold">
              <Droplets className="w-3.5 h-3.5 animate-pulse" />
              <span>Boticario dōTERRA & Psicoaromaterapia Holística</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black font-outfit tracking-tight text-slate-100 flex items-center gap-2">
              <span>Aromaterapia & Boticario de Aceites</span>
              <Sparkles className="w-6 h-6 text-[#e0a96d]" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Gestiona tus aceites esenciales puros, recibe mezclas emocionales personalizadas con IA según cómo te sientes y audita catálogos o facturas con Gemini Visión.
            </p>
          </div>

          {/* Stat Badges */}
          <div className="flex flex-wrap gap-3 shrink-0">
            <div className="bg-[#11131a]/80 backdrop-blur-md border border-[#e0a96d]/20 rounded-2xl p-3.5 min-w-[120px]">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">En tu Boticario</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-[#e0a96d] font-outfit">{ownedOilsCount}</span>
                <span className="text-[10px] text-slate-500">/ {mergedOils.length} aceites</span>
              </div>
            </div>

            <div className="bg-[#11131a]/80 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-3.5 min-w-[120px]">
              <span className="block text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Recetas Listas</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-emerald-400 font-outfit">
                  {allBlends.filter(b => b.ingredients.every(i => mergedOils.some(o => o.inInventory && (o.id === i.oilId || o.name.toLowerCase().includes(i.oilName.toLowerCase()))))).length}
                </span>
                <span className="text-[10px] text-slate-500">para preparar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="relative z-10 flex overflow-x-auto gap-2 mt-6 pt-4 border-t border-slate-800/80 scrollbar-none">
          <button
            onClick={() => setActiveTab('boticario')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'boticario'
                ? 'bg-[#e0a96d] text-[#0b0c10] shadow-lg shadow-[#e0a96d]/20 font-extrabold'
                : 'bg-[#171a24] text-slate-400 hover:text-slate-200 hover:bg-[#202433] border border-slate-800'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>🌿 Mi Boticario & Catálogo</span>
          </button>

          <button
            onClick={() => setActiveTab('mood')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'mood'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 font-extrabold'
                : 'bg-[#171a24] text-slate-400 hover:text-slate-200 hover:bg-[#202433] border border-slate-800'
            }`}
          >
            <Smile className="w-4 h-4" />
            <span>🎭 Estado de Ánimo & Alquimia IA</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-extrabold'
                : 'bg-[#171a24] text-slate-400 hover:text-slate-200 hover:bg-[#202433] border border-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>📷 Scanner Catálogo dōTERRA</span>
          </button>

          <button
            onClick={() => setActiveTab('recetario')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'recetario'
                ? 'bg-[#e0a96d] text-[#0b0c10] shadow-lg shadow-[#e0a96d]/20 font-extrabold'
                : 'bg-[#171a24] text-slate-400 hover:text-slate-200 hover:bg-[#202433] border border-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📚 Recetario de Mezclas</span>
          </button>

          <button
            onClick={() => setActiveTab('seguridad')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'seguridad'
                ? 'bg-[#e0a96d] text-[#0b0c10] shadow-lg shadow-[#e0a96d]/20 font-extrabold'
                : 'bg-[#171a24] text-slate-400 hover:text-slate-200 hover:bg-[#202433] border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>🧴 Dilución & Seguridad</span>
          </button>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* 2. TAB 1: MI BOTICARIO & CATÁLOGO dōTERRA */}
      {/* ============================================================================ */}
      {activeTab === 'boticario' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls & Filter bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por aceite, emoción, beneficio (ej. dolor de cabeza, sueño)..."
                className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#e0a96d]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category / Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setBoticarioFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  boticarioFilter === 'all'
                    ? 'bg-[#e0a96d]/20 text-[#e0a96d] border border-[#e0a96d]/40'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Todos ({mergedOils.length})
              </button>

              <button
                onClick={() => setBoticarioFilter('owned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  boticarioFilter === 'owned'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>En mi Boticario ({ownedOilsCount})</span>
              </button>

              <button
                onClick={() => setBoticarioFilter('singles')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  boticarioFilter === 'singles'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Individuales
              </button>

              <button
                onClick={() => setBoticarioFilter('blends')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  boticarioFilter === 'blends'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Mezclas dōTERRA
              </button>

              <button
                onClick={() => setIsCustomOilModalOpen(true)}
                className="btn-rose-gold text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer ml-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Aceite DIY</span>
              </button>
            </div>
          </div>

          {/* Oils Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOils.map((oil) => {
              const isOwned = oil.inInventory;

              return (
                <div
                  key={oil.id}
                  className={`rounded-2xl border transition-all duration-300 p-5 flex flex-col justify-between relative group ${
                    isOwned
                      ? 'bg-[#171a24] border-[#e0a96d]/30 shadow-lg hover:border-[#e0a96d]/60 shadow-[#e0a96d]/5'
                      : 'bg-[#11131a]/60 border-slate-800/80 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Top Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#e0a96d]/10 text-[#e0a96d] border border-[#e0a96d]/20">
                            {oil.categoryLabel || oil.brand}
                          </span>
                          {oil.type === 'blend' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              Mezcla
                            </span>
                          )}
                          {oil.photosensitive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1" title="¡Fotosensible! No exponerse al sol en 12-24h tras uso tópico">
                              <Sun className="w-2.5 h-2.5" />
                              <span>Fotosensible</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold font-outfit text-slate-100 mt-1">
                          {oil.name}
                        </h3>
                        {oil.trademarkName && oil.trademarkName !== oil.name && (
                          <span className="text-[11px] text-slate-400 block font-medium">
                            {oil.trademarkName} {oil.botanicalName ? `• ${oil.botanicalName}` : ''}
                          </span>
                        )}
                      </div>

                      {/* In Inventory Toggle Button */}
                      <button
                        onClick={() => handleToggleInventory(oil)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isOwned
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/30'
                            : 'bg-[#0b0c10] text-slate-500 border-slate-800 hover:text-emerald-400 hover:border-emerald-500/30'
                        }`}
                        title={isOwned ? 'Marcar como ausente en boticario' : 'Añadir a mi boticario activo'}
                      >
                        {isOwned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Emotional & Aromatic profile */}
                    <p className="text-xs text-slate-300 italic mb-3 line-clamp-2">
                      "{oil.emotionalProperty || oil.description}"
                    </p>

                    {/* Usage Badges (A, T, I) */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">Uso:</span>
                      {oil.methods?.includes('A') && (
                        <span className="w-5 h-5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-[10px] font-black" title="Aromático (Difusor / Inhalación)">
                          A
                        </span>
                      )}
                      {oil.methods?.includes('T') && (
                        <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black" title="Tópico (Diluido con Coco)">
                          T
                        </span>
                      )}
                      {oil.methods?.includes('I') && (
                        <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-[10px] font-black" title="Interno (En cápsula o agua según lineamiento dōTERRA)">
                          I
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500 ml-auto font-medium">
                        {oil.sensitivity === 'N' ? 'Puro (Neat)' : (oil.sensitivity === 'D' ? 'Diluir Siempre' : 'Piel Sensible')}
                      </span>
                    </div>

                    {/* Key benefits list */}
                    {Array.isArray(oil.keyBenefits) && oil.keyBenefits.length > 0 && (
                      <ul className="space-y-1 text-[11px] text-slate-400 mb-4">
                        {oil.keyBenefits.slice(0, 2).map((benefit, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-1.5">
                            <span className="text-[#e0a96d] mt-0.5">•</span>
                            <span className="line-clamp-1">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Bottom Footer Action */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {isOwned ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-400">En Boticario</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">Catálogo dōTERRA</span>
                    )}

                    <button
                      onClick={() => setSelectedOilDetail(oil)}
                      className="text-xs font-bold text-[#e0a96d] hover:text-[#f3c699] flex items-center gap-1 cursor-pointer transition-colors p-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Ficha Completa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOils.length === 0 && (
            <div className="text-center py-16 bg-[#171a24] rounded-2xl border border-slate-800">
              <Droplets className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
              <h4 className="text-base font-bold text-slate-300">No se encontraron aceites</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Prueba con otro término de búsqueda o limpia los filtros activos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* 3. TAB 2: ESTADO DE ÁNIMO & ALQUIMIA IA */}
      {/* ============================================================================ */}
      {activeTab === 'mood' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          {/* Intro Card */}
          <div className="bg-[#171a24] border border-indigo-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Smile className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-outfit text-slate-100">
                  Barómetro Emocional & Alquimia Botánica
                </h2>
                <p className="text-xs text-slate-400">
                  Cuéntale a la IA cómo te sientes hoy. Formulará la sinergia botánica perfecta priorizando los aceites que tienes en tu boticario.
                </p>
              </div>
            </div>

            {/* Mood Archetype Chips */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Selecciona una emoción o estado frecuente:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {MOOD_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    onClick={() => handleSelectArchetype(arch)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedArchetype === arch.id
                        ? 'bg-indigo-500/15 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                        : 'bg-[#0b0c10] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{arch.emoji}</span>
                      <span className="text-xs font-bold text-slate-200">{arch.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{arch.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mt-5 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                O descríbelo con tus propias palabras:
              </label>
              <textarea
                rows="3"
                value={moodDescription}
                onChange={(e) => setMoodDescription(e.target.value)}
                placeholder="Ej. Me siento muy abrumada con entregas de trabajo, tengo dolor en la nuca y me cuesta concentrarme. Quiero algo que me despeje y me dé paz..."
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400 resize-none"
              />

              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-slate-400">
                  🌿 <strong>{ownedOilsCount} aceites</strong> en tu boticario listos para formular.
                </span>

                <button
                  onClick={handleGenerateMoodBlend}
                  disabled={isAnalyzingMood || !moodDescription.trim()}
                  className="bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white text-xs font-extrabold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isAnalyzingMood ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Formulando Sinergia...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generar Mezcla Emocional con mis Aceites</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* AI Result Card */}
          {moodRecommendation && (
            <div className="bg-[#171a24] border border-[#e0a96d]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30 inline-block mb-1.5">
                    Sinergia Emocional Creada
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black font-outfit text-slate-100">
                    {moodRecommendation.blendName}
                  </h3>
                  <p className="text-xs text-indigo-300 font-medium mt-0.5">
                    Propósito: {moodRecommendation.targetEmotion}
                  </p>
                </div>

                <button
                  onClick={handleSaveMoodBlendToFavorites}
                  className="btn-rose-gold text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Guardar en mis Mezclas</span>
                </button>
              </div>

              {/* Diffuser vs Roll-on Formula Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Diffuser */}
                <div className="bg-[#0b0c10] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Wind className="w-4 h-4" />
                      <span>Fórmula para Difusor</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      {moodRecommendation.diffuserFormula?.tankSize || '300 ml'} • {moodRecommendation.diffuserFormula?.totalDrops || 8} gotas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {moodRecommendation.diffuserFormula?.drops?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-[#11131a] p-2.5 rounded-xl border border-slate-800/80">
                        <span className="font-bold text-slate-200">{item.oilName}</span>
                        <div className="flex items-center gap-2">
                          {item.role && <span className="text-[10px] text-slate-400 italic hidden sm:inline">{item.role}</span>}
                          <span className="font-extrabold text-[#e0a96d] px-2 py-0.5 rounded bg-[#e0a96d]/10 border border-[#e0a96d]/20">
                            {item.drops} gotas
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roll-on */}
                <div className="bg-[#0b0c10] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Droplets className="w-4 h-4" />
                      <span>Roll-on de Bolsillo (10 ml)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {moodRecommendation.rollonFormula?.totalDrops || 12} gotas + Coco (FCO)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {moodRecommendation.rollonFormula?.drops?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-[#11131a] p-2.5 rounded-xl border border-slate-800/80">
                        <span className="font-bold text-slate-200">{item.oilName}</span>
                        <span className="font-extrabold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {item.drops} gotas
                        </span>
                      </div>
                    ))}
                  </div>

                  {moodRecommendation.rollonFormula?.applicationPoints && (
                    <p className="text-[11px] text-slate-400 pt-1">
                      📍 <strong>Puntos de aplicación:</strong> {moodRecommendation.rollonFormula.applicationPoints}
                    </p>
                  )}
                </div>
              </div>

              {/* Scientific Rationale & Sacred Affirmation */}
              <div className="space-y-3 bg-[#11131a] p-5 rounded-2xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#e0a96d]" />
                    <span>Química Botánica & Sistema Límbico</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {moodRecommendation.scientificRationale}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1 flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5" />
                    <span>Ritual de Anclaje & Afirmación</span>
                  </h4>
                  <p className="text-xs text-slate-300 italic mb-2">
                    {moodRecommendation.applicationRitual}
                  </p>
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs font-bold text-center">
                    {moodRecommendation.affirmation}
                  </div>
                </div>

                {moodRecommendation.suggestedUpgrade && (
                  <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong>Upgrade sugerido para tu boticario:</strong> {moodRecommendation.suggestedUpgrade}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* 4. TAB 3: SCANNER DE CATÁLOGO & PEDIDOS dōTERRA */}
      {/* ============================================================================ */}
      {activeTab === 'scanner' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div className="bg-[#171a24] border border-emerald-500/20 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-outfit text-slate-100">
                  Scanner de Catálogo, Facturas y Pedidos dōTERRA
                </h2>
                <p className="text-xs text-slate-400">
                  Sube una foto o captura del catálogo dōTERRA o de tu pedido. Gemini Visión identificará qué aceites ya tienes y cuáles te faltan.
                </p>
              </div>
            </div>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-[#e0a96d]/30 hover:border-[#e0a96d] rounded-2xl p-6 text-center transition-colors bg-[#0b0c10]/60 relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />

              {scannerImage ? (
                <div className="space-y-3">
                  <img
                    src={`data:${scannerMime};base64,${scannerImage}`}
                    alt="Preview catálogo"
                    className="max-h-60 mx-auto rounded-xl object-contain shadow-lg border border-slate-800"
                  />
                  <p className="text-xs text-emerald-400 font-semibold">
                    ✓ Imagen cargada. Haz clic en el botón de abajo para auditar.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">
                    Arrastra una foto o haz clic para subir
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Acepta capturas de pantalla del catálogo oficial, lista de precios o foto de tus frascos.
                  </p>
                </div>
              )}
            </div>

            {/* Action button */}
            {scannerImage && (
              <div className="flex justify-end">
                <button
                  onClick={handleRunCatalogScan}
                  disabled={isScanningCatalog}
                  className="btn-rose-gold text-xs font-bold py-3 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isScanningCatalog ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Auditando con Gemini Visión...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Auditar Catálogo vs Mi Boticario</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Scanner Results Breakdown */}
          {scanResults && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary banner */}
              <div className="p-4 rounded-2xl bg-[#171a24] border border-[#e0a96d]/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Resultado de la Auditoría dōTERRA
                    </h4>
                    <p className="text-xs text-slate-400">
                      {scanResults.summaryMessage}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-[#e0a96d] px-3 py-1 rounded-full bg-[#e0a96d]/10 border border-[#e0a96d]/20">
                  {scanResults.detectedCount} detectados
                </span>
              </div>

              {/* Grid of Owned vs Missing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Ya en tu Boticario */}
                <div className="bg-[#171a24] border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ya en tu Boticario ({scanResults.ownedProducts?.length || 0})</span>
                  </h4>

                  <div className="space-y-2">
                    {scanResults.ownedProducts?.length > 0 ? (
                      scanResults.ownedProducts.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#0b0c10] border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-200 block">{p.name}</span>
                            <span className="text-[10px] text-slate-500">{p.category || 'dōTERRA'}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            ✓ Activo
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic p-3">Ninguno de los productos detectados está en tu boticario aún.</p>
                    )}
                  </div>
                </div>

                {/* 2. Te Faltan / Nuevos Detectados */}
                <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#e0a96d] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Te Faltan en Boticario ({scanResults.missingProducts?.length || 0})</span>
                  </h4>

                  <div className="space-y-2.5">
                    {scanResults.missingProducts?.length > 0 ? (
                      scanResults.missingProducts.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#0b0c10] border border-slate-800 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-200 text-xs block">{p.name}</span>
                              <span className="text-[10px] text-indigo-300">{p.category || 'Beneficio Especial'}</span>
                            </div>

                            <button
                              onClick={() => handleAddScannedToInventory(p)}
                              className="btn-rose-gold text-[10px] font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Agregar a Boticario</span>
                            </button>
                          </div>

                          {p.keyBenefit && (
                            <p className="text-[11px] text-slate-400 italic">
                              "{p.keyBenefit}"
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic p-3">¡Felicidades! Ya tienes todos los aceites mostrados en la imagen.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Complete dōTERRA Catalog Quick-Audit list */}
          <div className="bg-[#171a24] border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold font-outfit text-slate-100">
                  Progreso Global del Catálogo dōTERRA
                </h3>
                <p className="text-xs text-slate-400">
                  Tienes {ownedOilsCount} de {DOTERRA_CATALOG.length} aceites principales ({Math.round((ownedOilsCount / DOTERRA_CATALOG.length) * 100)}%).
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full sm:w-48 bg-[#0b0c10] h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-[#e0a96d] to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((ownedOilsCount / DOTERRA_CATALOG.length) * 100))}%` }}
                />
              </div>
            </div>

            {/* Quick check table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 max-h-72 overflow-y-auto pr-1">
              {DOTERRA_CATALOG.map((catOil) => {
                const isOwned = mergedOils.find(o => o.id === catOil.id)?.inInventory;
                return (
                  <div
                    key={catOil.id}
                    onClick={() => handleToggleInventory(catOil)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isOwned
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-semibold truncate mr-2">{catOil.name}</span>
                    <span className="shrink-0 text-[10px] font-bold">
                      {isOwned ? '✓ En Stock' : '+ Faltante'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 5. TAB 4: RECETARIO DE MEZCLAS & SINERGIAS */}
      {/* ============================================================================ */}
      {activeTab === 'recetario' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setRecipeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  recipeFilter === 'all'
                    ? 'bg-[#e0a96d]/20 text-[#e0a96d] border border-[#e0a96d]/40'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Todas ({allBlends.length})
              </button>

              <button
                onClick={() => setRecipeFilter('can-make')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  recipeFilter === 'can-make'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Puedo Prepararlas Ahora</span>
              </button>

              <button
                onClick={() => setRecipeFilter('focus')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  recipeFilter === 'focus'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Enfoque
              </button>

              <button
                onClick={() => setRecipeFilter('calm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  recipeFilter === 'calm'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Sueño & Calma
              </button>
            </div>

            <button
              onClick={() => setIsCustomRecipeModalOpen(true)}
              className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Crear Nueva Mezcla</span>
            </button>
          </div>

          {/* Recipes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => {
              const ownedIds = new Set(mergedOils.filter(o => o.inInventory).map(o => o.id));
              const ownedNames = new Set(mergedOils.filter(o => o.inInventory).map(o => o.name.toLowerCase()));

              const canMakeAll = recipe.ingredients.every(ing => {
                if (ing.oilId && ownedIds.has(ing.oilId)) return true;
                const n = (ing.oilName || '').toLowerCase();
                return Array.from(ownedNames).some(owned => n.includes(owned) || owned.includes(n));
              });

              return (
                <div
                  key={recipe.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-[#171a24] ${
                    canMakeAll
                      ? 'border-[#e0a96d]/30 shadow-lg shadow-[#e0a96d]/5'
                      : 'border-slate-800 opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#e0a96d]/10 text-[#e0a96d] border border-[#e0a96d]/20">
                          {recipe.categoryLabel || 'Sinergia'}
                        </span>
                        <h3 className="text-base font-bold font-outfit text-slate-100 mt-1">
                          {recipe.name}
                        </h3>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        canMakeAll
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}>
                        {canMakeAll ? '✓ Listo' : 'Faltan aceites'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic mb-4">
                      "{recipe.targetVibe}"
                    </p>

                    {/* Ingredients drop counts */}
                    <div className="space-y-1.5 mb-4">
                      {recipe.ingredients.map((ing, iIdx) => {
                        const hasThis = ing.oilId && ownedIds.has(ing.oilId) || Array.from(ownedNames).some(owned => ing.oilName?.toLowerCase().includes(owned));
                        return (
                          <div
                            key={iIdx}
                            className={`flex items-center justify-between text-xs p-2 rounded-lg border ${
                              hasThis
                                ? 'bg-[#0b0c10] border-slate-800 text-slate-200'
                                : 'bg-amber-500/5 border-amber-500/20 text-amber-300/80'
                            }`}
                          >
                            <span className="font-semibold">{ing.oilName}</span>
                            <span className="font-extrabold text-[#e0a96d]">
                              {ing.drops} gotas
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Total: <strong>{recipe.totalDrops} gotas</strong></span>
                    <span>{recipe.type === 'rollon' ? 'Roll-on 10ml' : 'Difusor'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 6. TAB 5: CALCULADORA DE DILUCIÓN & GUÍA DE SEGURIDAD */}
      {/* ============================================================================ */}
      {activeTab === 'seguridad' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          {/* Interactive Calculator */}
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#e0a96d]/10 text-[#e0a96d] border border-[#e0a96d]/20">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-outfit text-slate-100">
                  Calculadora de Dilución para Roll-on y Tópicos
                </h2>
                <p className="text-xs text-slate-400">
                  Calcula con precisión las gotas de aceites esenciales y ml de Aceite Fraccionado de Coco (FCO) según la concentración deseada.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bottle Size Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  1. Tamaño del Frasco Roll-on:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 30].map((size) => (
                    <button
                      key={size}
                      onClick={() => setCalcBottleSize(size)}
                      className={`py-3 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                        calcBottleSize === size
                          ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d] shadow-md shadow-[#e0a96d]/20'
                          : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {size} ml
                    </button>
                  ))}
                </div>
              </div>

              {/* Dilution Percent Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  2. Porcentaje de Dilución:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { pct: 1, label: '1% (Sensible / Niños)' },
                    { pct: 2, label: '2% (Uso Diario Adulto)' },
                    { pct: 3, label: '3% (Perfumería)' },
                    { pct: 5, label: '5% (Dolor Agudo)' },
                    { pct: 10, label: '10% (Puntual Intenso)' }
                  ].map(({ pct }) => (
                    <button
                      key={pct}
                      onClick={() => setCalcDilutionPercent(pct)}
                      className={`py-3 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                        calcDilutionPercent === pct
                          ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d] shadow-md shadow-[#e0a96d]/20'
                          : 'bg-[#0b0c10] text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Result Display */}
            <div className="bg-gradient-to-r from-[#11131a] to-[#0b0c10] border border-[#e0a96d]/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                  Gotas de Aceite Esencial
                </span>
                <span className="text-3xl sm:text-4xl font-black text-[#e0a96d] font-outfit">
                  {calculatedDrops.essentialDrops} gotas
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  (divididas entre los aceites de tu mezcla)
                </span>
              </div>

              <div className="h-8 w-px bg-slate-800 hidden sm:block" />

              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                  Aceite Fraccionado de Coco (Portador)
                </span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-outfit">
                  ~{calculatedDrops.carrierMl} ml
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  (rellenar hasta el cuello de la botella)
                </span>
              </div>
            </div>
          </div>

          {/* Safety Knowledge Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fotosensibilidad */}
            <div className="bg-[#171a24] border border-amber-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Sun className="w-4 h-4" />
                <span>☀️ Fotosensibilidad</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Los cítricos prensados en frío (<strong>Limón, Bergamota, Toronja, Naranja</strong>) reaccionan con la radiación UV. <strong>Evita la luz solar directa durante 12 a 24 horas</strong> tras aplicarlos sobre la piel para prevenir manchas.
              </p>
            </div>

            {/* Aceites Calientes */}
            <div className="bg-[#171a24] border border-rose-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                <Flame className="w-4 h-4" />
                <span>🌶️ Aceites Calientes</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Orégano, Canela, Clavo, Tomillo</strong> y <strong>On Guard</strong> poseen fenoles intensos. <strong>Nunca aplicarlos puros sobre la piel</strong>; diluye siempre con aceite de coco fraccionado.
              </p>
            </div>

            {/* Zonas Prohibidas & Mascotas */}
            <div className="bg-[#171a24] border border-indigo-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>🛡️ Zonas y Mascotas</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jamás colocar aceites esenciales dentro de los ojos, conducto auditivo o heridas abiertas. Con gatos y perros pequeños, difunde en áreas ventiladas con puerta abierta.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 7. MODAL: DETALLES DE ACEITE ESENCIAL */}
      {/* ============================================================================ */}
      {selectedOilDetail && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30">
                  {selectedOilDetail.categoryLabel || selectedOilDetail.brand}
                </span>
                <h3 className="text-xl font-bold font-outfit text-slate-100 mt-1">
                  {selectedOilDetail.name}
                </h3>
                {selectedOilDetail.trademarkName && (
                  <span className="text-xs text-slate-400">{selectedOilDetail.trademarkName} {selectedOilDetail.botanicalName ? `(${selectedOilDetail.botanicalName})` : ''}</span>
                )}
              </div>
              <button
                onClick={() => setSelectedOilDetail(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#e0a96d] mb-1">
                  Perfil Emocional & Holístico
                </h4>
                <p className="text-xs text-slate-300 italic bg-[#0b0c10] p-3 rounded-xl border border-slate-800">
                  "{selectedOilDetail.emotionalProperty || selectedOilDetail.description}"
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Beneficios Principales
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedOilDetail.keyBenefits?.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">Aroma</span>
                  <span className="text-xs text-slate-200 font-semibold">{selectedOilDetail.aroma}</span>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">Sensibilidad Dérmica</span>
                  <span className="text-xs text-slate-200 font-semibold">
                    {selectedOilDetail.sensitivity === 'N' ? 'Neat (Puro)' : (selectedOilDetail.sensitivity === 'D' ? 'Diluir Siempre' : 'Piel Sensible')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleToggleInventory(selectedOilDetail);
                  setSelectedOilDetail(prev => ({ ...prev, inInventory: !prev.inInventory }));
                }}
                className={`text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors ${
                  selectedOilDetail.inInventory
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                    : 'btn-rose-gold'
                }`}
              >
                {selectedOilDetail.inInventory ? 'Quitar de Boticario' : 'Añadir a mi Boticario'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedOilDetail(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================================ */}
      {/* 8. MODAL: AGREGAR ACEITE PERSONALIZADO / DIY */}
      {/* ============================================================================ */}
      {isCustomOilModalOpen && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleSaveCustomOil} className="bg-[#171a24] border border-[#e0a96d]/40 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#e0a96d]" />
                <span>Agregar Aceite o Mezcla DIY</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsCustomOilModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-3 space-y-3 pr-1 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Aceite / Mezcla</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ylang Ylang o Roll-on Calma Total"
                  value={customOilForm.name}
                  onChange={(e) => setCustomOilForm({ ...customOilForm, name: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl py-2 px-3 text-slate-100 focus:outline-none focus:border-[#e0a96d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Categoría</label>
                  <select
                    value={customOilForm.category}
                    onChange={(e) => setCustomOilForm({ ...customOilForm, category: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option value="calm">Calma & Sueño</option>
                    <option value="focus">Enfoque & Energía</option>
                    <option value="mood">Emoción & Ánimo</option>
                    <option value="relief">Alivio & Tensión</option>
                    <option value="immunity">Inmunidad</option>
                    <option value="respiratory">Respiratorio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo</label>
                  <select
                    value={customOilForm.type}
                    onChange={(e) => setCustomOilForm({ ...customOilForm, type: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option value="single">Aceite Individual</option>
                    <option value="blend">Mezcla / Sinergia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Propiedad Emocional / Frase</label>
                <input
                  type="text"
                  placeholder="Ej. El aceite del amor propio y la apertura del corazón"
                  value={customOilForm.emotionalProperty}
                  onChange={(e) => setCustomOilForm({ ...customOilForm, emotionalProperty: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl py-2 px-3 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Beneficios (1 por renglón)</label>
                <textarea
                  rows="2"
                  placeholder="Alivia la ansiedad&#10;Regenera la piel"
                  value={customOilForm.keyBenefits}
                  onChange={(e) => setCustomOilForm({ ...customOilForm, keyBenefits: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl py-2 px-3 text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="photosens-check"
                  checked={customOilForm.photosensitive}
                  onChange={(e) => setCustomOilForm({ ...customOilForm, photosensitive: e.target.checked })}
                  className="rounded border-slate-700 text-[#e0a96d] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="photosens-check" className="text-amber-300 font-semibold cursor-pointer">
                  ¿Es fotosensible? (evitar sol tras uso tópico)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsCustomOilModalOpen(false)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-xl cursor-pointer shadow-md"
              >
                Guardar en Boticario
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ============================================================================ */}
      {/* 9. MODAL: CREAR MEZCLA PERSONALIZADA */}
      {/* ============================================================================ */}
      {isCustomRecipeModalOpen && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleSaveCustomRecipe} className="bg-[#171a24] border border-[#e0a96d]/40 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#e0a96d]" />
                <span>Crear Sinergia / Receta</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsCustomRecipeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-3 space-y-3 pr-1 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre de la Mezcla</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Noches de Seda o Focus Extremo"
                  value={customRecipeForm.name}
                  onChange={(e) => setCustomRecipeForm({ ...customRecipeForm, name: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl py-2 px-3 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Propósito / Intención</label>
                <input
                  type="text"
                  placeholder="Ej. Desconectar la mente para dormir profundo"
                  value={customRecipeForm.targetVibe}
                  onChange={(e) => setCustomRecipeForm({ ...customRecipeForm, targetVibe: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl py-2 px-3 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Ingredientes y Gotas (Formato: Aceite: Gotas)
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Lavanda: 4&#10;Cedro: 3&#10;Incienso: 2"
                  value={customRecipeForm.ingredientsText}
                  onChange={(e) => setCustomRecipeForm({ ...customRecipeForm, ingredientsText: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl py-2 px-3 text-slate-100 focus:outline-none resize-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsCustomRecipeModalOpen(false)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-xl cursor-pointer shadow-md"
              >
                Guardar Receta
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
