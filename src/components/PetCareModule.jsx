import React, { useState, useMemo } from 'react';
import {
  PawPrint,
  Dog,
  Waves,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Activity,
  Phone,
  ShieldCheck,
  Pill,
  Sparkles,
  Car,
  MapPin,
  RotateCcw,
  Scissors,
  Droplets,
  Eye,
  Info,
  ChevronRight,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import {
  getLocalDateString,
  getYesterdayDateString,
  parseLocalDate,
  formatDisplayDate,
  formatFullDisplayDate,
  calculateNextDueDate,
  getDaysDifference
} from '../utils/dateUtils';
import { safeNumber, safeString, sanitizePetData, defaultBiomechanicalTips, sanitizePetTip } from '../utils/sanitizers';

export default function PetCareModule({
  petData,
  setPetData,
  showToast
}) {
  // Pet name resolution (default to Mona, migrate away from Kira)
  const petName = (petData?.profile?.name && petData.profile.name !== 'Kira')
    ? petData.profile.name
    : 'Mona';

  // Navigation tabs: 'routine' | 'daycare_hydro' | 'medications' | 'calendar' | 'profile'
  const [activeTab, setActiveTab] = useState('routine');

  // Filter for routine
  const [routineFilter, setRoutineFilter] = useState('all');

  // Traffic scenario: 'heavy' (60m) vs 'normal' (30m)
  const [trafficMode, setTrafficMode] = useState('heavy');

  // Modals state for adding new items
  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
  const [showAddWalkModal, setShowAddWalkModal] = useState(false);
  const [showAddHydroModal, setShowAddHydroModal] = useState(false);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddPreventiveModal, setShowAddPreventiveModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddTipModal, setShowAddTipModal] = useState(false);

  // Modals state for editing existing items
  const [editingRoutineItem, setEditingRoutineItem] = useState(null);
  const [editingPreventiveItem, setEditingPreventiveItem] = useState(null);
  const [editingMedItem, setEditingMedItem] = useState(null);
  const [editingHydroItem, setEditingHydroItem] = useState(null);
  const [editingTipItem, setEditingTipItem] = useState(null);

  // Inline custom date picker state for preventive events: { [itemId]: string (YYYY-MM-DD) }
  const [customPreventiveDates, setCustomPreventiveDates] = useState({});

  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayDateString();

  // Form state for new custom biomechanical / care tip
  const [newTipItem, setNewTipItem] = useState({
    title: '',
    category: 'vitamins',
    icon: '💊',
    content: ''
  });

  // Form states for new items
  const [newRoutineItem, setNewRoutineItem] = useState({
    time: '08:00 AM',
    category: 'care',
    title: '',
    desc: '',
    priority: 'medium'
  });

  const [newWalkLog, setNewWalkLog] = useState({
    date: todayStr,
    time: '08:00 AM',
    durationMinutes: 15,
    surface: 'Pasto / Césped suave',
    hipGaitRating: 'fluido',
    notes: ''
  });

  const [newHydroLog, setNewHydroLog] = useState({
    date: todayStr,
    durationMinutes: 20,
    postSwimBath: true,
    deepDryingDone: true,
    earCleaningDone: true,
    mobilityAfter: 'excelente',
    notes: 'Sesión de nado de bajo impacto en piscina temperada. Buen soporte en cadera.'
  });

  const [newMed, setNewMed] = useState({
    name: '',
    condition: '',
    dosage: '',
    frequency: 'Diario',
    timing: 'anytime',
    notes: ''
  });

  const [newPreventive, setNewPreventive] = useState({
    title: '',
    type: 'care',
    frequencyDesc: 'Cada 30 días',
    intervalDays: 30,
    lastDate: todayStr,
    notes: ''
  });

  const [profileForm, setProfileForm] = useState(() => ({
    name: petName,
    breed: petData?.profile?.breed || 'Pastor Alemán (Pelo Largo)',
    ageYears: petData?.profile?.ageYears || 12,
    gender: petData?.profile?.gender || 'Hembra',
    weightKg: petData?.profile?.weightKg || 32.5,
    microchip: petData?.profile?.microchip || '',
    vetContact: petData?.profile?.vetContact || 'Dra. Veterinaria de Cabecera',
    vetPhone: petData?.profile?.vetPhone || '+52 55 0000 0000',
    emergencyClinic: petData?.profile?.emergencyClinic || 'Hospital Veterinario 24/7',
    emergencyPhone: petData?.profile?.emergencyPhone || '+52 55 9999 9999',
    daycareName: petData?.profile?.daycareName || 'Guardería Canina Campestre',
    daycarePhone: petData?.profile?.daycarePhone || '+52 55 1234 5678',
    notes: petData?.profile?.notes || ''
  }));

  // Helper updater
  const updatePetData = (updater) => {
    setPetData((prev) => {
      const sanitizedPrev = sanitizePetData(prev);
      const updated = typeof updater === 'function' ? updater(sanitizedPrev) : updater;
      return sanitizePetData(updated);
    });
  };

  // Quick Stats & Calculations
  const routineItems = petData?.routine || [];
  const completedRoutineCount = routineItems.filter(r => r.completedToday).length;
  const routineProgressPct = routineItems.length > 0
    ? Math.round((completedRoutineCount / routineItems.length) * 100)
    : 0;

  const walksToday = useMemo(() => {
    return (petData?.walkLogs || []).filter(w => w.date === todayStr);
  }, [petData?.walkLogs, todayStr]);

  const medications = petData?.medications || [];

  // Reset daily checkboxes
  const handleResetDailyTasks = () => {
    updatePetData((prev) => ({
      ...prev,
      routine: prev.routine.map(r => ({ ...r, completedToday: false })),
      lastDailyResetDate: todayStr
    }));
    if (showToast) showToast('info', 'Tareas Restablecidas', 'La lista de rutina diaria ha comenzado un nuevo ciclo.');
  };

  // Toggle routine item completion
  const handleToggleRoutineItem = (id) => {
    updatePetData((prev) => ({
      ...prev,
      routine: prev.routine.map(r => r.id === id ? { ...r, completedToday: !r.completedToday } : r)
    }));
  };

  // Delete routine item
  const handleDeleteRoutineItem = (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta actividad de la rutina?')) return;
    updatePetData((prev) => ({
      ...prev,
      routine: prev.routine.filter(r => r.id !== id)
    }));
    if (showToast) showToast('success', 'Eliminado', 'Actividad retirada de la rutina.');
  };

  // Save edited routine item
  const handleSaveEditRoutine = (e) => {
    e.preventDefault();
    if (!editingRoutineItem) return;

    updatePetData((prev) => ({
      ...prev,
      routine: prev.routine.map(r => r.id === editingRoutineItem.id ? {
        ...r,
        time: editingRoutineItem.time.trim() || '08:00 AM',
        category: editingRoutineItem.category,
        title: editingRoutineItem.title.trim(),
        desc: editingRoutineItem.desc.trim(),
        priority: editingRoutineItem.priority
      } : r)
    }));

    setEditingRoutineItem(null);
    if (showToast) showToast('success', 'Actividad Actualizada', 'Los cambios en la rutina han sido guardados.');
  };

  // Add routine item
  const handleAddRoutineItem = (e) => {
    e.preventDefault();
    if (!newRoutineItem.title.trim()) return;

    const item = {
      id: 'pr-' + Date.now(),
      time: newRoutineItem.time.trim() || '08:00 AM',
      category: newRoutineItem.category,
      title: newRoutineItem.title.trim(),
      desc: newRoutineItem.desc.trim(),
      priority: newRoutineItem.priority,
      completedToday: false
    };

    updatePetData((prev) => ({
      ...prev,
      routine: [...prev.routine, item]
    }));

    setNewRoutineItem({
      time: '08:00 AM',
      category: 'care',
      title: '',
      desc: '',
      priority: 'medium'
    });
    setShowAddRoutineModal(false);
    if (showToast) showToast('success', 'Actividad Agregada', `${item.title} añadida a la rutina diaria.`);
  };

  // Add walk log
  const handleAddWalkLog = (e) => {
    e.preventDefault();
    const log = {
      id: 'wlk-' + Date.now(),
      date: newWalkLog.date || todayStr,
      time: newWalkLog.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationMinutes: safeNumber(newWalkLog.durationMinutes, 15),
      surface: newWalkLog.surface,
      hipGaitRating: newWalkLog.hipGaitRating,
      notes: newWalkLog.notes.trim()
    };

    updatePetData((prev) => ({
      ...prev,
      walkLogs: [log, ...(prev.walkLogs || [])]
    }));

    setNewWalkLog({
      date: todayStr,
      time: '08:00 AM',
      durationMinutes: 15,
      surface: 'Pasto / Césped suave',
      hipGaitRating: 'fluido',
      notes: ''
    });
    setShowAddWalkModal(false);
    if (showToast) showToast('success', 'Paseo Registrado', `Paseo de ${log.durationMinutes} min registrado.`);
  };

  // Delete walk log
  const handleDeleteWalk = (id) => {
    if (!window.confirm('¿Deseas eliminar este registro de paseo?')) return;
    updatePetData((prev) => ({
      ...prev,
      walkLogs: (prev.walkLogs || []).filter(w => w.id !== id)
    }));
    if (showToast) showToast('success', 'Paseo Eliminado', 'El registro de paseo fue retirado.');
  };

  // Add hydrotherapy log
  const handleAddHydroLog = (e) => {
    e.preventDefault();
    const sessionDate = newHydroLog.date || todayStr;
    const log = {
      id: 'hydro-' + Date.now(),
      date: sessionDate,
      durationMinutes: safeNumber(newHydroLog.durationMinutes, 20),
      postSwimBath: Boolean(newHydroLog.postSwimBath),
      deepDryingDone: Boolean(newHydroLog.deepDryingDone),
      earCleaningDone: Boolean(newHydroLog.earCleaningDone),
      mobilityAfter: newHydroLog.mobilityAfter,
      notes: newHydroLog.notes.trim()
    };

    // Also auto-update bath in preventive care if checked
    updatePetData((prev) => {
      let updatedPrevCare = prev.preventiveCare;
      if (log.postSwimBath) {
        updatedPrevCare = updatedPrevCare.map(p => {
          if (p.type === 'bath_grooming') {
            const nextDue = calculateNextDueDate(sessionDate, p.intervalDays);
            return {
              ...p,
              lastDate: sessionDate,
              nextDueDate: nextDue ? getLocalDateString(nextDue) : p.nextDueDate,
              status: 'completed'
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        hydrotherapy: {
          ...prev.hydrotherapy,
          sessions: [log, ...(prev.hydrotherapy?.sessions || [])]
        },
        preventiveCare: updatedPrevCare
      };
    });

    setShowAddHydroModal(false);
    if (showToast) showToast('success', 'Sesión de Nado Registrada', `Hidroterapia registrada con fecha ${formatDisplayDate(sessionDate)}.`);
  };

  // Delete hydrotherapy session
  const handleDeleteHydro = (id) => {
    if (!window.confirm('¿Deseas eliminar este registro de sesión de nado?')) return;
    updatePetData((prev) => ({
      ...prev,
      hydrotherapy: {
        ...prev.hydrotherapy,
        sessions: (prev.hydrotherapy?.sessions || []).filter(s => s.id !== id)
      }
    }));
    if (showToast) showToast('success', 'Sesión Eliminada', 'El registro de nado fue retirado.');
  };

  // Save edited hydro session
  const handleSaveEditHydro = (e) => {
    e.preventDefault();
    if (!editingHydroItem) return;

    updatePetData((prev) => ({
      ...prev,
      hydrotherapy: {
        ...prev.hydrotherapy,
        sessions: (prev.hydrotherapy?.sessions || []).map(s => s.id === editingHydroItem.id ? {
          ...s,
          date: editingHydroItem.date || todayStr,
          durationMinutes: safeNumber(editingHydroItem.durationMinutes, 20),
          postSwimBath: Boolean(editingHydroItem.postSwimBath),
          deepDryingDone: Boolean(editingHydroItem.deepDryingDone),
          earCleaningDone: Boolean(editingHydroItem.earCleaningDone),
          mobilityAfter: editingHydroItem.mobilityAfter,
          notes: editingHydroItem.notes.trim()
        } : s)
      }
    }));

    setEditingHydroItem(null);
    if (showToast) showToast('success', 'Sesión Actualizada', 'Los cambios en la sesión de nado han sido guardados.');
  };

  // Add medication
  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newMed.name.trim()) return;

    const med = {
      id: 'med-' + Date.now(),
      name: newMed.name.trim(),
      condition: newMed.condition.trim(),
      dosage: newMed.dosage.trim(),
      frequency: newMed.frequency.trim(),
      timing: newMed.timing,
      lastAdministeredDate: '',
      lastAdministeredMorning: '',
      lastAdministeredNight: '',
      notes: newMed.notes.trim(),
      active: true
    };

    updatePetData((prev) => ({
      ...prev,
      medications: [...prev.medications, med]
    }));

    setNewMed({
      name: '',
      condition: '',
      dosage: '',
      frequency: 'Diario',
      timing: 'anytime',
      notes: ''
    });
    setShowAddMedModal(false);
    if (showToast) showToast('success', 'Medicamento Guardado', `${med.name} añadido al botiquín.`);
  };

  // Delete medication
  const handleDeleteMed = (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este medicamento del botiquín?')) return;
    updatePetData((prev) => ({
      ...prev,
      medications: prev.medications.filter(m => m.id !== id)
    }));
    if (showToast) showToast('success', 'Eliminado', 'Medicamento retirado del botiquín.');
  };

  // Save edited medication
  const handleSaveEditMed = (e) => {
    e.preventDefault();
    if (!editingMedItem) return;

    updatePetData((prev) => ({
      ...prev,
      medications: prev.medications.map(m => m.id === editingMedItem.id ? {
        ...m,
        name: editingMedItem.name.trim(),
        condition: editingMedItem.condition.trim(),
        dosage: editingMedItem.dosage.trim(),
        frequency: editingMedItem.frequency.trim(),
        timing: editingMedItem.timing,
        notes: editingMedItem.notes.trim()
      } : m)
    }));

    setEditingMedItem(null);
    if (showToast) showToast('success', 'Medicamento Actualizado', 'Información del medicamento guardada.');
  };

  // Administer medication today
  const handleAdministerMed = (id, slot = 'once') => {
    updatePetData((prev) => ({
      ...prev,
      medications: prev.medications.map(m => {
        if (m.id !== id) return m;
        if (slot === 'morning') {
          return { ...m, lastAdministeredMorning: todayStr };
        } else if (slot === 'night') {
          return { ...m, lastAdministeredNight: todayStr };
        } else {
          return { ...m, lastAdministeredDate: todayStr };
        }
      })
    }));
    if (showToast) showToast('success', 'Medicamento Administrado', 'Registro actualizado para hoy.');
  };

  // Add preventive care event
  const handleAddPreventive = (e) => {
    e.preventDefault();
    if (!newPreventive.title.trim()) return;

    const interval = Math.max(1, safeNumber(newPreventive.intervalDays, 30));
    const nextDue = calculateNextDueDate(newPreventive.lastDate || todayStr, interval);

    const item = {
      id: 'prev-' + Date.now(),
      type: newPreventive.type,
      title: newPreventive.title.trim(),
      frequencyDesc: newPreventive.frequencyDesc.trim() || `Cada ${interval} días`,
      intervalDays: interval,
      lastDate: newPreventive.lastDate || todayStr,
      nextDueDate: nextDue ? getLocalDateString(nextDue) : todayStr,
      notes: newPreventive.notes.trim(),
      status: 'pending'
    };

    updatePetData((prev) => ({
      ...prev,
      preventiveCare: [...prev.preventiveCare, item]
    }));

    setNewPreventive({
      title: '',
      type: 'care',
      frequencyDesc: 'Cada 30 días',
      intervalDays: 30,
      lastDate: todayStr,
      notes: ''
    });
    setShowAddPreventiveModal(false);
    if (showToast) showToast('success', 'Evento Guardado', `${item.title} añadido al calendario.`);
  };

  // Update completion date of a preventive care item (allows custom past/today date)
  const handleUpdatePreventiveDate = (id, targetDate) => {
    const finalDate = targetDate || todayStr;
    updatePetData((prev) => ({
      ...prev,
      preventiveCare: prev.preventiveCare.map(p => {
        if (p.id !== id) return p;
        const nextDue = calculateNextDueDate(finalDate, p.intervalDays);
        return {
          ...p,
          lastDate: finalDate,
          nextDueDate: nextDue ? getLocalDateString(nextDue) : p.nextDueDate,
          status: 'completed'
        };
      })
    }));

    const updatedItem = (petData?.preventiveCare || []).find(p => p.id === id);
    const itemTitle = updatedItem?.title || 'Cuidado preventivo';
    if (showToast) {
      showToast('success', 'Fecha Actualizada', `"${itemTitle}": Registrado el ${formatDisplayDate(finalDate)}.`);
    }
  };

  // Save edited preventive care event
  const handleSaveEditPreventive = (e) => {
    e.preventDefault();
    if (!editingPreventiveItem) return;

    const interval = Math.max(1, safeNumber(editingPreventiveItem.intervalDays, 30));
    const nextDue = calculateNextDueDate(editingPreventiveItem.lastDate || todayStr, interval);

    updatePetData((prev) => ({
      ...prev,
      preventiveCare: prev.preventiveCare.map(p => {
        if (p.id !== editingPreventiveItem.id) return p;
        return {
          ...p,
          title: editingPreventiveItem.title.trim(),
          type: editingPreventiveItem.type,
          intervalDays: interval,
          frequencyDesc: editingPreventiveItem.frequencyDesc.trim() || `Cada ${interval} días`,
          lastDate: editingPreventiveItem.lastDate || todayStr,
          nextDueDate: nextDue ? getLocalDateString(nextDue) : p.nextDueDate,
          notes: editingPreventiveItem.notes.trim()
        };
      })
    }));

    setEditingPreventiveItem(null);
    if (showToast) showToast('success', 'Cuidado Actualizado', 'Cambios guardados en el calendario preventivo.');
  };

  // Delete preventive
  const handleDeletePreventive = (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este evento del calendario preventivo?')) return;
    updatePetData((prev) => ({
      ...prev,
      preventiveCare: prev.preventiveCare.filter(p => p.id !== id)
    }));
    if (showToast) showToast('success', 'Eliminado', 'Evento retirado del calendario.');
  };

  // Toggle planned daycare day
  const handleToggleDaycareDay = (dayName) => {
    updatePetData((prev) => {
      const current = prev.daycare?.plannedDays || [];
      const updated = current.includes(dayName)
        ? current.filter(d => d !== dayName)
        : [...current, dayName];
      return {
        ...prev,
        daycare: {
          ...prev.daycare,
          plannedDays: updated
        }
      };
    });
  };

  // Log daycare attendance today
  const handleLogDaycareAttendance = (status) => {
    const transitTime = trafficMode === 'heavy' ? 55 : 30;
    const departureTime = trafficMode === 'heavy' ? '08:00 AM' : '08:25 AM';

    const log = {
      id: 'dc-' + Date.now(),
      date: todayStr,
      status: status,
      departureTime: departureTime,
      transitTime: transitTime,
      notes: status === 'attended'
        ? `Llevada a guardería (9 AM - 5 PM). Tráfico: ${transitTime} min.`
        : status === 'stayed_home'
        ? 'Día de descanso en casa.'
        : 'Cancelado por tráfico pesado / lluvia.'
    };

    updatePetData((prev) => ({
      ...prev,
      daycare: {
        ...prev.daycare,
        attendanceLogs: [log, ...(prev.daycare?.attendanceLogs || []).filter(l => l.date !== todayStr)]
      }
    }));

    if (showToast) {
      const msg = status === 'attended' ? `¡${petName} está en su guardería!` : 'Registro de asistencia guardado.';
      showToast('success', 'Guardería Actualizada', msg);
    }
  };

  // Save profile form
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const cleanName = profileForm.name.trim() || 'Mona';
    updatePetData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        name: cleanName,
        breed: profileForm.breed.trim(),
        ageYears: safeNumber(profileForm.ageYears, 12),
        gender: profileForm.gender.trim(),
        weightKg: safeNumber(profileForm.weightKg, 32.5),
        microchip: profileForm.microchip.trim(),
        vetContact: profileForm.vetContact.trim(),
        vetPhone: profileForm.vetPhone.trim(),
        emergencyClinic: profileForm.emergencyClinic.trim(),
        emergencyPhone: profileForm.emergencyPhone.trim(),
        daycareName: profileForm.daycareName.trim(),
        daycarePhone: profileForm.daycarePhone.trim(),
        notes: profileForm.notes.trim()
      }
    }));
    setShowEditProfileModal(false);
    if (showToast) showToast('success', 'Perfil Actualizado', `Información de ${cleanName} guardada correctamente.`);
  };

  // Dynamic list of Biomechanical & Care tips (custom or default)
  const tipsList = useMemo(() => {
    return (petData?.customTips && Array.isArray(petData.customTips) && petData.customTips.length > 0)
      ? petData.customTips
      : defaultBiomechanicalTips;
  }, [petData?.customTips]);

  // Add new guide / biomechanical tip
  const handleAddTip = (e) => {
    e.preventDefault();
    const title = newTipItem.title.trim();
    if (!title) return;

    const tip = sanitizePetTip({
      id: 'tip-' + Date.now(),
      title: title,
      category: newTipItem.category,
      icon: newTipItem.icon || '🐾',
      content: newTipItem.content.trim(),
      isDefault: false,
      createdAt: todayStr
    });

    updatePetData((prev) => {
      const existing = (prev?.customTips && Array.isArray(prev.customTips) && prev.customTips.length > 0)
        ? prev.customTips
        : defaultBiomechanicalTips;
      return {
        ...prev,
        customTips: [...existing, tip]
      };
    });

    setNewTipItem({
      title: '',
      category: 'vitamins',
      icon: '💊',
      content: ''
    });
    setShowAddTipModal(false);
    if (showToast) showToast('success', 'Guía Actualizada', `"${title}" agregada a la guía de Mona.`);
  };

  // Save edited guide tip
  const handleSaveEditTip = (e) => {
    e.preventDefault();
    if (!editingTipItem) return;
    const title = editingTipItem.title.trim();
    if (!title) return;

    updatePetData((prev) => {
      const existing = (prev?.customTips && Array.isArray(prev.customTips) && prev.customTips.length > 0)
        ? prev.customTips
        : defaultBiomechanicalTips;
      return {
        ...prev,
        customTips: existing.map(t => t.id === editingTipItem.id ? {
          ...t,
          title: title,
          category: editingTipItem.category,
          icon: editingTipItem.icon || t.icon || '🐾',
          content: (editingTipItem.content || '').trim()
        } : t)
      };
    });

    setEditingTipItem(null);
    if (showToast) showToast('success', 'Guía Actualizada', `"${title}" actualizada exitosamente.`);
  };

  // Delete guide tip
  const handleDeleteTip = (tipId, tipTitle) => {
    if (!window.confirm(`¿Deseas eliminar "${tipTitle}" de la guía de manejo de ${petName}?`)) return;
    updatePetData((prev) => {
      const existing = (prev?.customTips && Array.isArray(prev.customTips) && prev.customTips.length > 0)
        ? prev.customTips
        : defaultBiomechanicalTips;
      return {
        ...prev,
        customTips: existing.filter(t => t.id !== tipId)
      };
    });
    if (showToast) showToast('success', 'Eliminado', `"${tipTitle}" retirado de la guía.`);
  };

  // Filtered routine list
  const filteredRoutine = useMemo(() => {
    if (routineFilter === 'all') return routineItems;
    return routineItems.filter(r => r.category === routineFilter);
  }, [routineItems, routineFilter]);

  // Sorted preventive care items: from closest (most overdue or imminent next due date) to furthest in the future
  const sortedPreventiveCare = useMemo(() => {
    const list = [...(petData?.preventiveCare || [])];
    return list.sort((a, b) => {
      let timeA = Infinity;
      if (a.nextDueDate) {
        const parsedA = parseLocalDate(a.nextDueDate);
        if (parsedA) timeA = parsedA.getTime();
      } else if (a.lastDate) {
        const calcA = calculateNextDueDate(a.lastDate, a.intervalDays || 30);
        if (calcA) timeA = calcA.getTime();
      }

      let timeB = Infinity;
      if (b.nextDueDate) {
        const parsedB = parseLocalDate(b.nextDueDate);
        if (parsedB) timeB = parsedB.getTime();
      } else if (b.lastDate) {
        const calcB = calculateNextDueDate(b.lastDate, b.intervalDays || 30);
        if (calcB) timeB = calcB.getTime();
      }

      return timeA - timeB;
    });
  }, [petData?.preventiveCare]);

  // Last hydrotherapy session & days count
  const lastHydroSession = petData?.hydrotherapy?.sessions?.[0];
  const daysSinceHydro = lastHydroSession?.date
    ? getDaysDifference(lastHydroSession.date, todayStr)
    : null;

  // Daycare attendance today status
  const daycareTodayLog = (petData?.daycare?.attendanceLogs || []).find(l => l.date === todayStr);

  return (
    <div className="space-y-6">

      {/* TOP HERO BANNER: MONA'S PROFILE & QUICK VITALS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171a24] via-[#11131a] to-[#0b0c10] border border-[#e0a96d]/25 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#e0a96d]/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#e0a96d]/20 to-[#b37d46]/10 border-2 border-[#e0a96d]/40 flex items-center justify-center text-[#e0a96d] shadow-lg">
                <Dog className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wider uppercase">
                {petData?.profile?.ageYears || 12} Años
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black font-outfit text-slate-100 tracking-tight">
                  {petName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30 text-xs font-bold">
                  {petData?.profile?.gender || 'Hembra'} • {petData?.profile?.breed || 'Pastor Alemán Pelo Largo'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                Cuidado Geriátrico Especializado: Hipotiroidismo, Displasia de Cadera, Soporte Visual & Hidroterapia.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-medium text-slate-300">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20">
                  <HeartPulse className="w-3 h-3 text-red-400" /> Displasia de Cadera
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  <Pill className="w-3 h-3 text-blue-400" /> Hipotiroidismo (Ayunas)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  <Eye className="w-3 h-3 text-purple-400" /> Gotas Oftálmicas
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                setProfileForm({
                  name: petName,
                  breed: petData?.profile?.breed || 'Pastor Alemán (Pelo Largo)',
                  ageYears: petData?.profile?.ageYears || 12,
                  gender: petData?.profile?.gender || 'Hembra',
                  weightKg: petData?.profile?.weightKg || 32.5,
                  microchip: petData?.profile?.microchip || '',
                  vetContact: petData?.profile?.vetContact || 'Dra. Veterinaria de Cabecera',
                  vetPhone: petData?.profile?.vetPhone || '+52 55 0000 0000',
                  emergencyClinic: petData?.profile?.emergencyClinic || 'Hospital Veterinario 24/7',
                  emergencyPhone: petData?.profile?.emergencyPhone || '+52 55 9999 9999',
                  daycareName: petData?.profile?.daycareName || 'Guardería Canina Campestre',
                  daycarePhone: petData?.profile?.daycarePhone || '+52 55 1234 5678',
                  notes: petData?.profile?.notes || ''
                });
                setShowEditProfileModal(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#171a24] hover:bg-[#1f2330] text-slate-200 border border-slate-700/60 text-xs font-bold transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-[#e0a96d]" /> Ficha Médica
            </button>
            <button
              onClick={handleResetDailyTasks}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#e0a96d]/15 hover:bg-[#e0a96d]/25 text-[#e0a96d] border border-[#e0a96d]/30 text-xs font-bold transition-all cursor-pointer"
              title="Restablecer checkboxes de la rutina diaria para hoy"
            >
              <RotateCcw className="w-4 h-4" /> Nuevo Día
            </button>
          </div>
        </div>

        {/* QUICK STATUS METRICS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-[#0b0c10]/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-[#e0a96d]" /> Rutina de Hoy
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-100">{completedRoutineCount}/{routineItems.length}</span>
              <span className="text-xs font-bold text-[#e0a96d]">{routineProgressPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#e0a96d] to-amber-400 transition-all duration-500 rounded-full"
                style={{ width: `${routineProgressPct}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b0c10]/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Paseos Suaves
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-100">{walksToday.length} paseos</span>
              <span className="text-xs font-semibold text-slate-400">Meta: 3-4</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-medium mt-1.5">
              10-15 min sin sobrecarga
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b0c10]/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <Car className="w-3.5 h-3.5 text-sky-400" /> Guardería 9-5
            </div>
            <div className="text-sm font-bold text-slate-200">
              {daycareTodayLog?.status === 'attended'
                ? '✅ En Guardería'
                : daycareTodayLog?.status === 'stayed_home'
                ? '🛋️ Descanso en casa'
                : 'Salida 8:00 - 8:25 AM'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Tráfico estimado: 30 a 60 min
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b0c10]/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <Waves className="w-3.5 h-3.5 text-cyan-400" /> Nado & Baño
            </div>
            <div className="text-sm font-bold text-slate-200">
              {daysSinceHydro !== null ? `Hace ${daysSinceHydro} días` : 'Pendiente'}
            </div>
            <p className="text-[10px] text-cyan-400 font-medium mt-1">
              Frecuencia: cada 2 sem
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab('routine')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'routine'
              ? 'bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#171a24] border border-transparent'
          }`}
        >
          <Clock className="w-4 h-4" /> Rutina Diaria & Paseos
        </button>

        <button
          onClick={() => setActiveTab('daycare_hydro')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'daycare_hydro'
              ? 'bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#171a24] border border-transparent'
          }`}
        >
          <Car className="w-4 h-4" /> Guardería & Hidroterapia
        </button>

        <button
          onClick={() => setActiveTab('medications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'medications'
              ? 'bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#171a24] border border-transparent'
          }`}
        >
          <Pill className="w-4 h-4" /> Botiquín & Medicamentos
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#171a24] border border-transparent'
          }`}
        >
          <Calendar className="w-4 h-4" /> Calendario Preventivo
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#171a24] border border-transparent'
          }`}
        >
          <PawPrint className="w-4 h-4" /> Ficha Geriátrica
        </button>
      </div>

      {/* TAB 1: RUTINA DIARIA & PASEOS */}
      {activeTab === 'routine' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#e0a96d]" /> Cronograma Diario Adaptado
              </h2>
              <p className="text-xs text-slate-400">
                Horarios organizados para absorción tiroidea en ayunas, protección articular de cadera y balance de descanso.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddWalkModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4" /> + Registrar Paseo
              </button>
              <button
                onClick={() => setShowAddRoutineModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] text-xs font-black hover:bg-[#b37d46] transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Nueva Actividad
              </button>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            {[
              { id: 'all', label: 'Todas las Actividades' },
              { id: 'medication', label: '💊 Medicación' },
              { id: 'walk', label: '🐾 Paseos' },
              { id: 'food', label: '🍲 Alimentación' },
              { id: 'daycare', label: '🚐 Guardería' },
              { id: 'home', label: '🏡 Descanso / Casa' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setRoutineFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  routineFilter === f.id
                    ? 'bg-[#171a24] text-[#e0a96d] border-[#e0a96d]/40 shadow-sm'
                    : 'bg-[#11131a] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ROUTINE LIST */}
          <div className="space-y-3">
            {filteredRoutine.map((item) => {
              const isCompleted = Boolean(item.completedToday);
              return (
                <div
                  key={item.id}
                  className={`group p-4 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-[#11131a]/60 border-emerald-500/20 opacity-75'
                      : 'bg-[#11131a] border-slate-800 hover:border-[#e0a96d]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 flex-1">
                      <button
                        onClick={() => handleToggleRoutineItem(item.id)}
                        className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-400 text-[#0b0c10]'
                            : 'bg-[#171a24] border-slate-700 hover:border-[#e0a96d] text-transparent'
                        }`}
                        title={isCompleted ? 'Desmarcar' : 'Marcar completado hoy'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black font-mono text-[#e0a96d] bg-[#e0a96d]/10 px-2 py-0.5 rounded-md border border-[#e0a96d]/20">
                            {item.time}
                          </span>
                          <h3 className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {item.title}
                          </h3>
                          {item.priority === 'high' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              Prioritario
                            </span>
                          )}
                        </div>
                        {item.desc && (
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {item.desc}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => setEditingRoutineItem({ ...item })}
                        className="text-slate-400 hover:text-[#e0a96d] p-1.5 rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer"
                        title="Editar actividad"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoutineItem(item.id)}
                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer"
                        title="Eliminar de rutina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* WALKS SECTION: HIP-FRIENDLY MONITORING */}
          <div className="p-5 rounded-2xl bg-[#171a24] border border-slate-800 space-y-4 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Historial de Paseos de Movilidad Articular
                </h3>
                <p className="text-xs text-slate-400">
                  Para perros senior con displasia: 3 a 4 paseos cortos de 10-15 minutos sobre superficies blandas (pasto/tierra).
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 self-start sm:self-auto">
                {walksToday.length} paseos registrados hoy
              </span>
            </div>

            {petData?.walkLogs && petData.walkLogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {petData.walkLogs.slice(0, 6).map((wlk) => (
                  <div key={wlk.id} className="p-3 rounded-xl bg-[#11131a] border border-slate-800/80 flex items-center justify-between gap-3 text-xs group">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        <span>{formatDisplayDate(wlk.date)} ({wlk.time})</span>
                        <span className="text-[#e0a96d] font-mono">{wlk.durationMinutes} min</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Superficie: <span className="text-slate-300">{wlk.surface}</span>
                      </p>
                      {wlk.notes && <p className="text-slate-400 italic text-[10px]">"{wlk.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        wlk.hipGaitRating === 'fluido'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : wlk.hipGaitRating === 'ligera_rigidez'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-red-500/10 text-red-300 border-red-500/30'
                      }`}>
                        {wlk.hipGaitRating === 'fluido' ? 'Marcha Fluida' : wlk.hipGaitRating === 'ligera_rigidez' ? 'Rigidez Leve' : 'Cojera / Molestia'}
                      </span>
                      <button
                        onClick={() => handleDeleteWalk(wlk.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-all cursor-pointer"
                        title="Eliminar registro de paseo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                Aún no has registrado paseos. Haz clic en "+ Registrar Paseo" para llevar el control diario.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GUARDERÍA & HIDROTERAPIA */}
      {activeTab === 'daycare_hydro' && (
        <div className="space-y-8">

          {/* DAYCARE HUB */}
          <div className="p-6 rounded-3xl bg-[#11131a] border border-[#e0a96d]/20 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                    <Car className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-100">
                    Guardería Canina (09:00 AM - 05:00 PM)
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Planificador de asistencia diaria y cálculo dinámico de hora de salida considerando el tráfico (30 a 60 min).
                </p>
              </div>

              {/* TRAFFIC TOGGLE */}
              <div className="flex items-center bg-[#171a24] p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setTrafficMode('normal')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    trafficMode === 'normal'
                      ? 'bg-sky-500 text-[#0b0c10] shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tráfico Ligero (30m)
                </button>
                <button
                  onClick={() => setTrafficMode('heavy')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    trafficMode === 'heavy'
                      ? 'bg-amber-500 text-[#0b0c10] shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tráfico Pesado (60m)
                </button>
              </div>
            </div>

            {/* TRAFFIC DEPARTURE CALCULATOR CARD */}
            <div className="p-4 rounded-2xl bg-[#171a24] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border font-mono font-black text-sm shrink-0 ${
                  trafficMode === 'heavy'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                }`}>
                  {trafficMode === 'heavy' ? '08:00' : '08:25'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Hora Recomendada de Salida: {trafficMode === 'heavy' ? '07:55 - 08:00 AM' : '08:25 - 08:30 AM'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {trafficMode === 'heavy'
                      ? 'Considerando 50-60 min de trayecto para llegar puntual antes de las 9:00 AM.'
                      : 'Considerando 30 min de trayecto fluido hacia la guardería.'}
                  </p>
                </div>
              </div>

              {/* Attendance action buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => handleLogDaycareAttendance('attended')}
                  className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-emerald-500 text-[#0b0c10] font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-md"
                >
                  🐾 Va a Guardería Hoy
                </button>
                <button
                  onClick={() => handleLogDaycareAttendance('stayed_home')}
                  className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-[#11131a] text-slate-300 border border-slate-700 font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  🛋️ Descanso en Casa
                </button>
              </div>
            </div>

            {/* WEEKLY TARGET PLANNER */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#e0a96d]" /> Días Planificados esta semana
                </span>
                <span className="text-slate-400">
                  Meta: Quieres llevarla diario (según tráfico y tiempo)
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => {
                  const isPlanned = (petData?.daycare?.plannedDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => handleToggleDaycareDay(day)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isPlanned
                          ? 'bg-[#e0a96d]/15 text-[#e0a96d] border-[#e0a96d]/40 font-bold'
                          : 'bg-[#171a24] text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs">{day}</div>
                      <div className="text-[10px] mt-1 opacity-80">
                        {isPlanned ? 'Planificado' : 'Opcional'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* HYDROTHERAPY & SWIMMING HUB */}
          <div className="p-6 rounded-3xl bg-[#11131a] border border-cyan-500/20 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                    <Waves className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-100">
                    Hidroterapia & Natación para Displasia
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Ejercicio de bajo impacto en agua que preserva la musculatura femoral sin fricción articular destructiva.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewHydroLog({
                    date: todayStr,
                    durationMinutes: 20,
                    postSwimBath: true,
                    deepDryingDone: true,
                    earCleaningDone: true,
                    mobilityAfter: 'excelente',
                    notes: 'Sesión de nado de bajo impacto en piscina temperada. Buen soporte en cadera.'
                  });
                  setShowAddHydroModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 text-[#0b0c10] text-xs font-black hover:bg-cyan-400 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Registrar Sesión de Nado
              </button>
            </div>

            {/* GERMAN SHEPHERD LONG COAT WARNING & PROTOCOL */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-cyan-100">
                <span className="font-bold text-cyan-300">
                  Protocolo Vital para Doble Manto de Pastor Alemán:
                </span>
                <p className="text-slate-300 leading-relaxed">
                  1. <strong>Baño coordinado cada 2 semanas</strong> tras salir de la alberca para retirar cloro y químicos.
                  <br />
                  2. <strong>Secado profundo hasta la piel:</strong> el manto denso atrapa humedad que genera "hot-spots" (dermatitis húmeda aguda).
                  <br />
                  3. <strong>Secado e higiene de oídos:</strong> prevenir otitis fúngica o bacteriana por entrada de agua al nadar.
                </p>
              </div>
            </div>

            {/* RECENT SESSIONS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Sesiones Registradas de Nado & Baño
              </h3>

              {petData?.hydrotherapy?.sessions && petData.hydrotherapy.sessions.length > 0 ? (
                <div className="space-y-2.5">
                  {petData.hydrotherapy.sessions.map((session) => (
                    <div key={session.id} className="p-4 rounded-2xl bg-[#171a24] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs group">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 font-bold text-slate-200">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span>{formatFullDisplayDate(session.date)}</span>
                          <span className="text-cyan-400 font-mono">({session.durationMinutes} min)</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                          {session.postSwimBath && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              ✓ Baño realizado
                            </span>
                          )}
                          {session.deepDryingDone && (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              ✓ Secado profundo de doble manto
                            </span>
                          )}
                          {session.earCleaningDone && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              ✓ Oídos limpios y secos
                            </span>
                          )}
                        </div>
                        {session.notes && <p className="text-slate-400 italic text-[11px] pt-1">"{session.notes}"</p>}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#11131a] text-cyan-300 border border-cyan-500/30 uppercase">
                          Movilidad: {session.mobilityAfter}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => setEditingHydroItem({ ...session })}
                            className="text-slate-400 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                            title="Editar sesión"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHydro(session.id)}
                            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                            title="Eliminar sesión"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs bg-[#171a24] rounded-2xl border border-slate-800">
                  No hay sesiones de nado registradas aún. Haz clic en "Registrar Sesión de Nado" después de su hidroterapia.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOTIQUÍN & MEDICAMENTOS */}
      {activeTab === 'medications' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#e0a96d]" /> Botiquín & Medicamentos de {petName}
              </h2>
              <p className="text-xs text-slate-400">
                Control estricto de Levotiroxina (en ayunas), gotas oftálmicas y suplementación articular para su displasia.
              </p>
            </div>

            <button
              onClick={() => setShowAddMedModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] text-xs font-black hover:bg-[#b37d46] transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Agregar Medicamento
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medications.map((med) => {
              const isMorningDone = med.lastAdministeredMorning === todayStr;
              const isNightDone = med.lastAdministeredNight === todayStr;
              const isOnceDone = med.lastAdministeredDate === todayStr;

              return (
                <div
                  key={med.id}
                  className="p-5 rounded-2xl bg-[#11131a] border border-slate-800 hover:border-[#e0a96d]/30 transition-all space-y-4 relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {med.condition || 'Condición médica'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 pt-0.5">
                        {med.name}
                      </h3>
                      <p className="text-xs text-[#e0a96d] font-semibold">
                        Dosis: {med.dosage}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => setEditingMedItem({ ...med })}
                        className="text-slate-400 hover:text-[#e0a96d] p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                        title="Editar medicamento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMed(med.id)}
                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                        title="Eliminar medicamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {med.notes && (
                    <p className="text-[11px] text-slate-400 bg-[#171a24] p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                      💡 {med.notes}
                    </p>
                  )}

                  {/* ADMINISTRATION BUTTONS */}
                  <div className="pt-2 border-t border-slate-800/80">
                    {med.timing === 'twice_daily' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAdministerMed(med.id, 'morning')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isMorningDone
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-[#171a24] text-slate-300 hover:bg-[#1f2330] border border-slate-700'
                          }`}
                        >
                          {isMorningDone ? <Check className="w-3.5 h-3.5" /> : null}
                          {isMorningDone ? 'Gota Mañana ✓' : 'Gota Mañana'}
                        </button>

                        <button
                          onClick={() => handleAdministerMed(med.id, 'night')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isNightDone
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-[#171a24] text-slate-300 hover:bg-[#1f2330] border border-slate-700'
                          }`}
                        >
                          {isNightDone ? <Check className="w-3.5 h-3.5" /> : null}
                          {isNightDone ? 'Gota Noche ✓' : 'Gota Noche'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAdministerMed(med.id, 'once')}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isOnceDone
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-[#e0a96d]/15 text-[#e0a96d] hover:bg-[#e0a96d]/25 border border-[#e0a96d]/30'
                        }`}
                      >
                        {isOnceDone ? <Check className="w-4 h-4" /> : null}
                        {isOnceDone ? 'Administrado Hoy ✓' : 'Marcar Administrado Hoy'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CALENDARIO PREVENTIVO */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#e0a96d]" /> Calendario Preventivo & Cuidados Periódicos
              </h2>
              <p className="text-xs text-slate-400">
                Ordenado cronológicamente por la actividad más próxima a la más lejana. Baño bimensual con natación, desparasitaciones, corte de uñas y vacunas.
              </p>
            </div>

            <button
              onClick={() => setShowAddPreventiveModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] text-xs font-black hover:bg-[#b37d46] transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Nuevo Cuidado Preventivo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedPreventiveCare.map((item) => {
              const daysLeft = item.nextDueDate ? getDaysDifference(todayStr, item.nextDueDate) : 0;
              const isOverdue = daysLeft < 0;
              const isDueSoon = daysLeft >= 0 && daysLeft <= 5;
              const currentInputDate = customPreventiveDates[item.id] || item.lastDate || todayStr;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#11131a] border border-slate-800 hover:border-[#e0a96d]/30 transition-all space-y-4 relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#171a24] text-slate-300 border border-slate-700">
                          {item.frequencyDesc}
                        </span>
                        {isOverdue ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            Vencido ({Math.abs(daysLeft)} días)
                          </span>
                        ) : isDueSoon ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Próximo ({daysLeft} días)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            En {daysLeft} días
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-100 pt-0.5">
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => setEditingPreventiveItem({ ...item })}
                        className="text-slate-400 hover:text-[#e0a96d] p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                        title="Editar evento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePreventive(item.id)}
                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                        title="Eliminar evento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-[#171a24] border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Última vez realizada:</span>
                      <span className="font-semibold text-slate-300">{formatDisplayDate(item.lastDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Próxima fecha:</span>
                      <span className="font-semibold text-[#e0a96d]">{formatDisplayDate(item.nextDueDate)}</span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                      "{item.notes}"
                    </p>
                  )}

                  {/* CUSTOM DATE LOGGING CONTROLS: HOY / AYER / SELECCIONAR FECHA */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Registrar última fecha en que se realizó:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleUpdatePreventiveDate(item.id, todayStr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          item.lastDate === todayStr
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-[#171a24] text-slate-300 hover:bg-[#1f2330] border border-slate-700'
                        }`}
                        title="Registrar que se realizó hoy"
                      >
                        Hoy ({formatDisplayDate(todayStr, { day: 'numeric', month: 'short' })})
                      </button>
                      <button
                        onClick={() => handleUpdatePreventiveDate(item.id, yesterdayStr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          item.lastDate === yesterdayStr
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-[#171a24] text-slate-300 hover:bg-[#1f2330] border border-slate-700'
                        }`}
                        title="Registrar que se realizó ayer"
                      >
                        Ayer
                      </button>

                      {/* Custom Date Input */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-[170px]">
                        <input
                          type="date"
                          value={currentInputDate}
                          onChange={(e) => {
                            setCustomPreventiveDates({
                              ...customPreventiveDates,
                              [item.id]: e.target.value
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#171a24] border border-slate-700 text-slate-200 text-xs outline-none focus:border-[#e0a96d] flex-1"
                        />
                        <button
                          onClick={() => handleUpdatePreventiveDate(item.id, currentInputDate)}
                          className="px-3 py-1.5 rounded-xl bg-[#e0a96d]/15 hover:bg-[#e0a96d]/25 text-[#e0a96d] border border-[#e0a96d]/30 text-xs font-bold cursor-pointer whitespace-nowrap"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: FICHA MÉDICA GERIÁTRICA & PROTOCOLO */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Dog className="w-5 h-5 text-[#e0a96d]" /> Ficha Médica Geriátrica de {petName}
              </h2>
              <p className="text-xs text-slate-400">
                Puntos críticos de manejo biomecánico, recomendaciones ortopédicas y contactos de emergencia veterinaria.
              </p>
            </div>

            <button
              onClick={() => {
                setProfileForm({
                  name: petName,
                  breed: petData?.profile?.breed || 'Pastor Alemán (Pelo Largo)',
                  ageYears: petData?.profile?.ageYears || 12,
                  gender: petData?.profile?.gender || 'Hembra',
                  weightKg: petData?.profile?.weightKg || 32.5,
                  microchip: petData?.profile?.microchip || '',
                  vetContact: petData?.profile?.vetContact || 'Dra. Veterinaria de Cabecera',
                  vetPhone: petData?.profile?.vetPhone || '+52 55 0000 0000',
                  emergencyClinic: petData?.profile?.emergencyClinic || 'Hospital Veterinario 24/7',
                  emergencyPhone: petData?.profile?.emergencyPhone || '+52 55 9999 9999',
                  daycareName: petData?.profile?.daycareName || 'Guardería Canina Campestre',
                  daycarePhone: petData?.profile?.daycarePhone || '+52 55 1234 5678',
                  notes: petData?.profile?.notes || ''
                });
                setShowEditProfileModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] text-xs font-black hover:bg-[#b37d46] transition-all cursor-pointer shadow-md"
            >
              <Edit3 className="w-4 h-4" /> Editar Datos y Teléfonos
            </button>
          </div>

          {/* EMERGENCY CONTACT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#11131a] border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Veterinaria de Cabecera
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                {petData?.profile?.vetContact || 'Dra. Veterinaria'}
              </h3>
              <a
                href={`tel:${petData?.profile?.vetPhone || ''}`}
                className="inline-flex items-center gap-1.5 text-xs text-[#e0a96d] font-bold hover:underline"
              >
                <Phone className="w-3.5 h-3.5" /> {petData?.profile?.vetPhone || 'Sin teléfono'}
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-[#11131a] border border-red-500/20 space-y-2">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                Urgencias Veterinarias 24/7
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                {petData?.profile?.emergencyClinic || 'Hospital Veterinario 24h'}
              </h3>
              <a
                href={`tel:${petData?.profile?.emergencyPhone || ''}`}
                className="inline-flex items-center gap-1.5 text-xs text-red-400 font-bold hover:underline"
              >
                <Phone className="w-3.5 h-3.5" /> {petData?.profile?.emergencyPhone || 'Sin teléfono'}
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-[#11131a] border border-sky-500/20 space-y-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                Guardería Canina
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                {petData?.profile?.daycareName || 'Guardería Campestre'}
              </h3>
              <a
                href={`tel:${petData?.profile?.daycarePhone || ''}`}
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-bold hover:underline"
              >
                <Phone className="w-3.5 h-3.5" /> {petData?.profile?.daycarePhone || 'Sin teléfono'}
              </a>
            </div>
          </div>

          {/* DETAILED BIOMECHANICAL & ORTHOPEDIC GUIDELINES (DYNAMIC) */}
          <div className="p-6 rounded-3xl bg-[#11131a] border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#e0a96d] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Respuestas & Guía de Manejo Biomecánico para Displasia en {petName}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Recomendaciones clave de ortopedia, arneses, suplementación, alimentación y biomecánica geriátrica.
                </p>
              </div>

              <button
                onClick={() => setShowAddTipModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#e0a96d] hover:bg-[#b37d46] text-[#0b0c10] font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" /> Agregar Recomendación / Guía
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {tipsList.map((tip) => {
                const isVitamins = tip.category === 'vitamins';
                const isGear = tip.category === 'gear';
                const isNutrition = tip.category === 'nutrition';
                const isBiomechanics = tip.category === 'biomechanics';

                const badgeClass = isVitamins
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  : isGear
                  ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                  : isNutrition
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : isBiomechanics
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                  : 'bg-teal-500/10 text-teal-300 border-teal-500/20';

                const categoryLabel = isVitamins
                  ? '💊 Vitaminas & Suplementos'
                  : isGear
                  ? '🦽 Equipo & Accesorios'
                  : isNutrition
                  ? '🥩 Alimentación & Nutrición'
                  : isBiomechanics
                  ? '🦴 Biomecánica & Ortopedia'
                  : '🐾 Cuidados & Manejo';

                return (
                  <div
                    key={tip.id}
                    className="p-5 rounded-2xl bg-[#171a24] border border-slate-800 hover:border-[#e0a96d]/30 transition-all space-y-3 relative group flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="text-xl shrink-0 mt-0.5">{tip.icon || '🐾'}</span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-100 text-sm leading-snug break-words">
                              {tip.title}
                            </h4>
                            <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeClass}`}>
                              {categoryLabel}
                            </span>
                          </div>
                        </div>

                        {/* Controls: Edit & Delete */}
                        <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingTipItem({ ...tip })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#e0a96d] hover:bg-slate-800 transition-all cursor-pointer"
                            title="Editar recomendación"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTip(tip.id, tip.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all cursor-pointer"
                            title="Eliminar recomendación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-line pt-1 border-t border-slate-800/60">
                        {tip.content}
                      </div>
                    </div>

                    {tip.createdAt && (
                      <div className="pt-2 text-[9px] text-slate-500 font-mono">
                        Agregado: {formatDisplayDate(tip.createdAt)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR ACTIVIDAD A LA RUTINA */}
      {showAddRoutineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#e0a96d]" /> Nueva Actividad de Rutina
              </h3>
              <button
                onClick={() => setShowAddRoutineModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoutineItem} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Hora:</label>
                <input
                  type="text"
                  placeholder="ej. 08:30 AM"
                  value={newRoutineItem.time}
                  onChange={(e) => setNewRoutineItem({ ...newRoutineItem, time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Categoría:</label>
                <select
                  value={newRoutineItem.category}
                  onChange={(e) => setNewRoutineItem({ ...newRoutineItem, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                >
                  <option value="medication">💊 Medicación</option>
                  <option value="walk">🐾 Paseo Suave</option>
                  <option value="food">🍲 Alimentación / Suplemento</option>
                  <option value="daycare">🚐 Guardería</option>
                  <option value="care">🛁 Cuidado / Higiene</option>
                  <option value="home">🏡 Hogar / Descanso</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Título de la actividad:</label>
                <input
                  type="text"
                  placeholder="ej. Cepillado de manto suave"
                  value={newRoutineItem.title}
                  onChange={(e) => setNewRoutineItem({ ...newRoutineItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Descripción / Notas:</label>
                <textarea
                  placeholder="Detalles sobre dosis, superficie, etc."
                  value={newRoutineItem.desc}
                  onChange={(e) => setNewRoutineItem({ ...newRoutineItem, desc: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoutineModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ACTIVIDAD DE RUTINA */}
      {editingRoutineItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#e0a96d]" /> Editar Actividad de Rutina
              </h3>
              <button
                onClick={() => setEditingRoutineItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoutine} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Hora:</label>
                <input
                  type="text"
                  value={editingRoutineItem.time}
                  onChange={(e) => setEditingRoutineItem({ ...editingRoutineItem, time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Categoría:</label>
                <select
                  value={editingRoutineItem.category}
                  onChange={(e) => setEditingRoutineItem({ ...editingRoutineItem, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                >
                  <option value="medication">💊 Medicación</option>
                  <option value="walk">🐾 Paseo Suave</option>
                  <option value="food">🍲 Alimentación / Suplemento</option>
                  <option value="daycare">🚐 Guardería</option>
                  <option value="care">🛁 Cuidado / Higiene</option>
                  <option value="home">🏡 Hogar / Descanso</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Título de la actividad:</label>
                <input
                  type="text"
                  value={editingRoutineItem.title}
                  onChange={(e) => setEditingRoutineItem({ ...editingRoutineItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Descripción / Notas:</label>
                <textarea
                  value={editingRoutineItem.desc}
                  onChange={(e) => setEditingRoutineItem({ ...editingRoutineItem, desc: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoutineItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PASEO */}
      {showAddWalkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-emerald-500/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" /> Registrar Paseo Articular Suave
              </h3>
              <button
                onClick={() => setShowAddWalkModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWalkLog} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={newWalkLog.date}
                    onChange={(e) => setNewWalkLog({ ...newWalkLog, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Hora aproximada:</label>
                  <input
                    type="text"
                    value={newWalkLog.time}
                    onChange={(e) => setNewWalkLog({ ...newWalkLog, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Duración (minutos):</label>
                <div className="flex gap-2">
                  {[10, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setNewWalkLog({ ...newWalkLog, durationMinutes: mins })}
                      className={`flex-1 py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                        newWalkLog.durationMinutes === mins
                          ? 'bg-emerald-500 text-[#0b0c10] border-emerald-400'
                          : 'bg-[#11131a] text-slate-300 border-slate-700'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
                {newWalkLog.durationMinutes > 20 && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    ⚠️ Precaución: Paseos &gt;20 min pueden sobrecargar articulaciones con displasia severa.
                  </p>
                )}
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Superficie:</label>
                <select
                  value={newWalkLog.surface}
                  onChange={(e) => setNewWalkLog({ ...newWalkLog, surface: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-emerald-500 outline-none"
                >
                  <option value="Pasto / Césped suave">Pasto / Césped suave (Recomendado)</option>
                  <option value="Tierra compacta">Tierra compacta</option>
                  <option value="Pavimento plano sin desniveles">Pavimento plano sin desniveles</option>
                  <option value="Jardín de casa">Jardín de casa</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Evaluación de Marcha / Cadera:</label>
                <select
                  value={newWalkLog.hipGaitRating}
                  onChange={(e) => setNewWalkLog({ ...newWalkLog, hipGaitRating: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-emerald-500 outline-none"
                >
                  <option value="fluido">Marcha fluida sin quejas ni tropiezos</option>
                  <option value="ligera_rigidez">Ligera rigidez al arrancar pero mejoró</option>
                  <option value="rigido_con_cojera">Rígida, pasos cortos o cojera visible</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas:</label>
                <input
                  type="text"
                  placeholder="ej. Hizo pipí y popó, caminó animada."
                  value={newWalkLog.notes}
                  onChange={(e) => setNewWalkLog({ ...newWalkLog, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWalkModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-[#0b0c10] font-black hover:bg-emerald-400 cursor-pointer"
                >
                  Guardar Paseo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR HIDROTERAPIA & NADO (CON FECHA PERSONALIZADA) */}
      {showAddHydroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-cyan-500/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Waves className="w-5 h-5 text-cyan-400" /> Registrar Sesión de Hidroterapia
              </h3>
              <button
                onClick={() => setShowAddHydroModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHydroLog} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Fecha de la sesión:</label>
                  <input
                    type="date"
                    value={newHydroLog.date}
                    onChange={(e) => setNewHydroLog({ ...newHydroLog, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-cyan-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Duración (minutos):</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={newHydroLog.durationMinutes}
                    onChange={(e) => setNewHydroLog({ ...newHydroLog, durationMinutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-cyan-400 outline-none"
                    required
                  />
                </div>
              </div>

              {/* CHECKLIST CRÍTICO POST-NADO */}
              <div className="space-y-2 p-3 rounded-xl bg-[#11131a] border border-slate-800">
                <span className="font-bold text-slate-300 block">
                  Cuidados Post-Nado ({petData?.profile?.breed || 'Pastor Alemán Pelo Largo'}):
                </span>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHydroLog.postSwimBath}
                    onChange={(e) => setNewHydroLog({ ...newHydroLog, postSwimBath: e.target.checked })}
                    className="rounded text-cyan-500"
                  />
                  <span>Baño con agua dulce & shampoo neutro (Actualiza calendario bimensual)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHydroLog.deepDryingDone}
                    onChange={(e) => setNewHydroLog({ ...newHydroLog, deepDryingDone: e.target.checked })}
                    className="rounded text-cyan-500"
                  />
                  <span>Secado profundo de raíz (anti hot-spots)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHydroLog.earCleaningDone}
                    onChange={(e) => setNewHydroLog({ ...newHydroLog, earCleaningDone: e.target.checked })}
                    className="rounded text-cyan-500"
                  />
                  <span>Secado ótico con toalla/gasa suave</span>
                </label>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Respuesta tras la sesión:</label>
                <select
                  value={newHydroLog.mobilityAfter}
                  onChange={(e) => setNewHydroLog({ ...newHydroLog, mobilityAfter: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-cyan-400 outline-none"
                >
                  <option value="excelente">Excelente: ágil y relajada</option>
                  <option value="buena">Buena: movió patitas con ánimo</option>
                  <option value="cansada_positiva">Cansancio normal positivo</option>
                  <option value="con_molestia">Mostró molestia o fatiga temprana</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas de la sesión:</label>
                <textarea
                  value={newHydroLog.notes}
                  onChange={(e) => setNewHydroLog({ ...newHydroLog, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-cyan-400 outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHydroModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-[#0b0c10] font-black hover:bg-cyan-400 cursor-pointer"
                >
                  Guardar Hidroterapia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR SESIÓN DE HIDROTERAPIA */}
      {editingHydroItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-cyan-500/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" /> Editar Sesión de Hidroterapia
              </h3>
              <button
                onClick={() => setEditingHydroItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditHydro} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={editingHydroItem.date}
                    onChange={(e) => setEditingHydroItem({ ...editingHydroItem, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-cyan-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Duración (minutos):</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={editingHydroItem.durationMinutes}
                    onChange={(e) => setEditingHydroItem({ ...editingHydroItem, durationMinutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-cyan-400 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-xl bg-[#11131a] border border-slate-800">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHydroItem.postSwimBath}
                    onChange={(e) => setEditingHydroItem({ ...editingHydroItem, postSwimBath: e.target.checked })}
                    className="rounded text-cyan-500"
                  />
                  <span>Baño con agua dulce & shampoo</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHydroItem.deepDryingDone}
                    onChange={(e) => setEditingHydroItem({ ...editingHydroItem, deepDryingDone: e.target.checked })}
                    className="rounded text-cyan-500"
                  />
                  <span>Secado profundo de raíz</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHydroItem.earCleaningDone}
                    onChange={(e) => setEditingHydroItem({ ...editingHydroItem, earCleaningDone: e.target.checked })}
                    className="rounded text-cyan-500"
                  />
                  <span>Secado ótico con toalla</span>
                </label>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Movilidad:</label>
                <select
                  value={editingHydroItem.mobilityAfter}
                  onChange={(e) => setEditingHydroItem({ ...editingHydroItem, mobilityAfter: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-cyan-400 outline-none"
                >
                  <option value="excelente">Excelente: ágil y relajada</option>
                  <option value="buena">Buena: movió patitas con ánimo</option>
                  <option value="cansada_positiva">Cansancio normal positivo</option>
                  <option value="con_molestia">Mostró molestia o fatiga temprana</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas:</label>
                <textarea
                  value={editingHydroItem.notes}
                  onChange={(e) => setEditingHydroItem({ ...editingHydroItem, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-cyan-400 outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHydroItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-[#0b0c10] font-black hover:bg-cyan-400 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR MEDICAMENTO */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#e0a96d]" /> Agregar Medicamento / Suplemento
              </h3>
              <button
                onClick={() => setShowAddMedModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMed} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nombre del medicamento o principio:</label>
                <input
                  type="text"
                  placeholder="ej. Levotiroxina 100mcg"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Condición o diagnóstico:</label>
                <input
                  type="text"
                  placeholder="ej. Hipotiroidismo / Displasia / Ojos"
                  value={newMed.condition}
                  onChange={(e) => setNewMed({ ...newMed, condition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Dosis prescrita:</label>
                <input
                  type="text"
                  placeholder="ej. 1 tableta / 1 gota cada ojo"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Tipo de Horario:</label>
                <select
                  value={newMed.timing}
                  onChange={(e) => setNewMed({ ...newMed, timing: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                >
                  <option value="morning_fasting">Mañana en ayunas (ej. Tiroides)</option>
                  <option value="twice_daily">2 veces al día (Mañana y Noche, ej. Gotas ojos)</option>
                  <option value="with_breakfast">Con desayuno (ej. Condroprotectores)</option>
                  <option value="with_dinner">Con cena (ej. Omega-3)</option>
                  <option value="anytime">Cualquier momento del día</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Instrucciones especiales:</label>
                <textarea
                  placeholder="ej. Dar 30 minutos antes del desayuno para no interferir absorción."
                  value={newMed.notes}
                  onChange={(e) => setNewMed({ ...newMed, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Medicamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR MEDICAMENTO */}
      {editingMedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#e0a96d]" /> Editar Medicamento
              </h3>
              <button
                onClick={() => setEditingMedItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMed} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nombre:</label>
                <input
                  type="text"
                  value={editingMedItem.name}
                  onChange={(e) => setEditingMedItem({ ...editingMedItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Condición:</label>
                <input
                  type="text"
                  value={editingMedItem.condition}
                  onChange={(e) => setEditingMedItem({ ...editingMedItem, condition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Dosis:</label>
                <input
                  type="text"
                  value={editingMedItem.dosage}
                  onChange={(e) => setEditingMedItem({ ...editingMedItem, dosage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Horario:</label>
                <select
                  value={editingMedItem.timing}
                  onChange={(e) => setEditingMedItem({ ...editingMedItem, timing: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                >
                  <option value="morning_fasting">Mañana en ayunas (ej. Tiroides)</option>
                  <option value="twice_daily">2 veces al día (Mañana y Noche, ej. Gotas ojos)</option>
                  <option value="with_breakfast">Con desayuno (ej. Condroprotectores)</option>
                  <option value="with_dinner">Con cena (ej. Omega-3)</option>
                  <option value="anytime">Cualquier momento del día</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas:</label>
                <textarea
                  value={editingMedItem.notes}
                  onChange={(e) => setEditingMedItem({ ...editingMedItem, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMedItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR EVENTO PREVENTIVO */}
      {showAddPreventiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#e0a96d]" /> Nuevo Cuidado Preventivo
              </h3>
              <button
                onClick={() => setShowAddPreventiveModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPreventive} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Título del cuidado:</label>
                <input
                  type="text"
                  placeholder="ej. Corte de uñas o Desparasitación"
                  value={newPreventive.title}
                  onChange={(e) => setNewPreventive({ ...newPreventive, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Intervalo en días:</label>
                <input
                  type="number"
                  min="1"
                  max="730"
                  value={newPreventive.intervalDays}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10) || 30;
                    setNewPreventive({
                      ...newPreventive,
                      intervalDays: days,
                      frequencyDesc: `Cada ${days} días`
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Fecha de última realización:</label>
                <input
                  type="date"
                  value={newPreventive.lastDate}
                  onChange={(e) => setNewPreventive({ ...newPreventive, lastDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas de importancia:</label>
                <textarea
                  placeholder="ej. Mantener uñas cortas para no forzar la cadera."
                  value={newPreventive.notes}
                  onChange={(e) => setNewPreventive({ ...newPreventive, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPreventiveModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Cuidado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EVENTO PREVENTIVO */}
      {editingPreventiveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#e0a96d]" /> Editar Cuidado Preventivo
              </h3>
              <button
                onClick={() => setEditingPreventiveItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPreventive} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Título:</label>
                <input
                  type="text"
                  value={editingPreventiveItem.title}
                  onChange={(e) => setEditingPreventiveItem({ ...editingPreventiveItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Intervalo en días:</label>
                  <input
                    type="number"
                    min="1"
                    max="730"
                    value={editingPreventiveItem.intervalDays}
                    onChange={(e) => {
                      const days = parseInt(e.target.value, 10) || 30;
                      setEditingPreventiveItem({
                        ...editingPreventiveItem,
                        intervalDays: days,
                        frequencyDesc: `Cada ${days} días`
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Descripción frecuencia:</label>
                  <input
                    type="text"
                    value={editingPreventiveItem.frequencyDesc}
                    onChange={(e) => setEditingPreventiveItem({ ...editingPreventiveItem, frequencyDesc: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Fecha de la última vez que fue / se realizó:
                </label>
                <input
                  type="date"
                  value={editingPreventiveItem.lastDate}
                  onChange={(e) => setEditingPreventiveItem({ ...editingPreventiveItem, lastDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Al cambiar esta fecha, se recalcula automáticamente la próxima fecha según el intervalo.
                </p>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas:</label>
                <textarea
                  value={editingPreventiveItem.notes}
                  onChange={(e) => setEditingPreventiveItem({ ...editingPreventiveItem, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPreventiveItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PERFIL DE MONA */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Dog className="w-5 h-5 text-[#e0a96d]" /> Ficha Médica & Contactos de {petName}
              </h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Nombre:</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Raza:</label>
                  <input
                    type="text"
                    value={profileForm.breed}
                    onChange={(e) => setProfileForm({ ...profileForm, breed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Edad (Años):</label>
                  <input
                    type="number"
                    value={profileForm.ageYears}
                    onChange={(e) => setProfileForm({ ...profileForm, ageYears: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Género:</label>
                  <input
                    type="text"
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Peso (kg):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profileForm.weightKg}
                    onChange={(e) => setProfileForm({ ...profileForm, weightKg: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <span className="font-bold text-slate-300 block">Contactos de Emergencia:</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Veterinaria de Cabecera:</label>
                    <input
                      type="text"
                      value={profileForm.vetContact}
                      onChange={(e) => setProfileForm({ ...profileForm, vetContact: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Teléfono Vet:</label>
                    <input
                      type="text"
                      value={profileForm.vetPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, vetPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Clínica 24h:</label>
                    <input
                      type="text"
                      value={profileForm.emergencyClinic}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyClinic: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Teléfono 24h:</label>
                    <input
                      type="text"
                      value={profileForm.emergencyPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Guardería Canina:</label>
                    <input
                      type="text"
                      value={profileForm.daycareName}
                      onChange={(e) => setProfileForm({ ...profileForm, daycareName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Teléfono Guardería:</label>
                    <input
                      type="text"
                      value={profileForm.daycarePhone}
                      onChange={(e) => setProfileForm({ ...profileForm, daycarePhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas especiales de cuidados:</label>
                <textarea
                  value={profileForm.notes}
                  onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR RECOMENDACIÓN / GUÍA */}
      {showAddTipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-outfit">
                <ShieldCheck className="w-5 h-5 text-[#e0a96d]" /> Nueva Recomendación para {petName}
              </h3>
              <button
                onClick={() => setShowAddTipModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTip} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Título de la recomendación:</label>
                <input
                  type="text"
                  placeholder="ej. Condroprotectores Glucosamina & MSM, Arnés Pélvico, Alimento Articular"
                  value={newTipItem.title}
                  onChange={(e) => setNewTipItem({ ...newTipItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Categoría:</label>
                  <select
                    value={newTipItem.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let defaultIcon = '🐾';
                      if (cat === 'vitamins') defaultIcon = '💊';
                      else if (cat === 'gear') defaultIcon = '🦽';
                      else if (cat === 'nutrition') defaultIcon = '🥩';
                      else if (cat === 'biomechanics') defaultIcon = '🦴';
                      setNewTipItem({ ...newTipItem, category: cat, icon: defaultIcon });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  >
                    <option value="vitamins">💊 Vitaminas & Suplementos</option>
                    <option value="gear">🦽 Equipo & Accesorios (Rampas / Arneses)</option>
                    <option value="nutrition">🥩 Alimentación & Nutrición</option>
                    <option value="biomechanics">🦴 Biomecánica & Ortopedia</option>
                    <option value="care">🐾 Cuidados & Manejo General</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Ícono (Emoji):</label>
                  <input
                    type="text"
                    value={newTipItem.icon}
                    onChange={(e) => setNewTipItem({ ...newTipItem, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none text-center"
                    maxLength={3}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Detalles, marcas recomendadas y pautas biomecánicas:
                </label>
                <textarea
                  rows={5}
                  placeholder={`Escribe aquí la recomendación detallada...\nPuedes incluir viñetas como:\n• Dosis o momento de administración\n• Marcas sugeridas (ej. Cosequin DS, YuMOVE)\n• Precauciones biomecánicas`}
                  value={newTipItem.content}
                  onChange={(e) => setNewTipItem({ ...newTipItem, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTipModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar en la Guía
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR RECOMENDACIÓN / GUÍA */}
      {editingTipItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-outfit">
                <Edit3 className="w-5 h-5 text-[#e0a96d]" /> Editar Recomendación
              </h3>
              <button
                onClick={() => setEditingTipItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTip} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Título:</label>
                <input
                  type="text"
                  value={editingTipItem.title}
                  onChange={(e) => setEditingTipItem({ ...editingTipItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Categoría:</label>
                  <select
                    value={editingTipItem.category}
                    onChange={(e) => setEditingTipItem({ ...editingTipItem, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  >
                    <option value="vitamins">💊 Vitaminas & Suplementos</option>
                    <option value="gear">🦽 Equipo & Accesorios (Rampas / Arneses)</option>
                    <option value="nutrition">🥩 Alimentación & Nutrición</option>
                    <option value="biomechanics">🦴 Biomecánica & Ortopedia</option>
                    <option value="care">🐾 Cuidados & Manejo General</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Ícono:</label>
                  <input
                    type="text"
                    value={editingTipItem.icon || '🐾'}
                    onChange={(e) => setEditingTipItem({ ...editingTipItem, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none text-center"
                    maxLength={3}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Contenido:</label>
                <textarea
                  rows={6}
                  value={editingTipItem.content || ''}
                  onChange={(e) => setEditingTipItem({ ...editingTipItem, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTipItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
