import React, { useState } from 'react';
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
  EyeOff
} from 'lucide-react';
import { compressImage, analyzeClothingImage } from '../utils/geminiService';

export default function WardrobeModule({
  wardrobe,
  setWardrobe,
  customOutfits,
  setCustomOutfits,
  showToast,
  geminiApiKey,
  setGeminiApiKey
}) {
  const [activeTab, setActiveTab] = useState('closet'); // 'closet' | 'outfits'
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
  
  // Add custom outfit form
  const [isAddingOutfit, setIsAddingOutfit] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [selectedGarments, setSelectedGarments] = useState([]);

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
      <div className="flex border-b border-[#e0a96d]/15">
        <button
          onClick={() => setActiveTab('closet')}
          className={`py-2 px-6 font-outfit text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'closet' 
              ? 'border-[#e0a96d] text-[#e0a96d]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          👚 Mi Armario ({wardrobe.length})
        </button>
        <button
          onClick={() => setActiveTab('outfits')}
          className={`py-2 px-6 font-outfit text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'outfits' 
              ? 'border-[#e0a96d] text-[#e0a96d]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ✨ Diseñador & Outfits
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
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#e0a96d]" />
                <span>Configurar Google Gemini AI</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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

            <div className="flex gap-2 justify-end pt-2">
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
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors"
              >
                Guardar Clave
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
