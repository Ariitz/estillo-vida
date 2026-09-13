import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Utensils,
  Camera,
  Sparkles,
  Flame,
  Scale,
  TrendingDown,
  TrendingUp,
  Droplet,
  Clock,
  Activity,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Info,
  Apple,
  RotateCcw,
  Award,
  Loader2,
  Calendar,
  AlertCircle,
  Zap,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Sliders,
  Share2,
  HelpCircle,
  CheckCircle2,
  BarChart2
} from 'lucide-react';
import { compressImage, analyzeMealImage, generateAdaptiveCoachingAdvice } from '../utils/geminiService';
import { 
  safeNumber, 
  sanitizeNutritionMeal, 
  sanitizeNutritionList, 
  sanitizeNutritionProfile,
  sanitizeDailyNutritionLog
} from '../utils/sanitizers';

export default function NutritionModule({
  nutritionMeals = [],
  setNutritionMeals,
  nutritionProfile = {},
  setNutritionProfile,
  dailyNutritionLogs = [],
  setDailyNutritionLogs,
  weight = 92.0,
  setWeight,
  height = 1.60,
  waterIntake = 0,
  setWaterIntake,
  schedule = [],
  geminiApiKey = '',
  showToast
}) {
  // Current active date view (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Profile & Goal Configuration
  const profile = useMemo(() => sanitizeNutritionProfile(nutritionProfile), [nutritionProfile]);
  
  // Photo Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedMeal, setScannedMeal] = useState(null);
  const [scannedImage, setScannedImage] = useState('');
  const [portionScale, setPortionScale] = useState(1);
  const fileInputRef = useRef(null);

  // Manual Add / Edit Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDayCloseModalOpen, setIsDayCloseModalOpen] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Quick activity calories burned
  const [extraBurnedKcal, setExtraBurnedKcal] = useState(() => {
    const saved = localStorage.getItem(`aura-extra-burned-${selectedDate}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem(`aura-extra-burned-${selectedDate}`, extraBurnedKcal.toString());
  }, [extraBurnedKcal, selectedDate]);

  // Form State for Manual Add
  const [manualForm, setManualForm] = useState({
    name: '',
    mealType: 'lunch',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    notes: '',
    satietyScore: 7,
    glycemicImpact: 'medium'
  });

  // Body scroll lock on modals
  useEffect(() => {
    if (editingMeal || isManualModalOpen || isProfileModalOpen || isDayCloseModalOpen || activePhotoModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [editingMeal, isManualModalOpen, isProfileModalOpen, isDayCloseModalOpen, activePhotoModal]);

  // Filter meals for selected date
  const safeMeals = useMemo(() => sanitizeNutritionList(nutritionMeals), [nutritionMeals]);
  const dayMeals = useMemo(() => safeMeals.filter(m => m.date === selectedDate), [safeMeals, selectedDate]);

  // Totals consumed today
  const dailyTotals = useMemo(() => {
    return dayMeals.reduce((acc, m) => {
      acc.calories += safeNumber(m.calories, 0);
      acc.protein += safeNumber(m.protein, 0);
      acc.carbs += safeNumber(m.carbs, 0);
      acc.fat += safeNumber(m.fat, 0);
      acc.fiber += safeNumber(m.fiber, 0);
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  }, [dayMeals]);

  // ==========================================
  // METABOLIC BMR & TDEE CALCULATION
  // ==========================================
  const metabolicStats = useMemo(() => {
    const w = safeNumber(weight, 70); // kg
    const h = safeNumber(height, 1.60) * 100; // cm
    const age = 30; // standard estimation

    // Mifflin-St Jeor (Female / Standardized): 10*W + 6.25*H - 5*Age - 161
    const bmr = Math.round(10 * w + 6.25 * h - 5 * age - 161);

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    const multiplier = activityMultipliers[profile.activityLevel] || 1.375;
    
    // Calculate exercise burned from schedule activities completed
    const completedWorkouts = (Array.isArray(schedule) ? schedule : [])
      .filter(s => s && s.completed && (
        String(s.title || '').toLowerCase().includes('entrenamiento') ||
        String(s.title || '').toLowerCase().includes('ejercicio') ||
        String(s.title || '').toLowerCase().includes('caminata') ||
        String(s.title || '').toLowerCase().includes('estiramiento')
      )).length;
    
    const workoutKcal = completedWorkouts * 120 + safeNumber(extraBurnedKcal, 0);
    const tdee = Math.round(bmr * multiplier) + workoutKcal;

    const netBalance = dailyTotals.calories - tdee;
    // 1 kg body fat = ~7,700 kcal -> Grams delta = (netBalance / 7.7)
    const projectedGramsDelta = parseFloat((netBalance / 7.7).toFixed(1));
    const targetDeficit = profile.dailyCalorieTarget - tdee;
    const remainingToTarget = profile.dailyCalorieTarget - dailyTotals.calories;

    return {
      bmr,
      tdee,
      workoutKcal,
      netBalance,
      projectedGramsDelta,
      targetDeficit,
      remainingToTarget
    };
  }, [weight, height, profile.activityLevel, profile.dailyCalorieTarget, schedule, extraBurnedKcal, dailyTotals.calories]);

  // Live Adaptive Coaching Tips
  const adaptiveTips = useMemo(() => {
    const latest = dayMeals[dayMeals.length - 1];
    return generateAdaptiveCoachingAdvice({
      latestMeal: latest,
      todayCalories: dailyTotals.calories,
      dailyCalorieTarget: profile.dailyCalorieTarget,
      waterIntake: waterIntake,
      waterGoal: 2000,
      tdee: metabolicStats.tdee
    });
  }, [dayMeals, dailyTotals.calories, profile.dailyCalorieTarget, waterIntake, metabolicStats.tdee]);

  // Handle Photo Upload with Multimodal Gemini Vision
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      showToast('info', 'Analizando Foto', 'Comprimiendo y escaneando nutrientes con IA...');

      const { dataUrl, base64, mimeType } = await compressImage(file, 800, 0.75);
      setScannedImage(dataUrl);

      const parsed = await analyzeMealImage(base64, mimeType, geminiApiKey);
      setScannedMeal({
        name: parsed.dishName || 'Platillo Escaneado',
        mealType: parsed.mealType || 'lunch',
        calories: parsed.calories || 450,
        protein: parsed.macros?.protein || 30,
        carbs: parsed.macros?.carbs || 40,
        fat: parsed.macros?.fat || 15,
        fiber: parsed.macros?.fiber || 5,
        satietyScore: parsed.satietyScore || 8.0,
        glycemicImpact: parsed.glycemicImpact || 'low',
        weightLossVerdict: parsed.weightLossVerdict || 'Muy favorable para déficit calórico.',
        weightLossTips: parsed.weightLossTips || [],
        ingredients: parsed.ingredients || [],
        healthySwaps: parsed.healthySwaps || [],
        notes: ''
      });
      setPortionScale(1);

      showToast('success', '¡Comida Analizada!', `Detectamos "${parsed.dishName}" (${parsed.calories} kcal).`);
    } catch (err) {
      console.error('Meal Vision Error:', err);
      showToast('warning', 'Lectura de Imagen', err.message || 'No se pudo analizar automáticamente la foto.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  // Save Scanned Meal to Database
  const handleSaveScannedMeal = () => {
    if (!scannedMeal) return;

    const scaled = {
      id: 'meal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: selectedDate,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      name: scannedMeal.name || 'Platillo Escaneado',
      mealType: scannedMeal.mealType || 'lunch',
      calories: Math.round(scannedMeal.calories * portionScale),
      protein: Math.round(scannedMeal.protein * portionScale),
      carbs: Math.round(scannedMeal.carbs * portionScale),
      fat: Math.round(scannedMeal.fat * portionScale),
      fiber: Math.round(scannedMeal.fiber * portionScale),
      image: scannedImage || '',
      satietyScore: scannedMeal.satietyScore || 8,
      glycemicImpact: scannedMeal.glycemicImpact || 'low',
      weightLossVerdict: scannedMeal.weightLossVerdict || '',
      weightLossTips: scannedMeal.weightLossTips || [],
      ingredients: (scannedMeal.ingredients || []).map(i => ({
        ...i,
        kcal: Math.round((i.kcal || 0) * portionScale)
      })),
      notes: scannedMeal.notes || '',
      portionMultiplier: portionScale
    };

    const sanitized = sanitizeNutritionMeal(scaled);
    if (!sanitized) return;

    setNutritionMeals(prev => [sanitized, ...(Array.isArray(prev) ? prev : [])]);
    showToast('success', 'Comida Registrada', `Se guardó "${sanitized.name}" (${sanitized.calories} kcal).`);
    
    // Reset scanner
    setScannedMeal(null);
    setScannedImage('');
    setPortionScale(1);
  };

  // Manual Add Submission
  const handleManualAddSubmit = (e) => {
    e.preventDefault();
    if (!manualForm.name.trim()) {
      showToast('warning', 'Campo Requerido', 'Ingresa el nombre del platillo.');
      return;
    }

    const newMeal = {
      id: 'meal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: selectedDate,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      name: manualForm.name.trim(),
      mealType: manualForm.mealType || 'lunch',
      calories: Math.max(0, parseInt(manualForm.calories, 10) || 0),
      protein: Math.max(0, parseInt(manualForm.protein, 10) || 0),
      carbs: Math.max(0, parseInt(manualForm.carbs, 10) || 0),
      fat: Math.max(0, parseInt(manualForm.fat, 10) || 0),
      fiber: Math.max(0, parseInt(manualForm.fiber, 10) || 0),
      image: '',
      satietyScore: manualForm.satietyScore || 7,
      glycemicImpact: manualForm.glycemicImpact || 'medium',
      weightLossVerdict: 'Registro manual.',
      weightLossTips: ['Procura acompañar con agua e incluir vegetales verdes.'],
      ingredients: [],
      notes: manualForm.notes || '',
      portionMultiplier: 1
    };

    const sanitized = sanitizeNutritionMeal(newMeal);
    if (!sanitized) return;

    setNutritionMeals(prev => [sanitized, ...(Array.isArray(prev) ? prev : [])]);
    showToast('success', 'Comida Registrada', `Se añadió "${sanitized.name}".`);
    setIsManualModalOpen(false);
    setManualForm({
      name: '',
      mealType: 'lunch',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      fiber: '',
      notes: '',
      satietyScore: 7,
      glycemicImpact: 'medium'
    });
  };

  // Edit Meal Save
  const handleSaveEditedMeal = (e) => {
    e.preventDefault();
    if (!editingMeal || !editingMeal.name.trim()) return;

    const sanitized = sanitizeNutritionMeal(editingMeal);
    if (!sanitized) return;

    setNutritionMeals(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === sanitized.id ? sanitized : m));
    showToast('success', 'Comida Actualizada', `Se guardaron los cambios para "${sanitized.name}".`);
    setEditingMeal(null);
  };

  // Delete Meal
  const handleDeleteMeal = (mealId, mealName) => {
    if (!window.confirm(`¿Deseas eliminar "${mealName}" de tu bitácora de hoy?`)) return;
    setNutritionMeals(prev => (Array.isArray(prev) ? prev : []).filter(m => m.id !== mealId));
    showToast('info', 'Comida Eliminada', `Se eliminó "${mealName}".`);
  };

  // Day Close & Next Day Reset Execution
  const handleConfirmDayClose = () => {
    // Generate intelligent next-day improvement tip
    let improvement = '';
    if (dailyTotals.protein < profile.targetProtein * 0.75) {
      improvement = 'Mañana aumenta tu consumo de proteína en el desayuno (huevos, yogur griego, tofu) para mantener saciedad sostenida.';
    } else if (waterIntake < 1500) {
      improvement = 'Tu ingesta de agua fue baja hoy. Mañana ten un termo de 1L en tu escritorio antes del mediodía.';
    } else if (metabolicStats.netBalance > 100) {
      improvement = 'Tuviste un ligero superávit. Mañana añade una caminata de 20 min y opta por una cena con mayor volumen vegetal.';
    } else {
      improvement = '¡Día impecable en déficit calórico! Mantén la misma cadencia mañana y cuida tus 7-8 horas de descanso.';
    }

    const logEntry = {
      id: `log-${selectedDate}`,
      date: selectedDate,
      caloriesConsumed: dailyTotals.calories,
      caloriesBurned: metabolicStats.workoutKcal,
      tdee: metabolicStats.tdee,
      netBalance: metabolicStats.netBalance,
      projectedGramsDelta: metabolicStats.projectedGramsDelta,
      waterMl: waterIntake,
      mealsCount: dayMeals.length,
      summaryNotes: `Consumo: ${dailyTotals.calories} kcal | Balance: ${metabolicStats.netBalance} kcal (${metabolicStats.projectedGramsDelta} g)`,
      improvementTip: improvement,
      closedAt: new Date().toISOString()
    };

    const sanitizedLog = sanitizeDailyNutritionLog(logEntry);
    if (sanitizedLog) {
      setDailyNutritionLogs(prev => {
        const filtered = (Array.isArray(prev) ? prev : []).filter(l => l.date !== selectedDate);
        return [sanitizedLog, ...filtered];
      });
    }

    showToast('success', '¡Día Cerrado con Éxito!', `Balance guardado: ${metabolicStats.projectedGramsDelta > 0 ? '+' : ''}${metabolicStats.projectedGramsDelta} g.`);
    setIsDayCloseModalOpen(false);

    // If closing today, navigate to fresh view or inform user
    if (selectedDate === todayStr) {
      showToast('info', 'Nuevo Inicio', 'Listo para registrar tu siguiente jornada.');
    }
  };

  // Group meals by mealType
  const mealSections = [
    { id: 'breakfast', label: 'Desayuno', icon: <Coffee className="w-4 h-4 text-amber-400" />, bg: 'from-amber-500/10 to-transparent' },
    { id: 'lunch', label: 'Almuerzo / Comida', icon: <Sun className="w-4 h-4 text-emerald-400" />, bg: 'from-emerald-500/10 to-transparent' },
    { id: 'dinner', label: 'Cena', icon: <Moon className="w-4 h-4 text-indigo-400" />, bg: 'from-indigo-500/10 to-transparent' },
    { id: 'snack', label: 'Snacks & Bebidas', icon: <Cookie className="w-4 h-4 text-rose-400" />, bg: 'from-rose-500/10 to-transparent' }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* TOP CONTROLS & DATE NAVIGATOR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#171a24] p-4 rounded-2xl border border-[#e0a96d]/15 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e0a96d]/20 to-[#e0a96d]/5 border border-[#e0a96d]/30 flex items-center justify-center text-[#e0a96d] shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-100 font-outfit flex items-center gap-2">
              <span>Nutrición & Scanner Calórico IA</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Pérdida de Grasa
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Escaneo visual multimodal, déficit calórico diario y proyección de peso en gramos
            </p>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#0b0c10] border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold px-2 text-slate-200">
              {selectedDate === todayStr ? 'Hoy' : selectedDate}
            </span>

            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsDayCloseModalOpen(true)}
            className="px-3 py-2 bg-[#0b0c10] hover:bg-[#e0a96d]/10 border border-[#e0a96d]/30 text-[#e0a96d] rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow"
            title="Cerrar día, ver balance final y recomendaciones para mañana"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Cerrar Día & Balance</span>
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="p-2 rounded-lg bg-[#0b0c10] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            title="Configurar Metas y Déficit"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. HERO METABOLIC DASHBOARD & GRAMS DELTA */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Main Grams & Energy Balance Card */}
        <div className="md:col-span-7 bg-[#171a24] border border-[#e0a96d]/20 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-[#e0a96d]" />
                Proyección de Peso Hoy (Gramos)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-black font-outfit tracking-tight ${
                  metabolicStats.projectedGramsDelta <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {metabolicStats.projectedGramsDelta <= 0 ? '' : '+'}
                  {metabolicStats.projectedGramsDelta} g
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {metabolicStats.projectedGramsDelta <= 0 ? 'de grasa proyectada quemada hoy' : 'de superávit calórico estimado'}
                </span>
              </div>
            </div>

            <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              metabolicStats.netBalance <= 0 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {metabolicStats.netBalance <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              <span>{Math.abs(metabolicStats.netBalance)} kcal {metabolicStats.netBalance <= 0 ? 'Déficit' : 'Superávit'}</span>
            </span>
          </div>

          {/* Caloric Balance Math Breakdown */}
          <div className="grid grid-cols-3 gap-2 bg-[#0b0c10] p-3 rounded-xl border border-slate-800 text-center my-2">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Consumidas</span>
              <span className="text-sm font-bold text-rose-400">{dailyTotals.calories} kcal</span>
            </div>
            <div className="border-x border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Gasto Total (TDEE)</span>
              <span className="text-sm font-bold text-emerald-400">{metabolicStats.tdee} kcal</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Meta Déficit</span>
              <span className="text-sm font-bold text-[#e0a96d]">{profile.dailyCalorieTarget} kcal</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>
              TDEE Base ({metabolicStats.bmr} BMR + {metabolicStats.workoutKcal} Ejercicio)
            </span>
            <span className={metabolicStats.remainingToTarget >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {metabolicStats.remainingToTarget >= 0 
                ? `${metabolicStats.remainingToTarget} kcal restantes para tu meta`
                : `+${Math.abs(metabolicStats.remainingToTarget)} kcal sobre tu meta`
              }
            </span>
          </div>
        </div>

        {/* Macronutrients Progress Gauge Card */}
        <div className="md:col-span-5 bg-[#171a24] border border-[#e0a96d]/20 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 font-outfit flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#e0a96d]" />
              <span>Macronutrientes del Día</span>
            </span>
            <span className="text-[10px] text-slate-400">Objetivo diario</span>
          </div>

          <div className="space-y-2.5 my-2">
            {/* Protein */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-indigo-300">Proteína ({dailyTotals.protein}g / {profile.targetProtein}g)</span>
                <span className="text-slate-400">{Math.round((dailyTotals.protein / profile.targetProtein) * 100)}%</span>
              </div>
              <div className="w-full bg-[#0b0c10] h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (dailyTotals.protein / profile.targetProtein) * 100)}%` }} 
                />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-amber-300">Carbohidratos ({dailyTotals.carbs}g / {profile.targetCarbs}g)</span>
                <span className="text-slate-400">{Math.round((dailyTotals.carbs / profile.targetCarbs) * 100)}%</span>
              </div>
              <div className="w-full bg-[#0b0c10] h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (dailyTotals.carbs / profile.targetCarbs) * 100)}%` }} 
                />
              </div>
            </div>

            {/* Fats */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-rose-300">Grasas ({dailyTotals.fat}g / {profile.targetFat}g)</span>
                <span className="text-slate-400">{Math.round((dailyTotals.fat / profile.targetFat) * 100)}%</span>
              </div>
              <div className="w-full bg-[#0b0c10] h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (dailyTotals.fat / profile.targetFat) * 100)}%` }} 
                />
              </div>
            </div>

            {/* Fiber */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-emerald-300">Fibra ({dailyTotals.fiber}g / {profile.targetFiber}g)</span>
                <span className="text-slate-400">{Math.round((dailyTotals.fiber / profile.targetFiber) * 100)}%</span>
              </div>
              <div className="w-full bg-[#0b0c10] h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (dailyTotals.fiber / profile.targetFiber) * 100)}%` }} 
                />
              </div>
            </div>
          </div>

          <span className="text-[10px] text-slate-500 text-center block">
            💡 Priorizar proteína y fibra maximiza la saciedad en déficit.
          </span>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. LIVE SMART ADAPTIVE COACH ALERTS */}
      {/* ========================================== */}
      {adaptiveTips.length > 0 && (
        <div className="bg-gradient-to-r from-[#171a24] via-[#1a1e2b] to-[#171a24] border border-[#e0a96d]/20 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e0a96d] font-outfit flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse text-[#e0a96d]" />
              <span>Coach Inteligente & Recomendaciones en Vivo</span>
            </span>
            <span className="text-[10px] text-slate-400">Adaptado a tu ingesta y ritmo actual</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {adaptiveTips.map((tip, idx) => (
              <div key={idx} className="bg-[#0b0c10]/80 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-[#171a24] text-[#e0a96d] shrink-0 mt-0.5">
                  {tip.type.includes('water') ? <Droplet className="w-4 h-4 text-sky-400" /> :
                   tip.type.includes('timing') ? <Clock className="w-4 h-4 text-amber-400" /> :
                   tip.type.includes('exercise') ? <Activity className="w-4 h-4 text-emerald-400" /> :
                   <Flame className="w-4 h-4 text-[#e0a96d]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-200">{tip.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. SCANNER & QUICK ACTIONS */}
      {/* ========================================== */}
      <div className="bg-[#171a24] border border-[#e0a96d]/20 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#e0a96d]" />
              <span>Escanear Comida con Gemini Visión IA</span>
            </h3>
            <p className="text-xs text-slate-400">
              Sube una foto de tu plato para detectar calorías, macros y sugerencias de pérdida de peso
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="btn-rose-gold text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all flex-1 sm:flex-initial shadow-lg"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#0b0c10] animate-spin" />
                  <span>Analizando Plato con IA...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Tomar / Subir Foto</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-[#0b0c10] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Registro Manual</span>
            </button>
          </div>
        </div>

        {/* AI Scanning Preview & Portion Tuner Card */}
        {scannedMeal && (
          <div className="bg-[#0b0c10] border border-[#e0a96d]/40 rounded-2xl p-4 sm:p-5 animate-fade-in space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Análisis Multimodal Listo — Revisa y Confirma</span>
              </span>
              <button
                onClick={() => { setScannedMeal(null); setScannedImage(''); }}
                className="text-slate-400 hover:text-rose-400 p-1 rounded cursor-pointer"
                title="Descartar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Image thumbnail */}
              {scannedImage && (
                <div className="md:col-span-3 w-full h-36 rounded-xl overflow-hidden border border-[#e0a96d]/30 relative group">
                  <img src={scannedImage} alt="Comida Escaneada" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-1 rounded">Foto Capturada</span>
                  </div>
                </div>
              )}

              {/* Data & Portion Tuner */}
              <div className={scannedImage ? "md:col-span-9 space-y-3" : "md:col-span-12 space-y-3"}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-slate-100 font-outfit">{scannedMeal.name}</h4>
                    <span className="text-xs text-slate-400">{scannedMeal.weightLossVerdict}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-[#e0a96d] font-outfit">
                      {Math.round(scannedMeal.calories * portionScale)} kcal
                    </span>
                    <select
                      value={scannedMeal.mealType}
                      onChange={(e) => setScannedMeal({ ...scannedMeal, mealType: e.target.value })}
                      className="bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-1 px-2 text-slate-200 text-xs font-semibold focus:outline-none"
                    >
                      <option value="breakfast">🍳 Desayuno</option>
                      <option value="lunch">🥗 Almuerzo / Comida</option>
                      <option value="dinner">🌙 Cena</option>
                      <option value="snack">🍎 Snack</option>
                    </select>
                  </div>
                </div>

                {/* Portion Multiplier buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400 font-medium">Ajustar Porción:</span>
                  {[
                    { label: '0.5x (Mitad)', val: 0.5 },
                    { label: '1.0x (Normal)', val: 1.0 },
                    { label: '1.5x (Grande)', val: 1.5 },
                    { label: '2.0x (Doble)', val: 2.0 }
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setPortionScale(p.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        portionScale === p.val 
                          ? 'bg-[#e0a96d] text-[#0b0c10] shadow' 
                          : 'bg-[#171a24] text-slate-300 hover:bg-slate-800 border border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Macros Preview Pills */}
                <div className="flex flex-wrap gap-2 text-xs font-bold pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Proteína: {Math.round(scannedMeal.protein * portionScale)}g
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Carbs: {Math.round(scannedMeal.carbs * portionScale)}g
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    Grasa: {Math.round(scannedMeal.fat * portionScale)}g
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Fibra: {Math.round(scannedMeal.fiber * portionScale)}g
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    Saciedad: {scannedMeal.satietyScore}/10
                  </span>
                </div>

                {/* AI Weight loss Tips */}
                {scannedMeal.weightLossTips?.length > 0 && (
                  <div className="bg-[#171a24] p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <span className="font-bold text-[#e0a96d] block">💡 Recomendación para tu déficit:</span>
                    <p className="text-slate-400">{scannedMeal.weightLossTips[0]}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setScannedMeal(null); setScannedImage(''); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 border border-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveScannedMeal}
                className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-xl cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar en Bitácora de Hoy</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 4. DAILY MEALS LOG BY SECTION */}
      {/* ========================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-100 font-outfit flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#e0a96d]" />
            <span>Comidas Registradas ({selectedDate})</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {dayMeals.length} {dayMeals.length === 1 ? 'registro' : 'registros'} • {dailyTotals.calories} kcal
          </span>
        </div>

        {dayMeals.length === 0 ? (
          <div className="bg-[#171a24] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#e0a96d]/10 border border-[#e0a96d]/20 text-[#e0a96d] flex items-center justify-center mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">No hay comidas registradas para esta fecha</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Toma una foto de tu desayuno, almuerzo o cena para autocalcular tus calorías y avanzar en tu meta de peso.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-xl cursor-pointer inline-flex items-center gap-2 mt-2"
            >
              <Camera className="w-4 h-4" />
              <span>Escanear Primera Comida</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {mealSections.map(sec => {
              const secMeals = dayMeals.filter(m => m.mealType === sec.id);
              if (secMeals.length === 0) return null;

              const secKcal = secMeals.reduce((acc, m) => acc + safeNumber(m.calories, 0), 0);

              return (
                <div key={sec.id} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-[#171a24] border border-slate-800">{sec.icon}</span>
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{sec.label}</h4>
                    </div>
                    <span className="text-xs font-bold text-[#e0a96d]">{secKcal} kcal</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {secMeals.map(meal => (
                      <div 
                        key={meal.id} 
                        className="bg-[#171a24] border border-slate-800 hover:border-[#e0a96d]/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all group"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {meal.image ? (
                                <button
                                  type="button"
                                  onClick={() => setActivePhotoModal(meal.image)}
                                  className="w-14 h-14 rounded-xl overflow-hidden border border-[#e0a96d]/30 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                  title="Ver foto en grande"
                                >
                                  <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
                                </button>
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-[#0b0c10] border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                  <Utensils className="w-6 h-6" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-400 font-semibold">{meal.time}</span>
                                <h5 className="text-sm font-bold text-slate-100 font-outfit truncate">{meal.name}</h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-sm font-extrabold text-[#e0a96d]">{meal.calories} kcal</span>
                                  {meal.satietyScore && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      Saciedad: {meal.satietyScore}/10
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setEditingMeal({ ...meal })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#e0a96d] hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Editar comida"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMeal(meal.id, meal.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Eliminar comida"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Macro pills */}
                          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              P: {meal.protein}g
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              C: {meal.carbs}g
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                              G: {meal.fat}g
                            </span>
                            {meal.fiber > 0 && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                F: {meal.fiber}g
                              </span>
                            )}
                          </div>

                          {/* Recommendation snippet */}
                          {meal.weightLossTips?.length > 0 && (
                            <p className="text-[10px] text-slate-400 bg-[#0b0c10] p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                              💡 {meal.weightLossTips[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 5. MODAL: MANUAL ADD MEAL */}
      {/* ========================================== */}
      {isManualModalOpen && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleManualAddSubmit} className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#e0a96d]" />
                <span>Registro Manual de Comida</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 py-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Platillo / Alimento *</label>
                <input
                  type="text"
                  placeholder="Ej. Omelette con espinacas y queso panela"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tiempo de Comida</label>
                  <select
                    value={manualForm.mealType}
                    onChange={(e) => setManualForm({ ...manualForm, mealType: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  >
                    <option value="breakfast">Desayuno 🍳</option>
                    <option value="lunch">Almuerzo / Comida 🥗</option>
                    <option value="dinner">Cena 🌙</option>
                    <option value="snack">Snack 🍎</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Calorías Totales (kcal) *</label>
                  <input
                    type="number"
                    placeholder="Ej. 350"
                    value={manualForm.calories}
                    onChange={(e) => setManualForm({ ...manualForm, calories: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-indigo-300 mb-0.5">Proteína (g)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={manualForm.protein}
                    onChange={(e) => setManualForm({ ...manualForm, protein: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-amber-300 mb-0.5">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={manualForm.carbs}
                    onChange={(e) => setManualForm({ ...manualForm, carbs: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-rose-300 mb-0.5">Grasas (g)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={manualForm.fat}
                    onChange={(e) => setManualForm({ ...manualForm, fat: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-emerald-300 mb-0.5">Fibra (g)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={manualForm.fiber}
                    onChange={(e) => setManualForm({ ...manualForm, fiber: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notas u Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej. Con 1 cdta de aceite de oliva, muy saciante"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-lg cursor-pointer"
              >
                Añadir Comida
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ========================================== */}
      {/* 6. MODAL: EDIT MEAL */}
      {/* ========================================== */}
      {editingMeal && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleSaveEditedMeal} className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#e0a96d]" />
                <span>Editar Comida</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 py-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingMeal.name}
                  onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tiempo</label>
                  <select
                    value={editingMeal.mealType}
                    onChange={(e) => setEditingMeal({ ...editingMeal, mealType: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                  >
                    <option value="breakfast">Desayuno 🍳</option>
                    <option value="lunch">Almuerzo / Comida 🥗</option>
                    <option value="dinner">Cena 🌙</option>
                    <option value="snack">Snack 🍎</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={editingMeal.calories}
                    onChange={(e) => setEditingMeal({ ...editingMeal, calories: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-indigo-300 mb-0.5">Proteína</label>
                  <input
                    type="number"
                    value={editingMeal.protein}
                    onChange={(e) => setEditingMeal({ ...editingMeal, protein: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-amber-300 mb-0.5">Carbs</label>
                  <input
                    type="number"
                    value={editingMeal.carbs}
                    onChange={(e) => setEditingMeal({ ...editingMeal, carbs: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-rose-300 mb-0.5">Grasas</label>
                  <input
                    type="number"
                    value={editingMeal.fat}
                    onChange={(e) => setEditingMeal({ ...editingMeal, fat: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-emerald-300 mb-0.5">Fibra</label>
                  <input
                    type="number"
                    value={editingMeal.fiber}
                    onChange={(e) => setEditingMeal({ ...editingMeal, fiber: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notas</label>
                <input
                  type="text"
                  value={editingMeal.notes || ''}
                  onChange={(e) => setEditingMeal({ ...editingMeal, notes: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-lg cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ========================================== */}
      {/* 7. MODAL: DAY CLOSE & NEXT DAY RESET */}
      {/* ========================================== */}
      {isDayCloseModalOpen && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 font-outfit">Cierre de Día & Balance Energético</h4>
                  <span className="text-xs text-slate-400">Resumen del {selectedDate}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDayCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-3">
              {/* Grams highlight */}
              <div className={`p-4 rounded-xl border text-center ${
                metabolicStats.projectedGramsDelta <= 0 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Variación de Peso Proyectada
                </span>
                <span className={`text-4xl font-black font-outfit my-1 block ${
                  metabolicStats.projectedGramsDelta <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {metabolicStats.projectedGramsDelta <= 0 ? '' : '+'}
                  {metabolicStats.projectedGramsDelta} g
                </span>
                <p className="text-xs text-slate-300">
                  {metabolicStats.projectedGramsDelta <= 0 
                    ? '¡Felicidades! Mantuviste un déficit calórico que estimula la pérdida neta de grasa corporal.' 
                    : 'Tuviste un superávit. Mañana es una excelente oportunidad para equilibrar con actividad física.'}
                </p>
              </div>

              {/* Day metrics summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-[#0b0c10] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Consumidas</span>
                  <span className="text-sm font-bold text-rose-400">{dailyTotals.calories} kcal</span>
                </div>
                <div className="bg-[#0b0c10] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">TDEE Gasto</span>
                  <span className="text-sm font-bold text-emerald-400">{metabolicStats.tdee} kcal</span>
                </div>
                <div className="bg-[#0b0c10] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Proteína Total</span>
                  <span className="text-sm font-bold text-indigo-400">{dailyTotals.protein} g</span>
                </div>
                <div className="bg-[#0b0c10] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Agua Registrada</span>
                  <span className="text-sm font-bold text-sky-400">{waterIntake} ml</span>
                </div>
              </div>

              {/* Next Day Improvement Advice */}
              <div className="bg-gradient-to-tr from-[#171a24] to-[#1e2333] p-4 rounded-xl border border-[#e0a96d]/30 space-y-2">
                <span className="text-xs font-bold text-[#e0a96d] font-outfit flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#e0a96d]" />
                  <span>Sugerencia Educada para Mejorar Mañana:</span>
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {dailyTotals.protein < profile.targetProtein * 0.75 
                    ? '🎯 Tu ingesta de proteína estuvo por debajo del objetivo. Mañana procura incluir 25-30g de proteína en tu desayuno para blindar tu masa muscular y controlar antojos.'
                    : waterIntake < 1600
                    ? '🎯 Tu hidratación fue menor a 1.6L. Mañana bebe un vaso de agua al despertar y mantén una botella cerca para optimizar tu gasto calórico basal.'
                    : metabolicStats.netBalance > 100
                    ? '🎯 Para compensar el superávit, mañana agrega una caminata de 20-30 min y da prioridad a ensaladas voluminosas en la cena.'
                    : '🎯 ¡Excelente adherencia! Para mañana mantén la misma estructura de comidas y asegúrate de dormir entre 7 y 8 horas.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsDayCloseModalOpen(false)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleConfirmDayClose}
                className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cierre en Historial</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================== */}
      {/* 8. MODAL: PROFILE & DEFICIT SETTINGS */}
      {/* ========================================== */}
      {isProfileModalOpen && createPortal(
        <div className="fixed inset-0 bg-[#0b0c10]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#171a24] border border-[#e0a96d]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-modal-pop my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#e0a96d]" />
                <span>Configurar Metas y Déficit Calórico</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Meta Calórica Diaria (kcal)</label>
                <input
                  type="number"
                  value={profile.dailyCalorieTarget}
                  onChange={(e) => setNutritionProfile({ ...profile, dailyCalorieTarget: parseInt(e.target.value, 10) || 1500 })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Recomendado para pérdida de grasa: 1,300 - 1,700 kcal según tu actividad.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nivel de Actividad</label>
                  <select
                    value={profile.activityLevel}
                    onChange={(e) => setNutritionProfile({ ...profile, activityLevel: e.target.value })}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                  >
                    <option value="sedentary">Sedentario (Oficina)</option>
                    <option value="light">Ligero (1-3 días ejerc)</option>
                    <option value="moderate">Moderado (3-5 días)</option>
                    <option value="active">Activo (6-7 días)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Gasto Extra Hoy (kcal)</label>
                  <input
                    type="number"
                    value={extraBurnedKcal}
                    onChange={(e) => setExtraBurnedKcal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0"
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2">
                <span className="text-xs font-bold text-slate-300 block">Objetivo de Macronutrientes (g)</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-indigo-300">Proteína</label>
                    <input
                      type="number"
                      value={profile.targetProtein}
                      onChange={(e) => setNutritionProfile({ ...profile, targetProtein: parseInt(e.target.value, 10) || 110 })}
                      className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-300">Carbs</label>
                    <input
                      type="number"
                      value={profile.targetCarbs}
                      onChange={(e) => setNutritionProfile({ ...profile, targetCarbs: parseInt(e.target.value, 10) || 130 })}
                      className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-rose-300">Grasa</label>
                    <input
                      type="number"
                      value={profile.targetFat}
                      onChange={(e) => setNutritionProfile({ ...profile, targetFat: parseInt(e.target.value, 10) || 45 })}
                      className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-emerald-300">Fibra</label>
                    <input
                      type="number"
                      value={profile.targetFiber}
                      onChange={(e) => setNutritionProfile({ ...profile, targetFiber: parseInt(e.target.value, 10) || 25 })}
                      className="w-full bg-[#0b0c10] border border-slate-700 rounded-lg py-1.5 px-2 text-slate-100 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-lg cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================== */}
      {/* 9. PHOTO ZOOM MODAL */}
      {/* ========================================== */}
      {activePhotoModal && createPortal(
        <div 
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-[#e0a96d]/40 shadow-2xl">
            <img src={activePhotoModal} alt="Foto de comida" className="w-full h-full object-contain" />
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
