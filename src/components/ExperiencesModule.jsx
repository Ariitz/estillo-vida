import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Star,
  Filter,
  Heart,
  MapPin,
  ShoppingBag,
  Eye,
  Trash2,
  Calendar,
  Plus,
  HelpCircle,
  X,
  Search,
  Camera,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { compressImage, analyzeExperienceImage } from '../utils/geminiService';
import { sanitizeExperienceList, sanitizeExperienceItem } from '../utils/sanitizers';
import { findSimilarity } from '../utils/similarity';

export default function ExperiencesModule({
  experiences = [],
  setExperiences,
  showToast,
  geminiApiKey = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState('product'); // 'product' | 'place'
  const [category, setCategory] = useState('Cafeterías');
  const [status, setStatus] = useState('pending'); // 'pending' | 'completed'
  const [rating, setRating] = useState(5);
  const [cost, setCost] = useState('$$');
  const [verdict, setVerdict] = useState('yes'); // 'yes' | 'maybe' | 'no'
  const [placeOrBrand, setPlaceOrBrand] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [placeImage, setPlaceImage] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const editFileInputRef = useRef(null);

  const categories = [
    'Cafeterías',
    'Restaurantes',
    'Skincare & Cosmética',
    'Cuidado Personal',
    'Tiendas Especializadas',
    'Viajes & Hoteles',
    'Libros & Entretenimiento',
    'Otros'
  ];

  // Handle Photo Upload with Multimodal AI Vision
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzingImage(true);
      showToast('info', 'Analizando Lugar con IA', 'Reconociendo monumento, restaurante o experiencia...');
      
      const { dataUrl, base64, mimeType } = await compressImage(file, 800, 0.75);
      setPlaceImage(dataUrl);

      const parsed = await analyzeExperienceImage(base64, mimeType, geminiApiKey);
      if (parsed.name) setName(parsed.name);
      if (parsed.type) setItemType(parsed.type);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.placeOrBrand) setPlaceOrBrand(parsed.placeOrBrand);
      if (parsed.cost) setCost(parsed.cost);
      if (parsed.notes) setNotes(parsed.notes);

      showToast('success', '¡Lugar Reconocido!', `Se identificó "${parsed.name}" y se autollenaron los datos.`);
    } catch (err) {
      console.error('Experience vision error:', err);
      showToast('warning', 'Lectura de Imagen', err.message || 'No se pudo identificar el lugar automáticamente.');
    } finally {
      setIsAnalyzingImage(false);
      e.target.value = '';
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Scan for duplicate/similar experiences before adding manually
    const similar = findSimilarity(trimmedName, experiences, 'name');
    if (similar) {
      const proceed = window.confirm(
        `⚠️ Detectamos una experiencia o lugar similar en tu bitácora:\n\n` +
        `• Registrado: "${similar.name}" (${similar.placeOrBrand || similar.category || ''})\n` +
        `• Nuevo registro: "${trimmedName}"\n\n` +
        `¿Estás seguro de que deseas agregarlo de todos modos?`
      );
      if (!proceed) return;
    }

    const newItem = {
      id: 'exp-' + Date.now(),
      name: trimmedName,
      type: itemType,
      category,
      status,
      rating: status === 'completed' ? parseInt(rating, 10) : 0,
      cost,
      verdict: status === 'completed' ? verdict : 'maybe',
      placeOrBrand: placeOrBrand.trim(),
      date,
      notes: notes.trim(),
      image: placeImage || null
    };

    const sanitized = sanitizeExperienceItem(newItem);
    if (!sanitized) return;

    setExperiences(prev => [...(Array.isArray(prev) ? prev : []), sanitized]);
    setName('');
    setPlaceOrBrand('');
    setNotes('');
    setPlaceImage('');
    setIsAdding(false);
    showToast('success', 'Registro Guardado', `Se guardó "${trimmedName}" en tu bitácora.`);
  };

  const handleDeleteItem = (id, itemName) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${itemName || 'este registro'}" de tu bitácora?`)) {
      return;
    }
    setExperiences(prev => (Array.isArray(prev) ? prev : []).filter(item => item && item.id !== id));
    showToast('warning', 'Elemento Eliminado', `Se retiró "${itemName}" de tu bitácora.`);
  };

  const handleOpenEdit = (item) => {
    setEditingItem({
      id: item.id,
      name: item.name || '',
      type: item.type || 'place',
      category: item.category || 'Cafeterías',
      status: item.status || 'completed',
      rating: item.rating !== undefined ? item.rating : 5,
      cost: item.cost || '$$',
      verdict: item.verdict || 'yes',
      placeOrBrand: item.placeOrBrand || '',
      date: item.date || new Date().toISOString().split('T')[0],
      notes: item.notes || '',
      image: item.image || null
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const trimmedName = (editingItem.name || '').trim();
    if (!trimmedName) {
      showToast('error', 'Nombre Requerido', 'El nombre no puede estar vacío.');
      return;
    }

    const updatedObj = {
      ...editingItem,
      name: trimmedName,
      placeOrBrand: (editingItem.placeOrBrand || '').trim(),
      notes: (editingItem.notes || '').trim()
    };

    const sanitized = sanitizeExperienceItem(updatedObj);
    if (!sanitized) return;

    setExperiences(prev => (Array.isArray(prev) ? prev : []).map(i => (i && i.id === sanitized.id ? sanitized : i)));
    showToast('success', 'Entrada Actualizada', `Se guardaron los cambios para "${trimmedName}".`);
    setEditingItem(null);
  };

  const handleEditPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;
    try {
      const { dataUrl } = await compressImage(file, 800, 0.75);
      setEditingItem(prev => ({ ...prev, image: dataUrl }));
      showToast('success', 'Foto Cargada', 'Se actualizó la imagen de la experiencia.');
    } catch (err) {
      showToast('error', 'Error al procesar foto', err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleToggleStatus = (itemId) => {
    setExperiences(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
        showToast(
          'info', 
          nextStatus === 'completed' ? '¡Experiencia Probada!' : 'Pendiente por Probar', 
          `"${item.name}" cambió de estado.`
        );
        return { ...item, status: nextStatus };
      }
      return item;
    }));
  };

  const handleRate = (itemId, val) => {
    setExperiences(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        return { ...item, rating: val };
      }
      return item;
    }));
  };

  const handleUpdateNotes = (itemId, val) => {
    setExperiences(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        return { ...item, notes: String(val || '') };
      }
      return item;
    }));
  };

  const handleUpdateVerdict = (itemId, newVerdict) => {
    setExperiences(prev => (Array.isArray(prev) ? prev : []).map(item => {
      if (item && item.id === itemId) {
        return { ...item, verdict: newVerdict };
      }
      return item;
    }));
    const foundItem = experiences.find(e => e && e.id === itemId);
    const isPlace = foundItem?.type === 'place';
    const label = newVerdict === 'yes'
      ? (isPlace ? '👍 Volvería' : '👍 Compraría de nuevo')
      : newVerdict === 'maybe'
      ? '🤔 Duda'
      : (isPlace ? '👎 No volvería' : '👎 No compraría');
    showToast('success', 'Veredicto Actualizado', `Marcado como "${label}".`);
  };

  // Safe normalized experiences list & filter logic
  const safeExperiences = sanitizeExperienceList(experiences);

  const filtered = safeExperiences.filter(item => {
    if (!item) return false;
    const nameStr = String(item.name || '');
    const placeOrBrandStr = String(item.placeOrBrand || '');
    const notesStr = String(item.notes || '');
    const search = String(searchTerm || '').toLowerCase().trim();

    const matchesSearch = !search ||
      nameStr.toLowerCase().includes(search) || 
      placeOrBrandStr.toLowerCase().includes(search) ||
      notesStr.toLowerCase().includes(search);
    
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesCat = catFilter === 'all' || item.category === catFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesVerdict = verdictFilter === 'all' || item.verdict === verdictFilter;

    return matchesSearch && matchesType && matchesCat && matchesStatus && matchesVerdict;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Advanced Filter Panel */}
      <div className="bg-[#171a24] border border-[#e0a96d]/15 p-5 rounded-xl space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, establecimiento, notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 text-sm focus:outline-none focus:border-[#e0a96d] transition-colors"
            />
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all self-stretch md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Entrada</span>
          </button>
        </div>

        {/* Filter selectors row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#0b0c10] border border-slate-800 rounded py-1.5 px-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="product">📦 Producto</option>
              <option value="place">📍 Lugar / Establecimiento</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría</label>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full bg-[#0b0c10] border border-slate-800 rounded py-1.5 px-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#0b0c10] border border-slate-800 rounded py-1.5 px-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">⏳ Deseado / Wishlist</option>
              <option value="completed">✓ Visitado / Comprado</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Veredicto</label>
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="w-full bg-[#0b0c10] border border-slate-800 rounded py-1.5 px-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Todos los veredictos</option>
              <option value="yes">👍 Volvería / Compraría de nuevo</option>
              <option value="maybe">🤔 Duda</option>
              <option value="no">👎 No volvería / No compraría</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Entry Form */}
      {isAdding && (
        <form onSubmit={handleAddItem} className="bg-[#171a24] border border-[#e0a96d]/20 p-6 rounded-xl space-y-4 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-100 font-outfit flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#e0a96d]" />
              <span>Añadir Entrada en la Bitácora</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Captura manual o automática por foto del lugar
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

            {placeImage ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#e0a96d]/40 shrink-0 group">
                <img src={placeImage} alt="Lugar o Producto" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPlaceImage('')}
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
                    <span>Reconociendo lugar con IA...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-[#e0a96d]" />
                    <span>Tomar / Subir Foto del Lugar o Platillo</span>
                  </>
                )}
              </button>
            )}

            <div className="flex-1 text-center sm:text-left">
              {isAnalyzingImage ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#e0a96d] animate-pulse">
                    🤖 Gemini IA está identificando el lugar...
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Reconociendo arquitectura, nombre oficial, ubicación geográfica y categoría.
                  </p>
                </div>
              ) : placeImage ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ✓ Lugar Reconocido por Visión IA
                  </span>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Verifica la información autollenada antes de guardar en tu bitácora.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-200">
                    ¿Tomaste foto de Bellas Artes, un museo, café o platillo?
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Sube la foto y la IA identificará el lugar exacto, zona y categoría automáticamente.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre / Título</label>
              <input
                type="text"
                placeholder="Ej. Palacio de Bellas Artes, Tarta de Lichi..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                required
              />
              {(() => {
                const sim = findSimilarity(name, experiences, 'name');
                if (!sim) return null;
                return (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5 animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                    <span>
                      Probablemente ya existe: <strong>"{sim.name}"</strong> ({sim.placeOrBrand || sim.category}).
                    </span>
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Registro</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setItemType('product')}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all cursor-pointer ${
                    itemType === 'product'
                      ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                      : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  📦 Producto
                </button>
                <button
                  type="button"
                  onClick={() => setItemType('place')}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all cursor-pointer ${
                    itemType === 'place'
                      ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                      : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  📍 Establecimiento
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Establecimiento / Marca</label>
              <input
                type="text"
                placeholder="Ej. L'Occitane / Cafetería Centro"
                value={placeOrBrand}
                onChange={(e) => setPlaceOrBrand(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Estado inicial</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all cursor-pointer ${
                    status === 'pending'
                      ? 'bg-[#e0a96d]/25 text-[#e0a96d] border-[#e0a96d]/30'
                      : 'bg-[#0b0c10] border-slate-800 text-slate-400'
                  }`}
                >
                  ⏳ Wishlist
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('completed')}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all cursor-pointer ${
                    status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-[#0b0c10] border-slate-800 text-slate-400'
                  }`}
                >
                  ✓ Ya Comprado / Fui
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Rango de Costo</label>
              <div className="flex gap-2">
                {['$', '$$', '$$$'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCost(c)}
                    className={`flex-1 text-xs font-black py-2 rounded-lg border transition-all cursor-pointer ${
                      cost === c
                        ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                        : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {status === 'completed' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-[#0b0c10] rounded-lg border border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Calificación (1-5)</label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRating(val)}
                      className="cursor-pointer text-slate-600 hover:text-amber-400"
                    >
                      <Star className={`w-6 h-6 ${val <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Veredicto Final</label>
                <select
                  value={verdict}
                  onChange={(e) => setVerdict(e.target.value)}
                  className="w-full bg-[#171a24] border border-[#e0a96d]/10 rounded py-1.5 px-2 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="yes">{itemType === 'place' ? '👍 Volvería' : '👍 Compraría de nuevo'}</option>
                  <option value="maybe">🤔 Duda</option>
                  <option value="no">{itemType === 'place' ? '👎 No volvería' : '👎 No compraría'}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Fecha de Visita</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#171a24] border border-[#e0a96d]/10 rounded py-1.5 px-2 text-xs text-slate-300 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Notas de Experiencia / Descripción</label>
            <textarea
              placeholder="Ej. El olor de almendras dura todo el día y deja la piel aterciopelada..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg cursor-pointer transition-all"
            >
              Guardar Entrada
            </button>
          </div>
        </form>
      )}

      {/* Grid of logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-[#171a24] p-12 text-center rounded-xl border border-slate-800">
            <HelpCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No se encontraron experiencias en la bitácora.</p>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="bg-[#171a24] border border-[#e0a96d]/15 p-5 rounded-xl flex flex-col justify-between shadow-lg relative">
              
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#e0a96d] bg-[#e0a96d]/10 px-2 py-0.5 rounded border border-[#e0a96d]/10">
                      {item.category}
                    </span>
                    <h4 className="text-base font-bold text-slate-100 font-outfit mt-2">{item.name}</h4>
                  </div>
                  
                  {/* Actions: Edit & Delete buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-[#e0a96d] hover:bg-[#e0a96d]/10 rounded-lg cursor-pointer transition-all"
                      title="Editar experiencia"
                      aria-label={`Editar ${item.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all"
                      title="Eliminar experiencia"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Place or Product Image if present */}
                {item.image && (
                  <div className="w-full h-36 rounded-lg overflow-hidden border border-[#e0a96d]/20 mt-2.5 mb-1 group relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  {item.type === 'place' ? (
                    <MapPin className="w-3.5 h-3.5 text-[#e0a96d] shrink-0" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5 text-[#e0a96d] shrink-0" />
                  )}
                  <span className="truncate">{item.placeOrBrand}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[#e0a96d] font-bold">{item.cost}</span>
                </div>

                {/* Rating & Verdict for Completed, Wishlist toggle for Pending */}
                {item.status === 'completed' ? (
                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-0.5" title={`Calificación: ${item.rating || 0}/5 estrellas`}>
                      {[1, 2, 3, 4, 5].map(v => (
                        <Star 
                          key={v} 
                          className={`w-3.5 h-3.5 cursor-pointer ${
                            v <= (item.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                          }`}
                          onClick={() => handleRate(item.id, v)}
                        />
                      ))}
                    </div>
                    
                    {/* Direct Verdict Dropdown Selector */}
                    <div className="relative">
                      <select
                        value={item.verdict || 'yes'}
                        onChange={(e) => handleUpdateVerdict(item.id, e.target.value)}
                        className={`text-[10px] font-bold py-1 pl-2.5 pr-6 rounded-lg border appearance-none cursor-pointer focus:outline-none transition-all ${
                          item.verdict === 'yes'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50'
                            : item.verdict === 'maybe'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:border-amber-500/50'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:border-rose-500/50'
                        }`}
                        title="Cambiar veredicto de la experiencia"
                        aria-label="Veredicto de la experiencia"
                      >
                        <option value="yes" className="bg-[#171a24] text-emerald-400">
                          {item.type === 'place' ? '👍 Volvería' : '👍 Compraría de nuevo'}
                        </option>
                        <option value="maybe" className="bg-[#171a24] text-amber-400">
                          🤔 Duda
                        </option>
                        <option value="no" className="bg-[#171a24] text-rose-400">
                          {item.type === 'place' ? '👎 No volvería' : '👎 No compraría'}
                        </option>
                      </select>
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400">
                        ▼
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 bg-[#0b0c10] border border-[#e0a96d]/10 px-3 py-1.5 rounded flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Heart className="w-3 h-3 text-[#e0a96d]" /> En Wishlist
                    </span>
                    <button
                      onClick={() => handleToggleStatus(item.id)}
                      className="text-[10px] text-[#e0a96d] hover:text-[#f5d4af] font-bold cursor-pointer transition-colors"
                    >
                      Marcar como visitado/comprado
                    </button>
                  </div>
                )}

                {/* Notes Input */}
                <div className="mt-4">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Notas de experiencia</span>
                  <textarea
                    value={item.notes}
                    onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                    placeholder="Escribe tu reseña..."
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/10 rounded-lg p-2 text-slate-300 text-xs focus:outline-none focus:border-[#e0a96d]/30 mt-1 h-14 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Card Footer (Date for Completed + Edit action) */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                {item.status === 'completed' && item.date ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Calendar className="w-3 h-3 text-[#e0a96d]" />
                    <span>Visitado el: {item.date}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">Pendiente de visita</span>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="text-xs text-slate-300 hover:text-slate-100 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1 rounded-lg bg-[#0b0c10] border border-[#e0a96d]/20 hover:border-[#e0a96d]/50"
                  title="Editar detalles completos"
                >
                  <Pencil className="w-3 h-3 text-[#e0a96d]" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Full Edit Experience Modal Dialog */}
      {editingItem && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleSaveEdit} className="bg-[#171a24] border border-[#e0a96d]/25 rounded-2xl p-6 max-w-xl w-full shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e0a96d]/15 flex items-center justify-center text-[#e0a96d] border border-[#e0a96d]/30">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-outfit">
                    Editar Entrada de Bitácora
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Modifica los detalles, veredicto, calificación o notas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Photo Upload / Preview in Edit Modal */}
              <div className="p-3 bg-[#0b0c10] border border-[#e0a96d]/25 rounded-xl flex items-center gap-3">
                <input
                  type="file"
                  ref={editFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleEditPhotoUpload}
                />
                {editingItem.image ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#e0a96d]/40 shrink-0 group">
                    <img src={editingItem.image} alt="Foto" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, image: null })}
                      className="absolute top-1 right-1 p-1 rounded-md bg-[#0b0c10]/80 text-rose-400 hover:text-rose-200 cursor-pointer"
                      title="Quitar foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-600 shrink-0 bg-[#171a24]">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-200">Foto del lugar o producto</p>
                  <p className="text-[10px] text-slate-400 mb-2">Agrega o cambia la foto representativa</p>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-[#e0a96d] hover:text-[#f5d4af] bg-[#e0a96d]/10 hover:bg-[#e0a96d]/20 border border-[#e0a96d]/30 px-2.5 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5 w-fit"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{editingItem.image ? 'Cambiar Foto' : 'Subir Foto'}</span>
                  </button>
                </div>
              </div>

              {/* Title / Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre / Título</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="Ej. Café Revolución"
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>

              {/* Type & Place/Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Registro</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, type: 'product' })}
                      className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all cursor-pointer ${
                        editingItem.type === 'product'
                          ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                          : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      📦 Producto
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, type: 'place' })}
                      className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all cursor-pointer ${
                        editingItem.type === 'place'
                          ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                          : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      📍 Establecimiento
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Establecimiento / Marca / Zona</label>
                  <input
                    type="text"
                    value={editingItem.placeOrBrand}
                    onChange={(e) => setEditingItem({ ...editingItem, placeOrBrand: e.target.value })}
                    placeholder="Ej. San Ángel, Loreto, etc."
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>
              </div>

              {/* Category, Status & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estado</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, status: 'pending' })}
                      className={`flex-1 text-[11px] font-bold py-2 rounded-lg border transition-all cursor-pointer ${
                        editingItem.status === 'pending'
                          ? 'bg-[#e0a96d]/25 text-[#e0a96d] border-[#e0a96d]/30'
                          : 'bg-[#0b0c10] border-slate-800 text-slate-400'
                      }`}
                    >
                      ⏳ Wishlist
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, status: 'completed' })}
                      className={`flex-1 text-[11px] font-bold py-2 rounded-lg border transition-all cursor-pointer ${
                        editingItem.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#0b0c10] border-slate-800 text-slate-400'
                      }`}
                    >
                      ✓ Fui / Probé
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rango de Costo</label>
                  <div className="flex gap-1.5">
                    {['$', '$$', '$$$'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, cost: c })}
                        className={`flex-1 text-xs font-black py-2 rounded-lg border transition-all cursor-pointer ${
                          editingItem.cost === c
                            ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]'
                            : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* If completed, show Rating, Verdict, and Date */}
              {editingItem.status === 'completed' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#0b0c10] rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Calificación (1-5)</label>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEditingItem({ ...editingItem, rating: val })}
                          className="cursor-pointer text-slate-600 hover:text-amber-400"
                        >
                          <Star className={`w-5 h-5 ${val <= (editingItem.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Veredicto Final</label>
                    <select
                      value={editingItem.verdict || 'yes'}
                      onChange={(e) => setEditingItem({ ...editingItem, verdict: e.target.value })}
                      className="w-full bg-[#171a24] border border-[#e0a96d]/10 rounded py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-[#e0a96d]"
                    >
                      <option value="yes">{editingItem.type === 'place' ? '👍 Volvería' : '👍 Compraría de nuevo'}</option>
                      <option value="maybe">🤔 Duda</option>
                      <option value="no">{editingItem.type === 'place' ? '👎 No volvería' : '👎 No compraría'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Fecha de Visita</label>
                    <input
                      type="date"
                      value={editingItem.date || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                      className="w-full bg-[#171a24] border border-[#e0a96d]/10 rounded py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-[#e0a96d]"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notas de Experiencia / Reseña</label>
                <textarea
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  placeholder="Escribe tu reseña, qué pediste, qué te pareció..."
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-24 resize-none"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800 shrink-0 mt-4">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
