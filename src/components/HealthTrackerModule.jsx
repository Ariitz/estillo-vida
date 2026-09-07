import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  Plus,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  X,
  HelpCircle,
  Car,
  Laptop,
  Flame,
  Droplets,
  HeartPulse,
  Calendar,
  Copy,
  Check,
  PlusCircle,
  TrendingUp,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { analyzeHealthSymptomWithGemini, generateFallbackHealthTriage } from '../utils/geminiService';

export default function HealthTrackerModule({
  healthSymptoms = [],
  setHealthSymptoms,
  geminiApiKey,
  showToast,
  onAddSelfCareActivity
}) {
  // Navigation & Filter states
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'pain_posture' | 'aesthetic_skin' | 'metabolism' | 'general'
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'treatment' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddingSymptom, setIsAddingSymptom] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState(null);
  const [selectedTriageSymptom, setSelectedTriageSymptom] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [copiedQuestions, setCopiedQuestions] = useState(false);

  // New symptom form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('pain_posture');
  const [newBodyZone, setNewBodyZone] = useState('Espalda baja / Lumbar');
  const [newPainLevel, setNewPainLevel] = useState(5);
  const [newTrigger, setNewTrigger] = useState('Al manejar');
  const [newCustomTrigger, setNewCustomTrigger] = useState('');
  const [newFrequency, setNewFrequency] = useState('Al realizar la actividad');
  const [newNotes, setNewNotes] = useState('');
  const [autoAnalyzeOnSave, setAutoAnalyzeOnSave] = useState(true);

  // Body scroll lock when any modal is open
  useEffect(() => {
    if (isAddingSymptom || editingSymptom || selectedTriageSymptom) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isAddingSymptom, editingSymptom, selectedTriageSymptom]);

  const categories = [
    { id: 'all', label: 'Todos los Registros', icon: '📋' },
    { id: 'pain_posture', label: '🦴 Dolor & Postura', icon: '🦴' },
    { id: 'aesthetic_skin', label: '💅 Estética & Piel', icon: '💅' },
    { id: 'metabolism', label: '⚖️ Peso & Metabolismo', icon: '⚖️' },
    { id: 'general', label: '🩺 Salud General', icon: '🩺' }
  ];

  const bodyZonesPreset = [
    'Espalda baja / Lumbar',
    'Tobillo derecho / Pie',
    'Rodillas',
    'Cuello / Cervicales',
    'Hombros / Trapecios',
    'Muñeca / Manos',
    'Rostro / Mandíbula (ATM)',
    'Piel (Talones / Manos / Cuerpo)',
    'Cabello & Cuero cabelludo',
    'Abdomen / Zona Digestiva',
    'Otra zona corporal'
  ];

  const triggerPresets = [
    'Al manejar (>30 min)',
    'Al trabajar en laptop / escritorio',
    'Al despertar por las mañanas',
    'Al hacer ejercicio / caminar',
    'En clima seco o con aire acondicionado',
    'En días de estrés / alta carga laboral',
    'Tras consumir ciertos alimentos',
    'Constante / Todo el día',
    'Otro desencadenante...'
  ];

  // Statistics
  const totalCount = healthSymptoms.length;
  const activeCount = healthSymptoms.filter(s => s.status === 'active').length;
  const treatmentCount = healthSymptoms.filter(s => s.status === 'treatment').length;
  const resolvedCount = healthSymptoms.filter(s => s.status === 'resolved').length;
  const analyzedCount = healthSymptoms.filter(s => s.aiTriage && s.aiTriage.specialist).length;

  // Filtered symptoms
  const filteredSymptoms = healthSymptoms.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.status === 'active') ||
      (statusFilter === 'treatment' && item.status === 'treatment') ||
      (statusFilter === 'resolved' && item.status === 'resolved');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.bodyZone && item.bodyZone.toLowerCase().includes(q)) ||
      (item.trigger && item.trigger.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      (item.aiTriage?.specialist && item.aiTriage.specialist.toLowerCase().includes(q));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Helper for pain severity color & label
  const getPainMeta = (level) => {
    const num = parseInt(level, 10) || 1;
    if (num <= 3) {
      return {
        label: 'Molestia Leve',
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        barColor: 'bg-emerald-400',
        textColor: 'text-emerald-400'
      };
    }
    if (num <= 6) {
      return {
        label: 'Molestia Moderada',
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        barColor: 'bg-amber-400',
        textColor: 'text-amber-400'
      };
    }
    if (num <= 8) {
      return {
        label: 'Dolor / Molestia Intensa',
        badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        barColor: 'bg-orange-400',
        textColor: 'text-orange-400'
      };
    }
    return {
      label: 'Dolor Severo',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      barColor: 'bg-rose-400',
      textColor: 'text-rose-400'
    };
  };

  // Helper for status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Activo
          </span>
        );
      case 'treatment':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Clock className="w-3 h-3 text-sky-400" />
            En Tratamiento
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Resuelto
          </span>
        );
      default:
        return null;
    }
  };

  // Trigger AI Analysis for a symptom
  const handleAnalyzeSymptom = async (symptom) => {
    setAnalyzingId(symptom.id);
    try {
      showToast('info', 'Analizando con IA', `Evaluando especialista y ergonomía para "${symptom.title}"...`);
      const triage = await analyzeHealthSymptomWithGemini(symptom, geminiApiKey);
      
      const updated = healthSymptoms.map((item) => {
        if (item.id === symptom.id) {
          return {
            ...item,
            aiTriage: triage,
            lastAnalyzedDate: new Date().toISOString().split('T')[0]
          };
        }
        return item;
      });

      setHealthSymptoms(updated);
      showToast('success', 'Diagnóstico Listo', `Especialista recomendado: ${triage.specialist}`);

      // If modal is currently inspecting this symptom, update it
      if (selectedTriageSymptom?.id === symptom.id) {
        setSelectedTriageSymptom({
          ...selectedTriageSymptom,
          aiTriage: triage,
          lastAnalyzedDate: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err) {
      console.error("AI triage error:", err);
      showToast('error', 'Error de Análisis', 'No se pudo completar el análisis: ' + err.message);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Add Symptom Handler
  const handleAddSymptom = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('warning', 'Campo Requerido', 'Por favor ingresa el nombre de la molestia o síntoma.');
      return;
    }

    const effectiveTrigger = newTrigger === 'Otro desencadenante...' ? (newCustomTrigger.trim() || 'No especificado') : newTrigger;

    const newSymptomObj = {
      id: 'hlth-' + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      bodyZone: newBodyZone,
      painLevel: parseInt(newPainLevel, 10) || 5,
      trigger: effectiveTrigger,
      frequency: newFrequency,
      notes: newNotes.trim(),
      status: 'active', // 'active' | 'treatment' | 'resolved'
      createdAt: new Date().toISOString().split('T')[0],
      aiTriage: null
    };

    if (autoAnalyzeOnSave) {
      showToast('info', 'Evaluando...', 'Generando recomendación clínica con IA...');
      try {
        const triage = await analyzeHealthSymptomWithGemini(newSymptomObj, geminiApiKey);
        newSymptomObj.aiTriage = triage;
        newSymptomObj.lastAnalyzedDate = new Date().toISOString().split('T')[0];
      } catch (err) {
        console.warn("Auto-triage fallback triggered:", err);
        newSymptomObj.aiTriage = generateFallbackHealthTriage(newSymptomObj);
      }
    }

    const updated = [newSymptomObj, ...healthSymptoms];
    setHealthSymptoms(updated);
    showToast('success', 'Molestia Registrada', `Se guardó "${newTitle.trim()}" en tu bitácora de salud.`);

    // Reset form
    setNewTitle('');
    setNewCategory('pain_posture');
    setNewBodyZone('Espalda baja / Lumbar');
    setNewPainLevel(5);
    setNewTrigger('Al manejar');
    setNewCustomTrigger('');
    setNewFrequency('Al realizar la actividad');
    setNewNotes('');
    setIsAddingSymptom(false);
  };

  // Save Edit Handler
  const handleSaveEdit = () => {
    if (!editingSymptom || !editingSymptom.title.trim()) return;

    const updated = healthSymptoms.map((item) =>
      item.id === editingSymptom.id ? editingSymptom : item
    );

    setHealthSymptoms(updated);
    showToast('success', 'Actualizado', `Se guardaron los cambios de "${editingSymptom.title}".`);
    setEditingSymptom(null);
  };

  // Toggle Status Handler
  const handleToggleStatus = (symptom) => {
    const nextStatus = symptom.status === 'resolved' ? 'active' : 'resolved';
    const updated = healthSymptoms.map((item) => {
      if (item.id === symptom.id) {
        return {
          ...item,
          status: nextStatus,
          resolvedDate: nextStatus === 'resolved' ? new Date().toISOString().split('T')[0] : null
        };
      }
      return item;
    });

    setHealthSymptoms(updated);
    showToast(
      'info',
      nextStatus === 'resolved' ? 'Molestia Resuelta' : 'Molestia Reactivada',
      `"${symptom.title}" marcado como ${nextStatus === 'resolved' ? 'resuelto' : 'activo'}.`
    );
  };

  // Delete Symptom Handler
  const handleDeleteSymptom = (id, title) => {
    if (window.confirm(`¿Estás segura de eliminar el registro "${title}"?`)) {
      const updated = healthSymptoms.filter((item) => item.id !== id);
      setHealthSymptoms(updated);
      showToast('info', 'Registro Eliminado', `Se eliminó "${title}" de tu bitácora.`);
      if (selectedTriageSymptom?.id === id) {
        setSelectedTriageSymptom(null);
      }
    }
  };

  // Copy Questions to Clipboard
  const handleCopyQuestions = (questions = []) => {
    if (!questions || questions.length === 0) return;
    const textToCopy = `Preguntas para mi consulta médica (${selectedTriageSymptom?.title || 'Salud'}):\n` +
      questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuestions(true);
    showToast('success', 'Copiado al Portapapeles', 'Preguntas listas para enviar o llevar a tu cita.');
    setTimeout(() => setCopiedQuestions(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ========================================== */}
      {/* HEADER HERO & SUMMARY STATS */}
      {/* ========================================== */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#e0a96d]/10 via-[#e0a96d]/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30">
                <HeartPulse className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-[#e0a96d] uppercase tracking-widest">
                Diagnóstico Ergonómico & Bienestar Integral
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 font-outfit">
              Tracker de Dolor, Postura & Síntomas IA
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitorea molestias posturales al manejar o trabajar, dolores articulares y consultas estéticas/dermatológicas. 
              Nuestra IA evalúa la biomecánica, sugiere al <strong className="text-slate-200">especialista idóneo</strong> y te prepara una <strong className="text-[#e0a96d]">guía de preguntas</strong> para tu consulta médica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsAddingSymptom(true)}
              className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-[#e0a96d]/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nueva Molestia</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-[#0b0c10]/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Molestias Activas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-amber-400 font-outfit">{activeCount}</span>
              <span className="text-[10px] text-slate-500 font-medium">en seguimiento</span>
            </div>
          </div>

          <div className="bg-[#0b0c10]/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">En Tratamiento</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-sky-400 font-outfit">{treatmentCount}</span>
              <span className="text-[10px] text-slate-500 font-medium">con protocolo</span>
            </div>
          </div>

          <div className="bg-[#0b0c10]/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Molestias Resueltas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-emerald-400 font-outfit">{resolvedCount}</span>
              <span className="text-[10px] text-slate-500 font-medium">aliviadas</span>
            </div>
          </div>

          <div className="bg-[#0b0c10]/60 border border-[#e0a96d]/20 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-[#e0a96d] uppercase tracking-wider block flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Triajes con IA
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-slate-100 font-outfit">{analyzedCount} / {totalCount}</span>
              <span className="text-[10px] text-emerald-400 font-medium">canalizados</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* FILTER & SEARCH BAR */}
      {/* ========================================== */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer
                  ${isActive
                    ? 'bg-[#e0a96d]/20 text-[#e0a96d] border border-[#e0a96d]/40 shadow-sm'
                    : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'}
                `}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status sub-filter & Search input */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#11131a] p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${statusFilter === 'active' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Activos ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('treatment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${statusFilter === 'treatment' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              En Tratamiento ({treatmentCount})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${statusFilter === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Resueltos ({resolvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-slate-700 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Todos ({totalCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar zona, molestia o doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b0c10] border border-slate-800 rounded-lg py-1.5 pl-8 pr-3 text-slate-200 text-xs focus:outline-none focus:border-[#e0a96d]"
            />
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* SYMPTOMS CARDS GRID */}
      {/* ========================================== */}
      {filteredSymptoms.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-4 border border-dashed border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-[#e0a96d]/10 border border-[#e0a96d]/20 text-[#e0a96d] flex items-center justify-center mx-auto">
            <HeartPulse className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200 font-outfit">No hay registros en esta vista</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'No se encontraron coincidencias para tu búsqueda. Intenta con otro término.'
                : 'Registra cualquier molestia física, postural al manejar o consulta estética para obtener orientación médica y ergonomía.'}
            </p>
          </div>
          <button
            onClick={() => setIsAddingSymptom(true)}
            className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-xl cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primera Molestia</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSymptoms.map((symptom) => {
            const painMeta = getPainMeta(symptom.painLevel);
            const isAnalyzing = analyzingId === symptom.id;
            const hasTriage = symptom.aiTriage && symptom.aiTriage.specialist;

            return (
              <div
                key={symptom.id}
                className={`
                  bg-[#171a24] border rounded-2xl p-5 space-y-4 transition-all relative flex flex-col justify-between
                  ${symptom.status === 'resolved'
                    ? 'border-slate-800/80 opacity-75'
                    : 'border-[#e0a96d]/20 hover:border-[#e0a96d]/40 shadow-xl'}
                `}
              >
                {/* Card Top: Zone, Category & Status */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#0b0c10] border border-slate-800 text-[#e0a96d] flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {symptom.bodyZone}
                      </span>
                      {getStatusBadge(symptom.status)}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingSymptom(symptom)}
                        className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                        title="Editar molestia"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSymptom(symptom.id, symptom.title)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Notes */}
                  <div>
                    <h3 className={`text-base font-bold font-outfit ${symptom.status === 'resolved' ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                      {symptom.title}
                    </h3>
                    {symptom.notes && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {symptom.notes}
                      </p>
                    )}
                  </div>

                  {/* Pain Scale & Context Badge */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${painMeta.badgeBg} flex items-center gap-1.5`}>
                      <span className="font-mono">{symptom.painLevel}/10</span>
                      <span>•</span>
                      <span>{painMeta.label}</span>
                    </div>

                    {symptom.trigger && (
                      <div className="text-[10px] text-slate-400 bg-[#0b0c10] px-2.5 py-0.5 rounded-full border border-slate-800 flex items-center gap-1 truncate max-w-[200px]">
                        {symptom.trigger.toLowerCase().includes('manejar') ? <Car className="w-3 h-3 text-[#e0a96d]" /> : <Laptop className="w-3 h-3 text-slate-400" />}
                        <span className="truncate">Detonante: {symptom.trigger}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Specialist Section in Card */}
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  {hasTriage ? (
                    <div className="p-3 bg-[#0b0c10]/80 border border-[#e0a96d]/25 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#e0a96d] uppercase tracking-wider flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5" />
                          Especialista Recomendado
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#e0a96d]/10 text-[#e0a96d] border border-[#e0a96d]/20">
                          {symptom.aiTriage.priority}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>👨‍⚕️ {symptom.aiTriage.specialist}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {symptom.aiTriage.physiologicalExplanation}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTriageSymptom(symptom)}
                          className="text-[11px] text-[#e0a96d] hover:text-[#f5d4af] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Ver plan ergonómico & preguntas para consulta</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#0b0c10]/40 border border-dashed border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Sparkles className="w-4 h-4 text-slate-500" />
                        <span>Sin análisis de especialista aún</span>
                      </div>
                      <button
                        onClick={() => handleAnalyzeSymptom(symptom)}
                        disabled={isAnalyzing}
                        className="btn-rose-gold text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer flex items-center gap-1.5"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Analizando...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Analizar con IA</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Card Bottom Controls */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <label className="flex items-center gap-2 text-slate-400 hover:text-slate-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={symptom.status === 'resolved'}
                        onChange={() => handleToggleStatus(symptom)}
                        className="rounded border-slate-700 text-[#e0a96d] focus:ring-[#e0a96d] bg-[#0b0c10]"
                      />
                      <span className="text-[11px] font-semibold">
                        {symptom.status === 'resolved' ? 'Resuelto' : 'Marcar como Aliviado'}
                      </span>
                    </label>

                    {hasTriage && (
                      <button
                        onClick={() => handleAnalyzeSymptom(symptom)}
                        disabled={isAnalyzing}
                        className="text-[10px] text-slate-500 hover:text-[#e0a96d] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Re-analizar con IA"
                      >
                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span>Actualizar IA</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: ADD NEW SYMPTOM */}
      {/* ========================================== */}
      {isAddingSymptom && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#e0a96d]" />
                <span>Registrar Nueva Molestia o Consulta</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingSymptom(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSymptom} className="space-y-4 overflow-y-auto pr-1.5 flex-1 py-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Molestia o Síntoma *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Molestia en espalda baja y tobillo derecho al manejar, Piel reseca en talones..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    <option value="pain_posture">🦴 Dolor & Postura / Ergonomía</option>
                    <option value="aesthetic_skin">💅 Estética & Piel / Capilar</option>
                    <option value="metabolism">⚖️ Peso & Metabolismo</option>
                    <option value="general">🩺 Salud General & Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Zona Corporal</label>
                  <select
                    value={newBodyZone}
                    onChange={(e) => setNewBodyZone(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  >
                    {bodyZonesPreset.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interactive Pain Scale Slider */}
              <div className="p-3.5 bg-[#0b0c10] border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">
                    Escala de Molestia / Dolor (1 al 10):
                  </label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getPainMeta(newPainLevel).badgeBg}`}>
                    {newPainLevel}/10 — {getPainMeta(newPainLevel).label}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newPainLevel}
                  onChange={(e) => setNewPainLevel(e.target.value)}
                  className="w-full accent-[#e0a96d] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>1 (Leve/Incomodidad)</span>
                  <span>5 (Moderado)</span>
                  <span>10 (Dolor Severo)</span>
                </div>
              </div>

              {/* Trigger / Context */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Desencadenante / Contexto de Aparición
                </label>
                <select
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                >
                  {triggerPresets.map(trig => (
                    <option key={trig} value={trig}>{trig}</option>
                  ))}
                </select>

                {newTrigger === 'Otro desencadenante...' && (
                  <input
                    type="text"
                    placeholder="Escribe cuándo o con qué actividad aparece..."
                    value={newCustomTrigger}
                    onChange={(e) => setNewCustomTrigger(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/40 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  />
                )}
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Frecuencia</label>
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                >
                  <option value="Al realizar la actividad">Al realizar la actividad (ej. manejar o trabajar)</option>
                  <option value="Diario / Constante">Diario / Constante</option>
                  <option value="Frecuente (3-4 veces por semana)">Frecuente (3-4 veces por semana)</option>
                  <option value="Ocasional (1-2 veces al mes)">Ocasional (1-2 veces al mes)</option>
                  <option value="En episodios agudos">En episodios agudos</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notas / Sensaciones Detalladas
                </label>
                <textarea
                  placeholder="Describe cómo se siente (punzada, ardor, rigidez muscular, textura de la piel, si alivia al descansar...)"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-20 resize-none"
                />
              </div>

              <div className="p-3 bg-[#e0a96d]/10 border border-[#e0a96d]/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#e0a96d]" />
                  <span className="text-xs font-bold text-slate-200">Analizar especialista y plan ergonómico con IA</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoAnalyzeOnSave}
                  onChange={(e) => setAutoAnalyzeOnSave(e.target.checked)}
                  className="rounded border-slate-700 text-[#e0a96d] focus:ring-[#e0a96d] bg-[#0b0c10] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddingSymptom(false)}
                  className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-lg cursor-pointer transition-all shadow-md"
                >
                  Guardar Molestia
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================== */}
      {/* MODAL 2: EDIT SYMPTOM */}
      {/* ========================================== */}
      {editingSymptom && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#e0a96d]" />
                <span>Editar Registro de Molestia</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSymptom(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1.5 flex-1 py-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingSymptom.title}
                  onChange={(e) => setEditingSymptom({ ...editingSymptom, title: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={editingSymptom.category}
                    onChange={(e) => setEditingSymptom({ ...editingSymptom, category: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  >
                    <option value="pain_posture">🦴 Dolor & Postura / Ergonomía</option>
                    <option value="aesthetic_skin">💅 Estética & Piel / Capilar</option>
                    <option value="metabolism">⚖️ Peso & Metabolismo</option>
                    <option value="general">🩺 Salud General & Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estado</label>
                  <select
                    value={editingSymptom.status}
                    onChange={(e) => setEditingSymptom({ ...editingSymptom, status: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  >
                    <option value="active">Activo</option>
                    <option value="treatment">En Tratamiento</option>
                    <option value="resolved">Resuelto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Zona Corporal</label>
                <select
                  value={editingSymptom.bodyZone}
                  onChange={(e) => setEditingSymptom({ ...editingSymptom, bodyZone: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-2.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                >
                  {bodyZonesPreset.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-[#0b0c10] border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">Escala de Dolor:</label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getPainMeta(editingSymptom.painLevel).badgeBg}`}>
                    {editingSymptom.painLevel}/10 — {getPainMeta(editingSymptom.painLevel).label}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editingSymptom.painLevel}
                  onChange={(e) => setEditingSymptom({ ...editingSymptom, painLevel: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#e0a96d] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Desencadenante</label>
                <input
                  type="text"
                  value={editingSymptom.trigger || ''}
                  onChange={(e) => setEditingSymptom({ ...editingSymptom, trigger: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notas</label>
                <textarea
                  value={editingSymptom.notes || ''}
                  onChange={(e) => setEditingSymptom({ ...editingSymptom, notes: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setEditingSymptom(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-lg cursor-pointer transition-all shadow-md"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================== */}
      {/* MODAL 3: COMPREHENSIVE AI CLINICAL TRIAGE */}
      {/* ========================================== */}
      {selectedTriageSymptom && selectedTriageSymptom.aiTriage && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[92vh] flex flex-col space-y-4">
            
            {/* Triage Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-[#e0a96d]/20 text-[#e0a96d]">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-[#e0a96d] uppercase tracking-wider">
                    Orientación Clínica & Ergonómica con IA
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-100 font-outfit mt-1">
                  {selectedTriageSymptom.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTriageSymptom(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Triage Body */}
            <div className="overflow-y-auto pr-2 space-y-4 text-xs flex-1">
              {/* Doctor Specialist Hero Card */}
              <div className="bg-gradient-to-br from-[#e0a96d]/15 via-[#171a24] to-[#0b0c10] border border-[#e0a96d]/30 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Especialista Médico Idóneo
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#e0a96d]/20 text-[#e0a96d] border border-[#e0a96d]/40">
                    Prioridad: {selectedTriageSymptom.aiTriage.priority}
                  </span>
                </div>
                <div className="text-base font-extrabold text-slate-100 font-outfit flex items-center gap-2">
                  <span className="text-lg">👨‍⚕️</span>
                  <span>{selectedTriageSymptom.aiTriage.specialist}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {selectedTriageSymptom.aiTriage.specialistDescription}
                </p>
              </div>

              {/* Biomechanical / Physiological Cause */}
              <div className="bg-[#0b0c10] p-4 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-[#e0a96d] text-xs flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  ¿Por qué ocurre esta molestia? (Explicación Biomecánica / Fisiológica)
                </span>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {selectedTriageSymptom.aiTriage.physiologicalExplanation}
                </p>
              </div>

              {/* Immediate Relief & Ergonomic Action Plan */}
              {selectedTriageSymptom.aiTriage.immediateReliefTips?.length > 0 && (
                <div className="bg-[#0b0c10] p-4 rounded-xl border border-emerald-500/20 space-y-2.5">
                  <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Plan de Alivio Inmediato & Ergonomía (En Casa / Auto / Oficina)
                  </span>
                  <ul className="space-y-2">
                    {selectedTriageSymptom.aiTriage.immediateReliefTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300 leading-relaxed">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Consultation Questions Ready for Medical Visit */}
              {selectedTriageSymptom.aiTriage.consultationQuestions?.length > 0 && (
                <div className="bg-[#0b0c10] p-4 rounded-xl border border-[#e0a96d]/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#e0a96d] text-xs flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      Guía de Preguntas Clave para tu Cita Médica
                    </span>
                    <button
                      onClick={() => handleCopyQuestions(selectedTriageSymptom.aiTriage.consultationQuestions)}
                      className="text-[10px] font-bold text-[#e0a96d] hover:text-[#f5d4af] flex items-center gap-1 cursor-pointer bg-[#e0a96d]/10 px-2.5 py-1 rounded-lg border border-[#e0a96d]/30 transition-colors"
                    >
                      {copiedQuestions ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedQuestions ? '¡Copiado!' : 'Copiar Preguntas'}</span>
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {selectedTriageSymptom.aiTriage.consultationQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300 leading-relaxed bg-[#171a24]/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[#e0a96d] font-bold shrink-0">Q{idx + 1}:</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Red Flags / Emergency Warning */}
              {selectedTriageSymptom.aiTriage.redFlags && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-200">Signos de Alarma / Acudir a Urgencias:</strong>{' '}
                    {selectedTriageSymptom.aiTriage.redFlags}
                  </div>
                </div>
              )}
            </div>

            {/* Triage Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <span className="text-[10px] text-slate-500">
                Orientación preventiva generada por IA. No sustituye valoración presencial.
              </span>
              <button
                type="button"
                onClick={() => setSelectedTriageSymptom(null)}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
