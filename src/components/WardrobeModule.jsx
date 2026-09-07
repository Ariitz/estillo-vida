import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Shirt, 
  Check, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Heart, 
  Award, 
  RefreshCw, 
  X, 
  Sparkles,
  Camera,
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  Key,
  Eye,
  EyeOff,
  Briefcase,
  Compass,
  CheckCircle2,
  BookmarkPlus,
  ArrowRight,
  Wand2,
  Calendar,
  Layers
} from 'lucide-react';
import { compressImage, analyzeClothingImage, recommendOutfitForOccasion } from '../utils/geminiService';

export default function WardrobeModule({
  wardrobe,
  setWardrobe,
  customOutfits,
  setCustomOutfits,
  showToast,
  geminiApiKey,
  setGeminiApiKey
}) {
  const [activeTab, setActiveTab] = useState('closet'); // 'closet' | 'stylist' | 'outfits'
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Add garment form
  const [isAddingGarment, setIsAddingGarment] = useState(false);
  const [gName, setGName] = useState('');
  const [gCategory, setGCategory] = useState('tops');
  const [gColor, setGColor] = useState('');
  const [gTags, setGTags] = useState('');
  const [gImage, setGImage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Gemini API Key inline modal
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [showTempKey, setShowTempKey] = useState(false);

  // Lock body scroll when API Key modal is open
  useEffect(() => {
    if (showApiKeyModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showApiKeyModal]);
  
  // Add custom outfit form
  const [isAddingOutfit, setIsAddingOutfit] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [selectedGarments, setSelectedGarments] = useState([]);

  // AI Stylist by Occasion states
  const [selectedOccasionPreset, setSelectedOccasionPreset] = useState('Junta de Trabajo / Ejecutiva');
  const [customOccasion, setCustomOccasion] = useState('');
  const [isGeneratingOutfit, setIsGeneratingOutfit] = useState(false);
  const [recommendedOutfit, setRecommendedOutfit] = useState(null);

  const presetOccasions = [
    { id: 'work', label: 'Junta de Trabajo / Ejecutiva', icon: '💼', desc: 'Formal, pulcro y estructurado' },
    { id: 'cafe', label: 'Café de Negocios / Casual', icon: '☕', desc: 'Smart casual moderno y relajado' },
    { id: 'creative', label: 'Reunión Creativa / Tech Chic', icon: '🎨', desc: 'Expresivo con toques de diseño' },
    { id: 'dinner', label: 'Cena / Salida Social', icon: '🍷', desc: 'Elegante, sobrio y sofisticado' },
    { id: 'comfort', label: 'Día Casual / Home Office', icon: '🌿', desc: 'Máximo confort y silueta limpia' },
    { id: 'gala', label: 'Evento Especial / Gala', icon: '✨', desc: 'Impecable y distinguido' }
  ];

  const cleanGarments = wardrobe.filter(item => item.isClean);
  const cleanCountByCategory = {
    tops: cleanGarments.filter(g => g.category === 'tops').length,
    bottoms: cleanGarments.filter(g => g.category === 'bottoms').length,
    outerwear: cleanGarments.filter(g => g.category === 'outerwear').length,
    footwear: cleanGarments.filter(g => g.category === 'footwear').length,
    accessories: cleanGarments.filter(g => g.category === 'accessories').length
  };

  const categories = {
    tops: 'Tops / Camisas / Playeras',
    bottoms: 'Pantalones / Cargo / Leggings',
    outerwear: 'Abrigos / Sudaderas / Blazers',
    footwear: 'Calzado / Botas / Tenis',
    accessories: 'Accesorios / Mochilas / Joyas'
  };

  const careAlerts = [
    {
      id: 1,
      title: "Cuidado de Estampados Vinilos (Geek/Anime)",
      desc: "Evita rociar loción o perfume directamente sobre estampados. Plancha siempre al revés a temperatura baja para prevenir cuarteaduras.",
      type: "warning"
    },
    {
      id: 2,
      title: "Limpieza de Gorros y Donas de Satén",
      desc: "Lava a mano con agua fría y champú suave. No exprimas con fuerza para evitar fracturar la fibra brillosa.",
      type: "info"
    },
    {
      id: 3,
      title: "Leggings de Compresión Gruesos",
      desc: "Lava sin suavizante de telas para mantener la elasticidad y la transpirabilidad de las fibras de poliéster/spandex.",
      type: "info"
    }
  ];

  // Predefined Look Definitions (based on name mapping)
  const predefinedLooks = [
    {
      id: 'look-geek-chic',
      name: 'Look Geek Chic Estructurado',
      description: 'Playera anime fajada en pantalón cargo negro + Blazer oscuro estructurado + Tenis blancos limpios + Lentes de pasta gruesa.',
      items: [
        { name: 'Playera de Evangelion Eva-01', category: 'tops' },
        { name: 'Pantalón Cargo Tiro Alto', category: 'bottoms' },
        { name: 'Blazer Estructurado Joya', category: 'outerwear' },
        { name: 'Tenis Blancos Limpios', category: 'footwear' },
        { name: 'Mochila Reforzada Doble Laptop', category: 'accessories' }
      ]
    },
    {
      id: 'look-confort',
      name: 'Look Confort & Silueta',
      description: 'Leggings de compresión gruesos + Sudadera/Hoodie holgada + Botas de piel + Scrunchie de satén.',
      items: [
        { name: 'Leggings de Compresión Gruesos', category: 'bottoms' },
        { name: 'Sudadera Oversize Gris con Forro Satén', category: 'outerwear' },
        { name: 'Botas de Piel', category: 'footwear' },
        { name: 'Scrunchie de Satén', category: 'accessories' }
      ]
    }
  ];

  // AI Image analysis handler
  const runAiAnalysis = async (base64, mimeType) => {
    if (!geminiApiKey?.trim()) {
      setShowApiKeyModal(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeClothingImage(base64, mimeType, geminiApiKey);
      if (result.name) setGName(result.name);
      if (result.category) setGCategory(result.category);
      if (result.color) setGColor(result.color);
      if (result.tags?.length > 0) setGTags(result.tags.join(', '));
      showToast('success', 'Prenda Reconocida con IA', `Gemini clasificó: "${result.name}"`);
    } catch (err) {
      console.error('AI analysis error:', err);
      showToast('error', 'Fallo de Análisis IA', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('info', 'Procesando Foto', 'Comprimiendo imagen...');
      const { dataUrl, base64, mimeType } = await compressImage(file);
      setGImage(dataUrl);

      if (geminiApiKey?.trim()) {
        await runAiAnalysis(base64, mimeType);
      } else {
        showToast('info', 'Foto Cargada', 'Configura tu Gemini API Key para autollenar detalles automáticamente con IA.');
      }
    } catch (err) {
      console.error('Image compression error:', err);
      showToast('error', 'Error de Imagen', err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleReanalyze = async () => {
    if (!gImage) return;
    const base64 = gImage.split(',')[1];
    const mimeType = gImage.split(';')[0].replace('data:', '') || 'image/jpeg';
    await runAiAnalysis(base64, mimeType);
  };

  const handleAddGarment = (e) => {
    e.preventDefault();
    if (!gName.trim()) return;

    const tagsArr = gTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const newGarment = {
      id: Date.now().toString(),
      name: gName,
      category: gCategory,
      isClean: true,
      color: gColor || 'Varios',
      tags: tagsArr,
      image: gImage || null
    };

    setWardrobe([...wardrobe, newGarment]);
    setGName('');
    setGColor('');
    setGTags('');
    setGImage('');
    setIsAddingGarment(false);
    showToast('success', 'Prenda Registrada', `Se añadió "${gName}" a tu Armario.`);
  };

  const handleToggleClean = (id) => {
    setWardrobe(wardrobe.map(item => {
      if (item.id === id) {
        const nextState = !item.isClean;
        showToast(
          'info', 
          nextState ? 'Prenda Limpia' : 'En Lavandería', 
          `"${item.name}" cambió de estado.`
        );
        return { ...item, isClean: nextState };
      }
      return item;
    }));
  };

  const handleDeleteGarment = (id, name) => {
    setWardrobe(wardrobe.filter(item => item.id !== id));
    showToast('warning', 'Prenda Eliminada', `Se retiró "${name}" de tu inventario.`);
  };

  // Add custom outfit
  const handleAddOutfit = (e) => {
    e.preventDefault();
    if (!outfitName.trim() || selectedGarments.length === 0) return;

    const newOutfit = {
      id: Date.now().toString(),
      name: outfitName,
      garmentIds: selectedGarments
    };

    setCustomOutfits([...customOutfits, newOutfit]);
    setOutfitName('');
    setSelectedGarments([]);
    setIsAddingOutfit(false);
    showToast('success', 'Outfit Creado', `Se guardó tu combinación "${outfitName}"`);
  };

  const handleDeleteOutfit = (id, name) => {
    setCustomOutfits(customOutfits.filter(o => o.id !== id));
    showToast('warning', 'Outfit Eliminado', `Se eliminó la combinación "${name}"`);
  };

  const handleSelectGarmentForOutfit = (id) => {
    if (selectedGarments.includes(id)) {
      setSelectedGarments(selectedGarments.filter(gid => gid !== id));
    } else {
      setSelectedGarments([...selectedGarments, id]);
    }
  };

  // AI Stylist Handlers
  const handleGenerateOutfit = async (overrideOccasion) => {
    const occasionToUse = overrideOccasion || customOccasion.trim() || selectedOccasionPreset;
    if (!occasionToUse) {
      showToast('warning', 'Ocasión Requerida', 'Elige o describe el tipo de reunión o evento.');
      return;
    }

    if (cleanGarments.length === 0) {
      showToast('error', 'Sin Ropa Limpia', 'No tienes prendas marcadas como limpias actualmente en tu armario.');
      return;
    }

    setIsGeneratingOutfit(true);
    try {
      showToast('info', 'Consultando a tu Estilista IA', `Diseñando look para "${occasionToUse}"...`);
      const result = await recommendOutfitForOccasion(cleanGarments, occasionToUse, geminiApiKey);
      setRecommendedOutfit(result);
      showToast('success', '¡Outfit Armado!', `Se diseñó "${result.outfitName}" con tus prendas limpias.`);
    } catch (err) {
      console.error('Stylist error:', err);
      showToast('error', 'Error del Estilista', err.message);
    } finally {
      setIsGeneratingOutfit(false);
    }
  };

  const handleSaveRecommendedOutfit = () => {
    if (!recommendedOutfit || !recommendedOutfit.selectedGarmentIds?.length) return;
    const newOutfit = {
      id: Date.now().toString(),
      name: recommendedOutfit.outfitName,
      garmentIds: recommendedOutfit.selectedGarmentIds
    };
    setCustomOutfits([...customOutfits, newOutfit]);
    showToast('success', 'Outfit Guardado', `"${recommendedOutfit.outfitName}" se guardó en tus combinaciones.`);
  };

  const handleWearOutfit = () => {
    if (!recommendedOutfit || !recommendedOutfit.selectedGarmentIds?.length) return;
    
    const count = recommendedOutfit.selectedGarmentIds.length;
    const updated = wardrobe.map(g => {
      if (recommendedOutfit.selectedGarmentIds.includes(g.id)) {
        return { ...g, isClean: false };
      }
      return g;
    });

    setWardrobe(updated);
    showToast('info', '¡Que tengas excelente reunión!', `${count} prendas del outfit pasaron a "En Lavandería / Sucia".`);
  };

  // Helper to trace look items in current wardrobe
  const resolveLookStatus = (lookItems) => {
    let resolved = [];
    let allAvailable = true;
    let anyDirty = false;

    lookItems.forEach(reqItem => {
      // Find matches in wardrobe
      // Try exact name or category match
      const match = wardrobe.find(w => 
        w.name.toLowerCase().includes(reqItem.name.toLowerCase()) || 
        (w.category === reqItem.category && w.name.toLowerCase().includes(reqItem.name.split(' ')[0].toLowerCase()))
      );

      if (match) {
        resolved.push({
          required: reqItem.name,
          found: match.name,
          isClean: match.isClean,
          available: true
        });
        if (!match.isClean) anyDirty = true;
      } else {
        resolved.push({
          required: reqItem.name,
          found: 'No se encontró prenda similar',
          isClean: false,
          available: false
        });
        allAvailable = false;
      }
    });

    return { items: resolved, allAvailable, anyDirty };
  };

  // Filter garments
  const filteredGarments = wardrobe.filter(item => {
    return categoryFilter === 'all' || item.category === categoryFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Tabs */}
      <div className="flex flex-wrap border-b border-[#e0a96d]/15 gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('closet')}
          className={`py-2.5 px-4 font-outfit text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'closet' 
              ? 'border-[#e0a96d] text-[#e0a96d]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>👚</span>
          <span>Mi Armario ({wardrobe.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stylist')}
          className={`py-2.5 px-4 font-outfit text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'stylist' 
              ? 'border-[#e0a96d] text-[#e0a96d]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#e0a96d]" />
          <span>Estilista IA por Ocasión</span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.2 rounded-full font-mono">
            {cleanGarments.length} limpias
          </span>
        </button>

        <button
          onClick={() => setActiveTab('outfits')}
          className={`py-2.5 px-4 font-outfit text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'outfits' 
              ? 'border-[#e0a96d] text-[#e0a96d]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>👗</span>
          <span>Mis Outfits & Sugerencias</span>
        </button>
      </div>

      {/* View: CLOSET INVENTORY */}
      {activeTab === 'closet' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Care Alerts Panel (Left Side on Large Screens) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#171a24] border border-[#e0a96d]/15 p-5 rounded-xl">
              <h4 className="text-xs font-bold text-[#e0a96d] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Alertas de Cuidado Textil
              </h4>
              <div className="space-y-4">
                {careAlerts.map(alert => (
                  <div key={alert.id} className="p-3 bg-[#0b0c10] border border-[#e0a96d]/10 rounded-lg text-xs">
                    <h5 className="font-bold text-[#e0a96d] mb-1">{alert.title}</h5>
                    <p className="text-slate-400 leading-relaxed">{alert.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => setIsAddingGarment(!isAddingGarment)}
                className="w-full btn-rose-gold text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Prenda</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempApiKey(geminiApiKey || '');
                  setShowApiKeyModal(true);
                }}
                className="w-full bg-[#0b0c10] hover:bg-slate-800 border border-[#e0a96d]/20 text-slate-300 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-all"
              >
                <span className="flex items-center gap-1.5 text-xs text-[#e0a96d]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>IA Gemini</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  geminiApiKey?.trim()
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {geminiApiKey?.trim() ? 'Activa' : 'Configurar'}
                </span>
              </button>
            </div>
          </div>

          {/* Garments Display (Right Side) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Quick Stylist Banner */}
            <div className="bg-gradient-to-r from-[#171a24] via-[#1c1f2e] to-[#171a24] border border-[#e0a96d]/20 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#e0a96d]/10 border border-[#e0a96d]/25 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[#e0a96d]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 font-outfit">¿Tienes una reunión hoy?</h4>
                  <p className="text-[11px] text-slate-400">
                    Tienes <span className="text-emerald-400 font-semibold">{cleanGarments.length} prendas limpias</span> listas. Deja que tu Estilista IA arme el conjunto perfecto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('stylist')}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Armar Outfit con IA</span>
              </button>
            </div>

            {/* Category selection row */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`text-xs font-bold py-1.5 px-4 rounded-full border shrink-0 transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                    : 'bg-[#171a24] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Todas
              </button>
              {Object.entries(categories).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`text-xs font-bold py-1.5 px-4 rounded-full border shrink-0 transition-all cursor-pointer ${
                    categoryFilter === key
                      ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                      : 'bg-[#171a24] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {label.split(' / ')[0]}
                </button>
              ))}
            </div>

            {/* Add Garment Form */}
            {isAddingGarment && (
              <form onSubmit={handleAddGarment} className="bg-[#171a24] border border-[#e0a96d]/20 p-5 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in shadow-xl">
                
                {/* Header & AI Quick Switch */}
                <div className="md:col-span-4 flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-sm font-bold text-slate-100 font-outfit flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-[#e0a96d]" />
                    <span>Nueva Prenda en el Armario</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setTempApiKey(geminiApiKey || '');
                      setShowApiKeyModal(true);
                    }}
                    className="text-[11px] text-[#e0a96d] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <Key className="w-3 h-3" />
                    <span>{geminiApiKey?.trim() ? 'API Key configurada' : 'Configurar Gemini API Key'}</span>
                  </button>
                </div>

                {/* Photo Upload & AI Scanner Area */}
                <div className="md:col-span-4 bg-[#0b0c10] border border-[#e0a96d]/15 rounded-xl p-4">
                  {gImage ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden border border-[#e0a96d]/30 bg-slate-900 shadow-md">
                        <img src={gImage} alt="Vista previa de la prenda" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setGImage('')}
                          className="absolute top-1 right-1 bg-rose-500/80 hover:bg-rose-600 text-white p-1 rounded-full shadow cursor-pointer transition-colors"
                          title="Eliminar foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex-1 text-center sm:text-left space-y-2">
                        {isAnalyzing ? (
                          <div className="space-y-1">
                            <span className="flex items-center gap-2 text-xs font-bold text-[#e0a96d] animate-pulse justify-center sm:justify-start">
                              <Loader2 className="w-4 h-4 animate-spin text-[#e0a96d]" />
                              <span>Gemini está analizando la prenda...</span>
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Detectando silueta, corte, textura, color y etiquetas de estilo.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 justify-center sm:justify-start">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Foto lista para tu armario</span>
                            </span>
                            <p className="text-[11px] text-slate-400">
                              La foto se guardará en la ficha de la prenda. Puedes pedirle a la IA que re-analice si ajustaste la foto.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                              <button
                                type="button"
                                onClick={handleReanalyze}
                                disabled={isAnalyzing}
                                className="bg-[#e0a96d]/10 hover:bg-[#e0a96d]/20 border border-[#e0a96d]/30 text-[#e0a96d] text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Re-analizar con IA</span>
                              </button>
                              <label className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                                <Camera className="w-3.5 h-3.5" />
                                <span>Cambiar foto</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="flex flex-col sm:flex-row items-center justify-center gap-4 p-5 border-2 border-dashed border-[#e0a96d]/25 hover:border-[#e0a96d] hover:bg-[#e0a96d]/5 rounded-xl cursor-pointer transition-all group">
                        <div className="p-3.5 bg-[#e0a96d]/10 text-[#e0a96d] rounded-full group-hover:scale-110 transition-transform">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="text-center sm:text-left">
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <span className="text-xs font-bold text-slate-100">
                              Subir foto o Tomar con la cámara
                            </span>
                            <span className="bg-[#e0a96d]/10 text-[#e0a96d] text-[10px] px-2 py-0.5 rounded-full font-bold border border-[#e0a96d]/20 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Autollenado con IA
                            </span>
                          </div>
                          <span className="block text-[11px] text-slate-400 mt-1">
                            Sube una foto de tu ropa y Gemini autocompletará el nombre, categoría, color y etiquetas.
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      
                      {!geminiApiKey && (
                        <div className="flex items-center justify-between text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg mt-3">
                          <span>Para autollenar automáticamente necesitas ingresar tu Gemini API Key (gratis).</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTempApiKey('');
                              setShowApiKeyModal(true);
                            }}
                            className="text-[#e0a96d] hover:underline font-bold ml-2 shrink-0 cursor-pointer"
                          >
                            Configurar clave &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre de la Prenda</label>
                  <input
                    type="text"
                    placeholder="Ej. Sudadera Oversize con Satén"
                    value={gName}
                    onChange={(e) => setGName(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
                  <select
                    value={gCategory}
                    onChange={(e) => setGCategory(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                  >
                    {Object.entries(categories).map(([key, val]) => (
                      <option key={key} value={key}>{val}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Color / Tono</label>
                  <input
                    type="text"
                    placeholder="Ej. Gris Jaspeado"
                    value={gColor}
                    onChange={(e) => setGColor(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Etiquetas (separadas por comas)</label>
                  <input
                    type="text"
                    placeholder="Ej. anime, algodón, holgado"
                    value={gTags}
                    onChange={(e) => setGTags(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>
                <div className="flex gap-2 items-end justify-end md:col-span-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingGarment(false);
                      setGImage('');
                    }}
                    className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <span>Guardar</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Garments Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredGarments.length === 0 ? (
                <div className="col-span-full bg-[#171a24] p-12 text-center rounded-xl border border-slate-800">
                  <Shirt className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No hay prendas registradas en esta sección.</p>
                </div>
              ) : (
                filteredGarments.map(item => (
                  <div key={item.id} className="bg-[#171a24] border border-[#e0a96d]/15 p-4 rounded-xl flex flex-col justify-between shadow-md group">
                    <div>
                      {item.image && (
                        <div className="w-full h-44 rounded-lg overflow-hidden mb-3 bg-[#0b0c10] relative border border-[#e0a96d]/10">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] uppercase font-bold text-slate-400 bg-[#0b0c10] px-2 py-0.5 rounded">
                          {categories[item.category]?.split(' / ')[0]}
                        </span>
                        
                        <button
                          onClick={() => handleToggleClean(item.id)}
                          className={`text-[9px] font-bold py-1 px-2.5 rounded-full border transition-all cursor-pointer ${
                            item.isClean 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {item.isClean ? '✓ Limpia' : '🧼 Sucia / Tintor'}
                        </button>
                      </div>
                      <h5 className="font-bold text-sm text-slate-100 font-outfit mt-2">{item.name}</h5>
                      <span className="text-xs text-slate-400 block mt-1">Color: {item.color}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1">
                      {item.tags.map(t => (
                        <span key={t} className="text-[9px] text-[#e0a96d] bg-[#e0a96d]/5 px-2 py-0.5 rounded-full border border-[#e0a96d]/10">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => handleDeleteGarment(item.id, item.name)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Eliminar prenda"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* View: AI STYLIST BY OCCASION */}
      {activeTab === 'stylist' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Hero Banner / Header */}
          <div className="bg-[#171a24] border border-[#e0a96d]/20 p-6 rounded-2xl relative overflow-hidden shadow-xl">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#e0a96d]/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-[#e0a96d]/10 border border-[#e0a96d]/25 text-[#e0a96d]">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-[#e0a96d] uppercase tracking-wider font-mono">
                    AURA Personal Stylist AI
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 font-outfit">
                  Estilista IA: Outfits por Ocasión & Reunión
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Indica qué tipo de reunión, junta o evento tienes hoy. La inteligencia artificial analizará tus <span className="text-emerald-400 font-semibold">{cleanGarments.length} prendas limpias</span> para armar una combinación óptima, cuidando etiqueta, paleta de color y estilo.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start md:self-center">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  geminiApiKey?.trim()
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${geminiApiKey?.trim() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{geminiApiKey?.trim() ? 'Gemini 3 Flash Conectado' : 'Modo Algorítmico Local'}</span>
                </span>
                {!geminiApiKey?.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempApiKey('');
                      setShowApiKeyModal(true);
                    }}
                    className="text-[10px] text-[#e0a96d] hover:underline font-bold"
                  >
                    Activar Gemini IA &rarr;
                  </button>
                )}
              </div>
            </div>

            {/* Clean garments availability bar */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 relative z-10">
              <div className="p-2.5 bg-[#0b0c10] border border-slate-800 rounded-lg text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Tops Limpios</span>
                <span className={`text-sm font-bold font-outfit ${cleanCountByCategory.tops > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {cleanCountByCategory.tops}
                </span>
              </div>
              <div className="p-2.5 bg-[#0b0c10] border border-slate-800 rounded-lg text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Pantalones Limpios</span>
                <span className={`text-sm font-bold font-outfit ${cleanCountByCategory.bottoms > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {cleanCountByCategory.bottoms}
                </span>
              </div>
              <div className="p-2.5 bg-[#0b0c10] border border-slate-800 rounded-lg text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Abrigos / Blazers</span>
                <span className={`text-sm font-bold font-outfit ${cleanCountByCategory.outerwear > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {cleanCountByCategory.outerwear}
                </span>
              </div>
              <div className="p-2.5 bg-[#0b0c10] border border-slate-800 rounded-lg text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Calzado Limpio</span>
                <span className={`text-sm font-bold font-outfit ${cleanCountByCategory.footwear > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {cleanCountByCategory.footwear}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-2.5 bg-[#0b0c10] border border-slate-800 rounded-lg text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Accesorios</span>
                <span className={`text-sm font-bold font-outfit ${cleanCountByCategory.accessories > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {cleanCountByCategory.accessories}
                </span>
              </div>
            </div>

            {/* Warning if 0 bottoms or 0 tops */}
            {(cleanCountByCategory.tops === 0 || cleanCountByCategory.bottoms === 0) && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-300 relative z-10">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  {cleanCountByCategory.bottoms === 0 && cleanCountByCategory.tops === 0
                    ? 'No tienes tops ni pantalones marcados como limpios. Puedes cambiar su estado a "Limpia" en la pestaña Mi Armario.'
                    : cleanCountByCategory.bottoms === 0
                    ? 'Nota: No tienes pantalones limpios. La IA intentará sugerir un look o puedes marcar alguno como limpio.'
                    : 'Nota: No tienes prendas superiores (tops) limpias registradas actualmente.'}
                </span>
              </div>
            )}
          </div>

          {/* Occasion Selector & Input Form */}
          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-2xl space-y-6 shadow-lg">
            <div>
              <label className="block text-xs font-bold text-[#e0a96d] uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>1. Elige una Ocasión o Tipo de Reunión</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {presetOccasions.map((occ) => {
                  const isSelected = selectedOccasionPreset === occ.label && !customOccasion.trim();
                  return (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => {
                        setSelectedOccasionPreset(occ.label);
                        setCustomOccasion('');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[#e0a96d]/10 border-[#e0a96d] shadow-md shadow-[#e0a96d]/5'
                          : 'bg-[#0b0c10] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xl shrink-0 p-1 rounded-lg bg-slate-900 border border-slate-800">
                        {occ.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h5 className={`text-xs font-bold font-outfit ${isSelected ? 'text-[#e0a96d]' : 'text-slate-200'}`}>
                          {occ.label}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {occ.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#e0a96d] shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Occasion Description Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#e0a96d] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                <span>2. O escribe detalles específicos de tu reunión (Opcional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej. Junta con inversionistas por la tarde en terraza templada, formal pero no acartonado..."
                  value={customOccasion}
                  onChange={(e) => setCustomOccasion(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl py-3 px-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#e0a96d] shadow-inner"
                />
                {customOccasion && (
                  <button
                    type="button"
                    onClick={() => setCustomOccasion('')}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                * Puedes especificar clima, lugar, nivel de jerarquía o requerimientos de confort.
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Solo se utilizarán prendas marcadas como <strong>limpias ({cleanGarments.length})</strong>.</span>
              </div>

              <button
                type="button"
                disabled={isGeneratingOutfit || cleanGarments.length === 0}
                onClick={() => handleGenerateOutfit()}
                className={`w-full sm:w-auto btn-rose-gold text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg ${
                  isGeneratingOutfit ? 'opacity-80 cursor-wait' : ''
                }`}
              >
                {isGeneratingOutfit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0b0c10]" />
                    <span>Diseñando Outfit con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#0b0c10]" />
                    <span>Armar Outfit para esta Reunión</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recommended Outfit Display */}
          {recommendedOutfit && (
            <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl p-6 space-y-6 shadow-2xl animate-fade-in">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#e0a96d] font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Propuesta de tu Estilista
                  </span>
                  <h4 className="text-xl font-bold text-slate-100 font-outfit">
                    {recommendedOutfit.outfitName}
                  </h4>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30 text-xs font-bold px-3 py-1 rounded-full">
                    {recommendedOutfit.formalityLevel || 'Smart Casual'}
                  </span>
                </div>
              </div>

              {/* Rationale & Tips Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0b0c10] border border-[#e0a96d]/15 rounded-xl space-y-1.5">
                  <span className="text-xs font-bold text-[#e0a96d] flex items-center gap-1.5 font-outfit">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Por qué funciona este look</span>
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {recommendedOutfit.styleRationale}
                  </p>
                </div>

                <div className="p-4 bg-[#0b0c10] border border-[#e0a96d]/15 rounded-xl space-y-1.5">
                  <span className="text-xs font-bold text-[#e0a96d] flex items-center gap-1.5 font-outfit">
                    <Award className="w-3.5 h-3.5" />
                    <span>Consejos de estilismo</span>
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {recommendedOutfit.stylingTips}
                  </p>
                </div>
              </div>

              {/* Garments Visual Grid */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#e0a96d]" />
                  <span>Prendas seleccionadas ({recommendedOutfit.selectedGarmentIds.length})</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {recommendedOutfit.selectedGarmentIds.map((garmentId) => {
                    const garment = wardrobe.find(g => g.id === garmentId);
                    if (!garment) return null;

                    return (
                      <div
                        key={garment.id}
                        className="bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl overflow-hidden shadow flex flex-col justify-between hover:border-[#e0a96d]/40 transition-all"
                      >
                        {/* Photo or placeholder */}
                        <div className="relative h-36 bg-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-800">
                          {garment.image ? (
                            <img
                              src={garment.image}
                              alt={garment.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Shirt className="w-12 h-12 text-slate-700" />
                          )}
                          <span className="absolute top-2 left-2 bg-[#0b0c10]/80 backdrop-blur-sm border border-slate-700 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded capitalize">
                            {categories[garment.category]?.split(' / ')[0] || garment.category}
                          </span>
                          <span className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                            <Check className="w-2.5 h-2.5" />
                            <span>Limpia</span>
                          </span>
                        </div>

                        {/* Details */}
                        <div className="p-3.5 space-y-2">
                          <h6 className="text-xs font-bold text-slate-100 font-outfit line-clamp-1">
                            {garment.name}
                          </h6>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Color:</span>
                            <span className="font-semibold text-slate-200">{garment.color}</span>
                          </div>

                          {garment.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {garment.tags.slice(0, 3).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] text-[#e0a96d] bg-[#e0a96d]/10 px-1.5 py-0.5 rounded border border-[#e0a96d]/20"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleGenerateOutfit()}
                  className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#e0a96d]" />
                  <span>Generar otra opción</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleWearOutfit}
                    className="border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Marca estas prendas como usadas / en lavandería"
                  >
                    <Shirt className="w-3.5 h-3.5 text-rose-400" />
                    <span>Vestir Outfit Hoy (Mover a Lavandería)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveRecommendedOutfit}
                    className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
                  >
                    <BookmarkPlus className="w-4 h-4 text-[#0b0c10]" />
                    <span>Guardar en Mis Outfits</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View: OUTFIT SUGGESTER / CREATOR */}
      {activeTab === 'outfits' && (
        <div className="space-y-8">
          
          {/* Predefined Looks Section */}
          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-slate-100 font-outfit mb-2 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-[#e0a96d]" /> Combinaciones Estilísticas Sugeridas
            </h3>
            <p className="text-xs text-slate-400 mb-6">Reglas de estilo que revisan automáticamente la disponibilidad limpia de tus prendas.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {predefinedLooks.map(look => {
                const statusInfo = resolveLookStatus(look.items);
                
                return (
                  <div key={look.id} className="bg-[#0b0c10] border border-[#e0a96d]/10 p-5 rounded-xl flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="font-bold text-sm text-[#e0a96d] font-outfit">{look.name}</h4>
                        {statusInfo.anyDirty ? (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/25 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            <span>Piezas Sucias</span>
                          </span>
                        ) : statusInfo.allAvailable ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9px] font-bold px-2 py-0.5 rounded">
                            ✓ Listo para Usar
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded">
                            Incompleto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{look.description}</p>
                      
                      <div className="mt-4 space-y-1.5">
                        {statusInfo.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-1 px-2 rounded hover:bg-slate-800/40">
                            <span className="text-slate-400 truncate max-w-[60%]">{it.required}</span>
                            {it.available ? (
                              <span className={`text-[10px] font-semibold ${it.isClean ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {it.isClean ? 'Limpia' : '⚠️ Tintor/Sucia'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic">No registrada</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 italic pt-2 border-t border-slate-900">
                      Ideal para: {look.id === 'look-geek-chic' ? 'Reuniones de trabajo o salidas de fin de semana' : 'Días de home office confortables.'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Outfits Section */}
          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-100 font-outfit">Mis Combinaciones Personalizadas</h3>
                <p className="text-xs text-slate-400 mt-1">Crea tus propios conjuntos organizados y dale seguimiento a su limpieza.</p>
              </div>
              <button
                onClick={() => setIsAddingOutfit(!isAddingOutfit)}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Diseñar Outfit</span>
              </button>
            </div>

            {/* Custom Outfit Builder Form */}
            {isAddingOutfit && (
              <form onSubmit={handleAddOutfit} className="mb-6 p-5 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Outfit</label>
                    <input
                      type="text"
                      placeholder="Ej. Look de Café de Especialidad"
                      value={outfitName}
                      onChange={(e) => setOutfitName(e.target.value)}
                      className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                      required
                    />
                  </div>
                  <div className="flex gap-2 items-end justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddingOutfit(false)}
                      className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
                    >
                      Guardar Outfit
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400">Selecciona prendas de tu armario:</label>
                  <div className="max-h-60 overflow-y-auto bg-[#171a24] p-3 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {wardrobe.map(item => {
                      const isSelected = selectedGarments.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectGarmentForOutfit(item.id)}
                          className={`text-left p-2.5 rounded border text-xs flex justify-between items-center transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#e0a96d]/10 border-[#e0a96d] text-slate-100' 
                              : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate pr-2">{item.name}</span>
                          <span className={`text-[9px] shrink-0 font-semibold px-1.5 py-0.5 rounded ${
                            item.isClean ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {item.isClean ? 'L' : 'S'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            )}

            {/* Custom Outfits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {customOutfits.length === 0 ? (
                <div className="col-span-full bg-[#0b0c10]/40 p-8 text-center rounded-xl border border-slate-800/80">
                  <p className="text-slate-500 text-xs italic">Aún no has diseñado combinaciones personalizadas.</p>
                </div>
              ) : (
                customOutfits.map(outfit => {
                  // Find all garments mapped
                  const gList = outfit.garmentIds.map(id => wardrobe.find(w => w.id === id)).filter(Boolean);
                  const anyDirty = gList.some(g => !g.isClean);
                  
                  return (
                    <div key={outfit.id} className="bg-[#0b0c10] border border-[#e0a96d]/10 p-5 rounded-xl flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-bold text-sm text-[#e0a96d] font-outfit">{outfit.name}</h4>
                          <button
                            onClick={() => handleDeleteOutfit(outfit.id, outfit.name)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                            aria-label={`Eliminar outfit ${outfit.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="mt-4 space-y-1.5">
                          {gList.map(g => (
                            <div key={g.id} className="flex items-center justify-between text-xs p-1 px-2 rounded bg-[#171a24]/50">
                              <span className="text-slate-300 truncate max-w-[70%]">{g.name}</span>
                              <span className={`text-[9px] font-bold ${g.isClean ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {g.isClean ? 'Limpia' : '🧼 Tintor'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                        {anyDirty ? (
                          <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Outfit Sucio
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Todo Limpio
                          </span>
                        )}
                        <span className="text-[9px] text-slate-500">{gList.length} Prendas</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* Gemini API Key Configuration Modal */}
      {showApiKeyModal && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#e0a96d]" />
                <span>Configurar Google Gemini AI</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
              <p className="text-xs text-slate-300 leading-relaxed">
                La clave de API permite que Google Gemini reconozca la foto de tu ropa y autollene su categoría, corte, colores y etiquetas de estilo automáticamente.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">Gemini API Key</label>
                  <button
                    type="button"
                    onClick={() => setShowTempKey(!showTempKey)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showTempKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showTempKey ? 'Ocultar' : 'Ver'}</span>
                  </button>
                </div>
                <input
                  type={showTempKey ? 'text' : 'password'}
                  placeholder="AIzaSy... o AQ.Ab..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-[#e0a96d]"
                />
              </div>

              <div className="p-3 bg-[#0b0c10] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">¿Cómo obtener tu clave?</span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Formatos AIzaSy... o AQ.Ab...
                  </span>
                </div>
                <p>
                  Entra a{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#e0a96d] hover:underline font-bold"
                  >
                    Google AI Studio
                  </a>{' '}
                  y genera tu clave gratuita. Al guardarla, se sincronizará automáticamente con todos tus dispositivos mediante tu nube de Firestore.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeminiApiKey(tempApiKey.trim());
                  setShowApiKeyModal(false);
                  showToast('success', 'Clave Guardada', 'Gemini AI está listo para analizar prendas.');
                  if (gImage && tempApiKey.trim()) {
                    handleReanalyze();
                  }
                }}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors shadow-md"
              >
                Guardar Clave
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
