import React, { useState } from 'react';
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
  CalendarCheck
} from 'lucide-react';

export default function ScheduleModule({
  weight,
  setWeight,
  height,
  setHeight,
  waterIntake,
  setWaterIntake,
  schedule,
  setSchedule,
  selfCareActivities = [],
  setSelfCareActivities,
  showToast
}) {
  // Navigation Tabs: 'daily' | 'selfcare'
  const [activeTab, setActiveTab] = useState('daily');
  
  // Daily Schedule state
  const [newTitle, setNewTitle] = useState('');
  const [newHour, setNewHour] = useState('08');
  const [newMinute, setNewMinute] = useState('00');
  const [newPeriod, setNewPeriod] = useState('AM');
  const [newDesc, setNewDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Self-Care Calendar state
  const [selfCareFilter, setSelfCareFilter] = useState('all'); // 'all' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom'
  const [isAddingSelfCare, setIsAddingSelfCare] = useState(false);
  const [editingSelfCareItem, setEditingSelfCareItem] = useState(null);

  // New Self-Care form fields
  const [scTitle, setScTitle] = useState('');
  const [scFrequency, setScFrequency] = useState('weekly');
  const [scCustomValue, setScCustomValue] = useState(1);
  const [scCustomUnit, setScCustomUnit] = useState('weeks'); // 'days' | 'weeks' | 'months' | 'years'
  const [scCategory, setScCategory] = useState('beauty');
  const [scNotes, setScNotes] = useState('');
  const [scProtocol, setScProtocol] = useState('');
  const [scLastDate, setScLastDate] = useState(() => new Date().toISOString().split('T')[0]);

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
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const timeStr = `${newHour}:${newMinute} ${newPeriod}`;
    const cat = calculateCategory(newHour, newMinute, newPeriod);

    const newItem = {
      id: Date.now(),
      time: timeStr,
      title: newTitle,
      desc: newDesc,
      category: cat,
      completed: false
    };

    setSchedule([...schedule, newItem]);
    setNewTitle('');
    setNewDesc('');
    setIsAdding(false);
    showToast('success', 'Actividad Añadida', `Se ha programado "${newTitle}"`);
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
    setSchedule(schedule.filter(item => item.id !== id));
    showToast('info', 'Actividad Eliminada', `Se eliminó "${title}"`);
  };

  const handleEditClick = (item) => {
    const match = item.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    let h = "08";
    let m = "00";
    let p = "AM";
    if (match) {
      h = match[1].padStart(2, '0');
      m = match[2];
      p = match[3].toUpperCase();
    }
    setEditingItem({ 
      ...item, 
      hour: h, 
      minute: m, 
      period: p 
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem.title.trim()) return;
    setSchedule(schedule.map(item => item.id === editingItem.id ? editingItem : item));
    showToast('success', 'Actividad Actualizada', `Se guardó "${editingItem.title}"`);
    setEditingItem(null);
  };

  // Group by category and sort chronologically
  const dailySections = {
    morning: { 
      label: 'Mañana (05:00 AM - 11:59 AM)', 
      items: schedule
        .filter(i => i.category === 'morning' || i.category === 'hygiene')
        .sort((a, b) => getMinutesFromMidnight(a.time) - getMinutesFromMidnight(b.time))
    },
    afternoon: { 
      label: 'Tarde (12:00 PM - 06:59 PM)', 
      items: schedule
        .filter(i => i.category === 'afternoon')
        .sort((a, b) => getMinutesFromMidnight(a.time) - getMinutesFromMidnight(b.time))
    },
    night: { 
      label: 'Noche (07:00 PM - 04:59 AM)', 
      items: schedule
        .filter(i => i.category === 'night')
        .sort((a, b) => getMinutesFromMidnight(a.time) - getMinutesFromMidnight(b.time))
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
        percentCycle: 0
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = new Date(activity.lastCompletedDate + 'T00:00:00');
    const diffTime = today.getTime() - lastDate.getTime();
    const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = interval - daysElapsed;

    const nextDueDate = new Date(lastDate.getTime() + interval * 24 * 60 * 60 * 1000);
    const nextDueDateStr = nextDueDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    const lastDateStr = lastDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

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
        lastDateStr,
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
        lastDateStr,
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
      lastDateStr,
      percentCycle
    };
  };

  const handleMarkSelfCareCompletedToday = (id, title) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = (selfCareActivities || []).map(item => {
      if (item.id === id) {
        return { ...item, lastCompletedDate: todayStr };
      }
      return item;
    });
    setSelfCareActivities(updated);
    showToast('success', '¡Autocuidado Realizado!', `Se actualizó la fecha de "${title}" a hoy.`);
  };

  const handleUpdateSelfCareDate = (id, newDate) => {
    const updated = (selfCareActivities || []).map(item => {
      if (item.id === id) {
        return { ...item, lastCompletedDate: newDate };
      }
      return item;
    });
    setSelfCareActivities(updated);
    showToast('success', 'Fecha Actualizada', 'Se guardó la fecha de realización.');
  };

  const handleAddSelfCare = (e) => {
    e.preventDefault();
    if (!scTitle.trim()) return;

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
      title: scTitle.trim(),
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
    setIsAddingSelfCare(false);
    showToast('success', 'Actividad Registrada', `Se añadió "${newItem.title}" al calendario de autocuidado.`);
  };

  const handleDeleteSelfCare = (id, title) => {
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

  // Filter self-care activities
  const filteredSelfCare = (selfCareActivities || []).filter(item => {
    if (selfCareFilter === 'all') return true;
    if (selfCareFilter === 'weekly') return item.frequency === 'weekly' || item.frequency === 'biweekly';
    if (selfCareFilter === 'monthly') return item.frequency === 'monthly' || item.frequency === 'bimonthly';
    if (selfCareFilter === 'quarterly') return item.frequency === 'quarterly' || item.frequency === 'biannual';
    if (selfCareFilter === 'annual') return item.frequency === 'annual';
    if (selfCareFilter === 'custom') return item.frequency === 'custom' || !!item.customValue;
    return true;
  });

  // Calculate self-care global metrics
  const pendingSelfCareAlerts = (selfCareActivities || []).filter(a => {
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
          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-100 font-outfit">Cronograma de Rutina Diaria</h3>
                <p className="text-xs text-slate-400 mt-1">Completa y gestiona tus rituales diarios programados.</p>
              </div>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Actividad</span>
              </button>
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
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Título de la Actividad</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ej. Estiramiento matutino"
                      className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                      required
                    />
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
                    <p className="text-xs text-slate-500 italic pl-3">No hay actividades registradas para esta fase.</p>
                  ) : (
                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <div 
                          key={item.id} 
                          className={`p-3.5 rounded-lg flex items-start justify-between gap-4 transition-all border ${
                            item.completed 
                              ? 'bg-[#0b0c10]/40 border-slate-800/40 opacity-60' 
                              : 'bg-[#0b0c10] border-[#e0a96d]/10 hover:border-[#e0a96d]/30'
                          }`}
                        >
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
                                <h5 className={`text-sm font-semibold text-slate-200 truncate ${item.completed ? 'line-through text-slate-500' : ''}`}>
                                  {item.title}
                                </h5>
                              </div>
                              {item.desc && (
                                <p className={`text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed ${item.completed ? 'text-slate-600' : ''}`}>
                                  {item.desc}
                                </p>
                              )}
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
                      ))}
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha de Última Realización</label>
                  <input
                    type="date"
                    value={scLastDate}
                    onChange={(e) => setScLastDate(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                  />
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
            {filteredSelfCare.length === 0 ? (
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
              filteredSelfCare.map((activity) => {
                const info = getSelfCareStatus(activity);
                const freq = getFrequencyDetails(activity);
                const catIcon = categoryIcons[activity.category] || '✨';

                return (
                  <div
                    key={activity.id}
                    className={`bg-[#171a24] border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg transition-all ${
                      info.isUrgent
                        ? 'border-rose-500/30 shadow-rose-500/5'
                        : info.isDueSoon
                        ? 'border-amber-500/30 shadow-amber-500/5'
                        : 'border-[#e0a96d]/15 hover:border-[#e0a96d]/30'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3 mb-2">
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
                      <h4 className="text-base font-bold text-slate-100 font-outfit mt-1">
                        {activity.title}
                      </h4>
                      {activity.notes && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {activity.notes}
                        </p>
                      )}

                      {/* Protocol Highlights (e.g. Mavala, Anxiety Protocol, Specifics) */}
                      {activity.protocol && (
                        <div className="mt-3 p-3 bg-[#0b0c10] border border-[#e0a96d]/15 rounded-xl text-xs space-y-1">
                          <span className="text-[10px] font-bold text-[#e0a96d] uppercase font-mono flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Protocolo de Ejecución
                          </span>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {activity.protocol}
                          </p>
                        </div>
                      )}

                      {/* Progress Bar Cycle */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
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

                        {/* Dates Info */}
                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                          <span>Última: <strong className="text-slate-300 font-semibold">{info.lastDateStr || 'Nunca'}</strong></span>
                          <span>Próxima: <strong className="text-slate-300 font-semibold">{info.nextDueDateStr}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-slate-500 hidden sm:inline" title="Cambiar fecha registrada">
                          Fecha:
                        </label>
                        <input
                          type="date"
                          value={activity.lastCompletedDate || ''}
                          onChange={(e) => handleUpdateSelfCareDate(activity.id, e.target.value)}
                          className="bg-[#0b0c10] border border-slate-800 hover:border-[#e0a96d]/40 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                          title="Cambiar fecha de última realización"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingSelfCareItem(activity)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Editar detalles"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSelfCare(activity.id, activity.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar actividad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkSelfCareCompletedToday(activity.id, activity.title)}
                          className="btn-rose-gold text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer shadow transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Realizado Hoy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT MODAL: DAILY TIMELINE ITEM */}
      {/* ========================================== */}
      {editingItem && (
        <div className="fixed inset-0 bg-[#0b0c10]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 font-outfit">Editar Actividad</h4>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción / Método</label>
                <textarea
                  value={editingItem.desc}
                  onChange={(e) => setEditingItem({ ...editingItem, desc: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-24 resize-none"
                />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">Fase Asignada (Auto)</span>
                <span className="inline-block text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#e0a96d]/10 border border-[#e0a96d]/30 text-[#e0a96d] uppercase tracking-wider">
                  {editingItem.category === 'morning' ? 'Mañana' : editingItem.category === 'afternoon' ? 'Tarde' : 'Noche'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
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
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT MODAL: SELF-CARE ACTIVITY */}
      {/* ========================================== */}
      {editingSelfCareItem && (
        <div className="fixed inset-0 bg-[#0b0c10]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e0a96d]" />
                <span>Editar Actividad de Autocuidado</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingSelfCareItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Última Realización</label>
                <input
                  type="date"
                  value={editingSelfCareItem.lastCompletedDate || ''}
                  onChange={(e) => setEditingSelfCareItem({ ...editingSelfCareItem, lastCompletedDate: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] cursor-pointer"
                />
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

            <div className="flex justify-end gap-2 mt-6">
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
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
