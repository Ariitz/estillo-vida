/**
 * AURA Nexus - Data Sanitizers & Validators
 * Ensures robust data integrity across modules, local storage, cloud sync, and AI inputs.
 */

import { getLocalDateString } from './dateUtils';

export const safeNumber = (val, fallback = 0) => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};

export const safeString = (val, fallback = '') => {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') {
    return val.name || val.title || val.text || val.label || val.value || JSON.stringify(val);
  }
  return String(val);
};

// 1. Household Items (Comparador de Precios)
export const sanitizeHouseholdItem = (item) => {
  if (!item || typeof item !== 'object') return null;

  const name = safeString(item.name || item.title || 'Producto');
  const category = safeString(item.category || 'Skincare');
  const notes = safeString(Array.isArray(item.notes) ? item.notes.join('. ') : item.notes);

  const stores = (Array.isArray(item.stores) ? item.stores : [])
    .filter(s => s && typeof s === 'object')
    .map(s => {
      const price = safeNumber(s.price, 0);
      const quantity = safeNumber(s.quantity, 1);
      const unitPrice = typeof s.unitPrice === 'number' && !isNaN(s.unitPrice)
        ? s.unitPrice
        : (quantity > 0 ? price / quantity : 0);
      return {
        storeName: safeString(s.storeName || s.name || s.store || 'Tienda'),
        variety: safeString(s.variety || s.subproduct || s.brand || s.presentation || ''),
        price: price,
        quantity: quantity,
        unitPrice: unitPrice
      };
    })
    .filter(s => s.price > 0 && s.quantity > 0);

  let preferredStore = safeString(item.preferredStore);
  if (!preferredStore && stores.length > 0) {
    preferredStore = stores[0].storeName;
  }

  let repurchaseVerdict = 'yes';
  if (['yes', 'maybe', 'no', 'need_to_buy', 'running_low'].includes(item.repurchaseVerdict)) {
    repurchaseVerdict = item.repurchaseVerdict;
  }

  const subproducts = Array.isArray(item.subproducts)
    ? Array.from(new Set([...item.subproducts.map(safeString).filter(Boolean), ...stores.map(s => s.variety).filter(Boolean)]))
    : Array.from(new Set(stores.map(s => s.variety).filter(Boolean)));

  let favoriteVariety = safeString(item.favoriteVariety || '');

  const rawOpinions = (item.varietyOpinions && typeof item.varietyOpinions === 'object') ? item.varietyOpinions : {};
  const varietyOpinions = {};
  for (const [varKey, val] of Object.entries(rawOpinions)) {
    const cleanKey = safeString(varKey).trim();
    if (!cleanKey) continue;
    if (typeof val === 'string') {
      const isFav = cleanKey === favoriteVariety;
      varietyOpinions[cleanKey] = {
        opinion: safeString(val),
        rating: isFav ? 'favorite' : 'liked',
        isFavorite: isFav
      };
    } else if (val && typeof val === 'object') {
      const validRatings = ['favorite', 'liked', 'neutral', 'disliked'];
      const rating = validRatings.includes(val.rating) ? val.rating : (val.isFavorite ? 'favorite' : 'liked');
      const isFav = Boolean(val.isFavorite || (favoriteVariety && cleanKey === favoriteVariety));
      if (isFav && !favoriteVariety) {
        favoriteVariety = cleanKey;
      }
      varietyOpinions[cleanKey] = {
        opinion: safeString(val.opinion || val.notes || val.comment || ''),
        rating: rating,
        isFavorite: isFav
      };
    }
  }

  if (favoriteVariety && varietyOpinions[favoriteVariety]) {
    varietyOpinions[favoriteVariety].isFavorite = true;
  }

  return {
    id: safeString(item.id || 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    name: name,
    category: category,
    stores: stores,
    subproducts: subproducts,
    favoriteVariety: favoriteVariety,
    varietyOpinions: varietyOpinions,
    preferredStore: preferredStore,
    repurchaseVerdict: repurchaseVerdict,
    notes: notes
  };
};

export const sanitizeHouseholdList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeHouseholdItem).filter(Boolean);
};

// 2. Self-Care Activities (Calendario de Autocuidado)
export const sanitizeSelfCareItem = (sc) => {
  if (!sc || typeof sc !== 'object') return null;

  const title = safeString(sc.title || sc.name || 'Actividad de Autocuidado');
  const daysInterval = Math.max(1, parseInt(sc.daysInterval, 10) || 2);
  const frequency = safeString(sc.frequency || 'custom');
  const customUnit = safeString(sc.customUnit || 'days');
  const customValue = Math.max(1, parseInt(sc.customValue || sc.daysInterval, 10) || 2);

  let category = 'beauty';
  if (sc.category === 'skincare' || sc.category === 'beauty') category = 'beauty';
  else if (typeof sc.category === 'string') category = sc.category;

  const notes = safeString(Array.isArray(sc.notes) ? sc.notes.join('. ') : sc.notes);
  const protocol = safeString(Array.isArray(sc.protocol) ? sc.protocol.join('. ') : (sc.protocol || 'Cadencia configurada.'));

  return {
    id: safeString(sc.id || 'sc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    title: title,
    frequency: frequency,
    customValue: customValue,
    customUnit: customUnit,
    daysInterval: daysInterval,
    lastCompletedDate: safeString(sc.lastCompletedDate || getLocalDateString()),
    category: category,
    notes: notes,
    protocol: protocol
  };
};

export const sanitizeSelfCareList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeSelfCareItem).filter(Boolean);
};

// 3. Schedule Items (Cronograma Diario)
export const sanitizeScheduleItem = (item) => {
  if (!item || typeof item !== 'object') return null;

  const title = safeString(item.title || item.name || 'Bloque de Rutina');
  const time = safeString(item.time || '08:00 AM');
  const desc = safeString(item.desc || item.notes || item.description || '');
  let category = safeString(item.category || 'morning');
  if (!['morning', 'afternoon', 'night'].includes(category)) {
    category = time.includes('AM') ? 'morning' : 'afternoon';
  }

  return {
    id: safeString(item.id || 'sch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    time: time,
    title: title,
    desc: desc,
    category: category,
    completed: Boolean(item.completed),
    tag: safeString(item.tag || 'general'),
    isRoutine: item.isRoutine !== undefined ? Boolean(item.isRoutine) : true
  };
};

export const sanitizeScheduleList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeScheduleItem).filter(Boolean);
};

// 4. Health Symptoms (Tracker de Dolor & Salud)
export const sanitizeAiTriage = (triage) => {
  if (!triage || typeof triage !== 'object') return null;

  return {
    specialist: safeString(triage.specialist || 'Médico General / Especialista'),
    specialistDescription: safeString(triage.specialistDescription || ''),
    priority: safeString(triage.priority || 'Atención Recomendada'),
    physiologicalExplanation: safeString(triage.physiologicalExplanation || ''),
    immediateReliefTips: Array.isArray(triage.immediateReliefTips)
      ? triage.immediateReliefTips.map(t => safeString(t)).filter(Boolean)
      : (typeof triage.immediateReliefTips === 'string' ? [triage.immediateReliefTips] : []),
    consultationQuestions: Array.isArray(triage.consultationQuestions)
      ? triage.consultationQuestions.map(q => safeString(q)).filter(Boolean)
      : (typeof triage.consultationQuestions === 'string' ? [triage.consultationQuestions] : []),
    lifestyleHabits: Array.isArray(triage.lifestyleHabits)
      ? triage.lifestyleHabits.map(h => safeString(h)).filter(Boolean)
      : (typeof triage.lifestyleHabits === 'string' ? [triage.lifestyleHabits] : []),
    redFlags: safeString(triage.redFlags || '')
  };
};

export const sanitizeHealthSymptom = (s) => {
  if (!s || typeof s !== 'object') return null;

  const validStatuses = ['active', 'treatment', 'resolved', 'relieved', 'monitoring'];
  const rawStatus = safeString(s.status || 'active').toLowerCase();
  const normalizedStatus = validStatuses.includes(rawStatus) ? rawStatus : 'active';

  return {
    id: safeString(s.id || 'hlth-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    title: safeString(s.title || s.name || s.symptom || 'Registro de Síntoma'),
    category: safeString(s.category || 'pain_posture'),
    bodyZone: safeString(s.bodyZone || s.bodyPart || 'general'),
    painLevel: Math.min(10, Math.max(1, parseInt(s.painLevel || s.severity, 10) || 5)),
    trigger: safeString(s.trigger || (Array.isArray(s.triggers) ? s.triggers.join(', ') : s.triggers) || ''),
    frequency: safeString(s.frequency || 'Ocasional'),
    notes: safeString(s.notes || ''),
    status: normalizedStatus,
    createdAt: safeString(s.createdAt || s.date || getLocalDateString()),
    lastAnalyzedDate: s.lastAnalyzedDate ? safeString(s.lastAnalyzedDate) : null,
    aiTriage: s.aiTriage ? sanitizeAiTriage(s.aiTriage) : null
  };
};

export const sanitizeHealthSymptomList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeHealthSymptom).filter(Boolean);
};

// 5. Experiences (Bitácora de Experiencias)
export const sanitizeExperienceItem = (exp) => {
  if (!exp || typeof exp !== 'object') return null;

  return {
    id: safeString(exp.id || 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    name: safeString(exp.name || exp.title || 'Experiencia'),
    type: exp.type === 'place' ? 'place' : 'product',
    category: safeString(exp.category || 'Otros'),
    status: ['completed', 'pending', 'wishlist'].includes(exp.status) ? exp.status : 'completed',
    rating: safeNumber(exp.rating, 0),
    cost: safeString(exp.cost || '$$'),
    verdict: ['yes', 'maybe', 'no'].includes(exp.verdict) ? exp.verdict : 'yes',
    placeOrBrand: safeString(exp.placeOrBrand || exp.brand || exp.place || ''),
    date: safeString(exp.date || getLocalDateString()),
    notes: safeString(exp.notes || ''),
    image: exp.image ? safeString(exp.image) : null
  };
};

export const sanitizeExperienceList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeExperienceItem).filter(Boolean);
};

// 6. Wardrobe (Armario Virtual)
export const sanitizeWardrobeItem = (w) => {
  if (!w || typeof w !== 'object') return null;

  const tags = Array.isArray(w.tags)
    ? w.tags.map(t => safeString(t)).filter(Boolean)
    : (typeof w.tags === 'string' && w.tags ? w.tags.split(',').map(t => t.trim()).filter(Boolean) : []);

  return {
    id: safeString(w.id || 'w-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    name: safeString(w.name || w.title || 'Prenda'),
    category: safeString(w.category || 'tops'),
    isClean: w.isClean !== undefined ? Boolean(w.isClean) : true,
    color: safeString(w.color || 'Neutro'),
    tags: tags
  };
};

export const sanitizeWardrobeList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeWardrobeItem).filter(Boolean);
};

// 7. Custom Outfits
export const sanitizeCustomOutfit = (o) => {
  if (!o || typeof o !== 'object') return null;

  return {
    id: safeString(o.id || 'outfit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    name: safeString(o.name || o.title || 'Outfit'),
    occasion: safeString(o.occasion || 'Casual'),
    items: Array.isArray(o.items) ? o.items.map(i => safeString(i)).filter(Boolean) : [],
    notes: safeString(o.notes || '')
  };
};

export const sanitizeCustomOutfitList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeCustomOutfit).filter(Boolean);
};

// 8. Custom Manuals
export const sanitizeManualItem = (m) => {
  if (!m || typeof m !== 'object') return null;

  return {
    id: safeString(m.id || 'man-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    title: safeString(m.title || m.name || 'Guía de Estilo'),
    category: safeString(m.category || 'Estilo de Vida'),
    content: safeString(m.content || m.desc || m.body || ''),
    tags: Array.isArray(m.tags) ? m.tags.map(t => safeString(t)).filter(Boolean) : []
  };
};

export const sanitizeManualList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeManualItem).filter(Boolean);
};

// 9. Custom Timers
export const sanitizeTimerItem = (t) => {
  if (!t || typeof t !== 'object') return null;

  const title = safeString(t.title || t.name || 'Temporizador');
  const durationSecs = Math.max(1, parseInt(t.durationSeconds || t.duration, 10) || 300);

  return {
    id: safeString(t.id || 'timer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    title: title,
    name: title,
    duration: durationSecs,
    durationSeconds: durationSecs,
    category: safeString(t.category || 'custom'),
    description: safeString(t.description || t.notes || '')
  };
};

export const sanitizeTimerList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeTimerItem).filter(Boolean);
};

// 10. Nutrition Meals (Scanner de Comida & Calorías IA)
export const sanitizeNutritionMeal = (m) => {
  if (!m || typeof m !== 'object') return null;

  const now = new Date();
  const defaultDate = getLocalDateString(now);
  const defaultTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const rawMealType = safeString(m.mealType || 'lunch').toLowerCase();
  const mealType = ['breakfast', 'lunch', 'dinner', 'snack'].includes(rawMealType) ? rawMealType : 'lunch';

  const rawGlycemic = safeString(m.glycemicImpact || 'medium').toLowerCase();
  const glycemicImpact = ['low', 'medium', 'high'].includes(rawGlycemic) ? rawGlycemic : 'medium';

  const ingredients = Array.isArray(m.ingredients)
    ? m.ingredients
        .filter(i => i && typeof i === 'object')
        .map(i => ({
          name: safeString(i.name || 'Ingrediente'),
          kcal: safeNumber(i.kcal, 0),
          portion: safeString(i.portion || '1 porción')
        }))
    : [];

  const weightLossTips = Array.isArray(m.weightLossTips)
    ? m.weightLossTips.map(t => safeString(t)).filter(Boolean)
    : (typeof m.weightLossTips === 'string' && m.weightLossTips ? [m.weightLossTips] : []);

  return {
    id: safeString(m.id || 'meal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    date: safeString(m.date || defaultDate),
    time: safeString(m.time || defaultTime),
    name: safeString(m.name || m.dishName || 'Comida Registrada'),
    mealType: mealType,
    calories: Math.max(0, Math.round(safeNumber(m.calories || m.estimatedCalories, 0))),
    protein: Math.max(0, Math.round(safeNumber(m.protein, 0))),
    carbs: Math.max(0, Math.round(safeNumber(m.carbs, 0))),
    fat: Math.max(0, Math.round(safeNumber(m.fat, 0))),
    fiber: Math.max(0, Math.round(safeNumber(m.fiber, 0))),
    image: safeString(m.image || m.photo || m.productImage || ''),
    satietyScore: Math.min(10, Math.max(1, safeNumber(m.satietyScore, 7))),
    glycemicImpact: glycemicImpact,
    weightLossVerdict: safeString(m.weightLossVerdict || 'Bueno para déficit calórico'),
    weightLossTips: weightLossTips,
    ingredients: ingredients,
    notes: safeString(m.notes || ''),
    portionMultiplier: Math.max(0.1, safeNumber(m.portionMultiplier, 1))
  };
};

export const sanitizeNutritionList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeNutritionMeal).filter(Boolean);
};

// 11. Nutrition Profile (Metas de Pérdida de Peso & Déficit)
export const sanitizeNutritionProfile = (p) => {
  const obj = p && typeof p === 'object' ? p : {};

  const activityLevel = ['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(obj.activityLevel)
    ? obj.activityLevel
    : 'light';

  return {
    dailyCalorieTarget: Math.max(800, Math.round(safeNumber(obj.dailyCalorieTarget, 1500))),
    targetProtein: Math.max(30, Math.round(safeNumber(obj.targetProtein, 110))),
    targetCarbs: Math.max(20, Math.round(safeNumber(obj.targetCarbs, 130))),
    targetFat: Math.max(15, Math.round(safeNumber(obj.targetFat, 45))),
    targetFiber: Math.max(10, Math.round(safeNumber(obj.targetFiber, 25))),
    activityLevel: activityLevel,
    weightGoal: safeString(obj.weightGoal || 'lose_weight'),
    customDeficit: safeNumber(obj.customDeficit, 450)
  };
};

// 12. Daily Nutrition Logs (Cierres de Día & Historial de Balance)
export const sanitizeDailyNutritionLog = (log) => {
  if (!log || typeof log !== 'object') return null;

  return {
    id: safeString(log.id || 'log-' + (log.date || Date.now())),
    date: safeString(log.date || getLocalDateString()),
    caloriesConsumed: Math.max(0, Math.round(safeNumber(log.caloriesConsumed, 0))),
    caloriesBurned: Math.max(0, Math.round(safeNumber(log.caloriesBurned, 0))),
    tdee: Math.max(0, Math.round(safeNumber(log.tdee, 1800))),
    netBalance: Math.round(safeNumber(log.netBalance, 0)),
    projectedGramsDelta: parseFloat(safeNumber(log.projectedGramsDelta, 0).toFixed(1)),
    waterMl: Math.max(0, Math.round(safeNumber(log.waterMl, 0))),
    mealsCount: Math.max(0, Math.round(safeNumber(log.mealsCount, 0))),
    summaryNotes: safeString(log.summaryNotes || ''),
    improvementTip: safeString(log.improvementTip || ''),
    closedAt: safeString(log.closedAt || new Date().toISOString())
  };
};

export const sanitizeDailyNutritionLogList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeDailyNutritionLog).filter(Boolean);
};

// 13. Aromatherapy Oils & Inventory (Boticario dōTERRA / DIY)
export const sanitizeAromatherapyOil = (oil) => {
  if (!oil || typeof oil !== 'object') return null;

  const id = safeString(oil.id || 'oil-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4));
  const name = safeString(oil.name || oil.trademarkName || 'Aceite Esencial');
  const trademarkName = safeString(oil.trademarkName || name);
  const botanicalName = safeString(oil.botanicalName || '');
  const brand = safeString(oil.brand || 'dōTERRA');
  const type = safeString(oil.type || 'single');
  const category = safeString(oil.category || 'mood');
  const categoryLabel = safeString(oil.categoryLabel || 'Bienestar');
  const aroma = safeString(oil.aroma || 'Fresco y botánico');

  const methods = Array.isArray(oil.methods) 
    ? oil.methods.map(m => safeString(m).toUpperCase()).filter(m => ['A', 'T', 'I'].includes(m))
    : ['A', 'T'];

  const sensitivity = ['N', 'D', 'S'].includes(oil.sensitivity) ? oil.sensitivity : 'N';
  const photosensitive = Boolean(oil.photosensitive);
  const emotionalProperty = safeString(oil.emotionalProperty || '');
  
  const keyBenefits = Array.isArray(oil.keyBenefits)
    ? oil.keyBenefits.map(b => safeString(b)).filter(Boolean)
    : (typeof oil.keyBenefits === 'string' && oil.keyBenefits ? [oil.keyBenefits] : []);

  const inInventory = Boolean(oil.inInventory ?? oil.defaultInInventory ?? false);
  const inWishlist = Boolean(oil.inWishlist ?? false);
  const level = safeString(oil.level || '100%');
  const notes = safeString(oil.notes || '');

  return {
    id,
    name,
    trademarkName,
    botanicalName,
    brand,
    type,
    category,
    categoryLabel,
    aroma,
    methods: methods.length > 0 ? methods : ['A', 'T'],
    sensitivity,
    photosensitive,
    emotionalProperty,
    keyBenefits,
    description: safeString(oil.description || ''),
    aromaticGuide: safeString(oil.aromaticGuide || ''),
    topicalGuide: safeString(oil.topicalGuide || ''),
    ingestionGuide: safeString(oil.ingestionGuide || ''),
    safetyGuide: safeString(oil.safetyGuide || ''),
    inInventory,
    inWishlist,
    level,
    notes,
    isCustom: Boolean(oil.isCustom)
  };
};

export const sanitizeAromatherapyInventory = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeAromatherapyOil).filter(Boolean);
};

// 14. Aromatherapy Blends & Diffuser Recipes (Recetario y Sinergias)
export const sanitizeAromatherapyBlend = (blend) => {
  if (!blend || typeof blend !== 'object') return null;

  const id = safeString(blend.id || 'blend-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4));
  const name = safeString(blend.name || 'Sinergia Aromática');
  const category = safeString(blend.category || 'mood');
  const categoryLabel = safeString(blend.categoryLabel || 'Bienestar');
  const type = ['diffuser', 'rollon', 'spray', 'bath'].includes(blend.type) ? blend.type : 'diffuser';
  const targetVibe = safeString(blend.targetVibe || '');

  const ingredients = (Array.isArray(blend.ingredients) ? blend.ingredients : [])
    .filter(i => i && typeof i === 'object')
    .map(i => ({
      oilId: safeString(i.oilId || i.id || ''),
      oilName: safeString(i.oilName || i.name || 'Aceite'),
      drops: Math.max(1, Math.round(safeNumber(i.drops, 2)))
    }));

  const totalDrops = ingredients.reduce((sum, item) => sum + item.drops, 0);

  return {
    id,
    name,
    category,
    categoryLabel,
    type,
    targetVibe,
    ingredients,
    totalDrops: totalDrops || safeNumber(blend.totalDrops, 8),
    carrierMl: safeNumber(blend.carrierMl, type === 'rollon' ? 10 : 0),
    bestTime: safeString(blend.bestTime || 'Cualquier momento del día'),
    notes: safeString(blend.notes || ''),
    isCustom: Boolean(blend.isCustom),
    createdAt: safeString(blend.createdAt || new Date().toISOString())
  };
};

export const sanitizeAromatherapyBlendList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeAromatherapyBlend).filter(Boolean);
};

// 15. Aromatherapy Mood Logs (Historial de Estados de Ánimo & Alquimia)
export const sanitizeAromatherapyMoodLog = (log) => {
  if (!log || typeof log !== 'object') return null;

  return {
    id: safeString(log.id || 'mood-' + Date.now()),
    date: safeString(log.date || getLocalDateString()),
    time: safeString(log.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    moodInput: safeString(log.moodInput || log.label || 'Balance General'),
    selectedArchetype: safeString(log.selectedArchetype || ''),
    recommendedBlendName: safeString(log.recommendedBlendName || ''),
    diffuserFormula: safeString(log.diffuserFormula || ''),
    rollonFormula: safeString(log.rollonFormula || ''),
    affirmation: safeString(log.affirmation || ''),
    rationale: safeString(log.rationale || '')
  };
};

export const sanitizeAromatherapyMoodLogList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeAromatherapyMoodLog).filter(Boolean);
};

export const defaultBiomechanicalTips = [
  {
    id: 'tip-1',
    title: '🚫 Cero Superficies Resbaladizas: Tapetes Antiderrapantes',
    category: 'biomechanics',
    icon: '🐾',
    content: `Para un perro de 12 años con displasia, el suelo liso (loseta, porcelanato, duela barnizada) es el principal detonante de microtraumas y luxaciones pélvicas dolorosas.

Lugares exactos donde ponerlos:
• Alrededor de su cama: El momento de levantarse es cuando más tracción necesita. Debe apoyar sus 4 patas sobre superficie rugosa sin resbalar.
• Zona de agua y comida: Al agachar el cuello para comer/beber, el centro de gravedad cambia hacia adelante y las patas traseras tienden a abrirse en compás.
• Pasillos principales de paso: Caminos donde toma velocidad al moverse de una habitación a otra.
• Puerta de entrada y timbres: La zona donde se apresura cuando llega alguien.
• Salida hacia el jardín o coche: Zonas de transición de niveles.

💡 Tip práctico: Puedes usar yoga mats recortados de alta fricción o rollos de camino de pasillo con base de goma estriada/látex gofrado lavable.`,
    isDefault: true
  },
  {
    id: 'tip-2',
    title: '🚗 Rampas y Subida Asistida al Auto',
    category: 'gear',
    icon: '🚗',
    content: `Para un Pastor Alemán de ~32 kg senior, saltar hacia la cajuela o asientos causa un impacto destructivo en los acetábulos de su cadera.

Modelos recomendados:
• PetSafe Solvit Deluxe Telescoping Ramp: La más recomendada internacionalmente. Soporta hasta 130 kg, pesa ~6 kg (aluminio), rieles laterales de seguridad y superficie de agarre tipo lija suave.
• Trixie Rampa Telescópica de Aluminio: Muy duradera, con recubrimiento de goma acanalada antideslizante que da mucha seguridad al paso.
• Alternativa si tu auto es SUV alta: Escalera plegable tipo acordeón con peldaños anchos de aluminio y tela Oxford rígida. Muchos pastores senior suben mejor peldaños horizontales anchos.
• Arnés de soporte asistido: Un arnés con asa trasera pélvica (tipo Help 'Em Up Harness) te permite guiarla suavemente y quitarle hasta el 40% del peso en la subida sin forzar tu espalda.`,
    isDefault: true
  },
  {
    id: 'tip-3',
    title: '🛏️ Cama Ortopédica Viscoelástica (Memory Foam Macizo)',
    category: 'biomechanics',
    icon: '🛏️',
    content: `A los 12 años, las camas convencionales con relleno de poliéster o pedacería se aplastan hasta el piso, haciendo que sus caderas choquen contra el suelo duro.

Modelos recomendados:
• Big Barker 7" Pillow Top (Talla XL): El estándar de oro clínico veterinario para razas grandes con displasia (probada en la Universidad de Pensilvania). Espuma de grado terapéutico de 18 cm que nunca se hunde y alivia los puntos de presión de cadera y codos.
• PetFusion Ultimate Solid Memory Foam (Talla XL): Bloque macizo de espuma viscoelástica de 10-12 cm con reborde acolchado ergonómico donde puede recargar cuello y columna.
• Bedsure Ortopédica con base de soporte firme: Opción accesible con núcleo firme y funda impermeable interna lavable.

✓ Regla de oro: Debe ser de Memory Foam macizo (bloque sólido de 10 a 18 cm), tamaño suficiente para estirarse de costado y con entrada al ras de piso sin escalón alto.`,
    isDefault: true
  },
  {
    id: 'tip-4',
    title: '✂️ Uñas, Temperatura & Manto Largo',
    category: 'care',
    icon: '✂️',
    content: `Factores clave en la displasia geriátrica:
• Corte de uñas cada 3 semanas: Si las uñas tocan el piso, obligan a Mona a arquear los dedos y cambiar el centro de carga hacia atrás, transmitiendo tensión directa a la pelvis.
• Calor en articulaciones: El frío aumenta la viscosidad del líquido sinovial. Mantén su zona de descanso abrigada y libre de corrientes de aire frío.
• Secado post-natación: Su denso doble manto no debe quedar húmedo tras nadar para evitar dolores reumáticos y hot-spots.`,
    isDefault: true
  }
];

export const sanitizePetTip = (t) => {
  if (!t || typeof t !== 'object') return null;
  return {
    id: safeString(t.id || 'tip-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    title: safeString(t.title || 'Recomendación'),
    category: safeString(t.category || 'care'),
    icon: safeString(t.icon || '🐾'),
    content: safeString(t.content || t.desc || ''),
    isDefault: Boolean(t.isDefault),
    createdAt: safeString(t.createdAt || getLocalDateString())
  };
};

// 16. Pet Care & Senior Canine Routine (Pastor Alemán Senior - Mona)
export const sanitizePetData = (raw) => {
  const data = (raw && typeof raw === 'object') ? raw : {};

  let rawName = safeString(data.profile?.name || 'Mona');
  if (rawName === 'Kira') rawName = 'Mona';

  const profile = {
    name: rawName,
    breed: safeString(data.profile?.breed || 'Pastor Alemán (Pelo Largo)'),
    ageYears: safeNumber(data.profile?.ageYears, 12),
    gender: safeString(data.profile?.gender || 'Hembra'),
    weightKg: safeNumber(data.profile?.weightKg, 32.5),
    microchip: safeString(data.profile?.microchip || ''),
    vetContact: safeString(data.profile?.vetContact || 'Dra. Veterinaria de Cabecera'),
    vetPhone: safeString(data.profile?.vetPhone || '+52 55 0000 0000'),
    emergencyClinic: safeString(data.profile?.emergencyClinic || 'Hospital Veterinario 24/7'),
    emergencyPhone: safeString(data.profile?.emergencyPhone || '+52 55 9999 9999'),
    daycareName: safeString(data.profile?.daycareName || 'Guardería Canina Campestre'),
    daycarePhone: safeString(data.profile?.daycarePhone || '+52 55 1234 5678'),
    notes: safeString(data.profile?.notes || 'Perrita senior de 12 años con displasia de cadera, hipotiroidismo y nubes en ojos. Cuidado con pisos resbaladizos y secado minucioso de su doble manto tras nadar.'),
    conditions: Array.isArray(data.profile?.conditions)
      ? data.profile.conditions.map(safeString).filter(Boolean)
      : [
          'Hipotiroidismo canino (medicación diaria en ayunas)',
          'Displasia bilateral de cadera (artrosis senior)',
          'Nubes en los ojos (esclerosis nuclear / cataratas seniles)'
        ]
  };

  const daycare = {
    schedule: safeString(data.daycare?.schedule || '09:00 AM - 05:00 PM'),
    transitMinutesLow: safeNumber(data.daycare?.transitMinutesLow, 30),
    transitMinutesHigh: safeNumber(data.daycare?.transitMinutesHigh, 60),
    targetDaysPerWeek: safeNumber(data.daycare?.targetDaysPerWeek, 5),
    plannedDays: Array.isArray(data.daycare?.plannedDays)
      ? data.daycare.plannedDays.map(safeString)
      : ['Lunes', 'Miércoles', 'Viernes'],
    attendanceLogs: Array.isArray(data.daycare?.attendanceLogs)
      ? data.daycare.attendanceLogs.map(l => ({
          id: safeString(l.id || 'dc-' + Date.now()),
          date: safeString(l.date || getLocalDateString()),
          status: ['attended', 'stayed_home', 'skipped_traffic'].includes(l.status) ? l.status : 'attended',
          departureTime: safeString(l.departureTime || '08:00 AM'),
          transitTime: safeNumber(l.transitTime, 45),
          notes: safeString(l.notes || '')
        }))
      : []
  };

  const hydrotherapy = {
    frequencyWeeks: safeNumber(data.hydrotherapy?.frequencyWeeks, 2),
    preferredDay: safeString(data.hydrotherapy?.preferredDay || 'Sábado'),
    targetSessionMinutes: safeNumber(data.hydrotherapy?.targetSessionMinutes, 20),
    sessions: Array.isArray(data.hydrotherapy?.sessions)
      ? data.hydrotherapy.sessions.map(s => ({
          id: safeString(s.id || 'hydro-' + Date.now()),
          date: safeString(s.date || getLocalDateString()),
          durationMinutes: safeNumber(s.durationMinutes, 20),
          postSwimBath: Boolean(s.postSwimBath !== false),
          deepDryingDone: Boolean(s.deepDryingDone !== false),
          earCleaningDone: Boolean(s.earCleaningDone !== false),
          mobilityAfter: ['excelente', 'buena', 'cansada_positiva', 'con_molestia'].includes(s.mobilityAfter) ? s.mobilityAfter : 'excelente',
          notes: safeString(s.notes || '')
        }))
      : []
  };

  const defaultRoutine = [
    {
      id: 'pr-1',
      time: '07:30 AM',
      category: 'medication',
      title: 'Levotiroxina en ayunas',
      desc: '1 comprimido en ayunas para el hipotiroidismo (30 min antes del desayuno).',
      priority: 'high',
      completedToday: false
    },
    {
      id: 'pr-2',
      time: '08:00 AM',
      category: 'walk',
      title: 'Paseo sanitario matutino suave',
      desc: '10-15 min paso tranquilo para reactivar articulaciones sin impacto ni sobreesfuerzo.',
      priority: 'high',
      completedToday: false
    },
    {
      id: 'pr-3',
      time: '08:20 AM',
      category: 'food',
      title: 'Desayuno Senior + Condroprotectores',
      desc: 'Croquetas senior / húmedo tibio + Colágeno hidrolizado y Glucosamina para cadera.',
      priority: 'high',
      completedToday: false
    },
    {
      id: 'pr-4',
      time: '08:35 AM',
      category: 'medication',
      title: 'Gotas oftálmicas matutinas',
      desc: '1 gota en cada ojo para hidratación y soporte ante nubes/cataratas seniles.',
      priority: 'medium',
      completedToday: false
    },
    {
      id: 'pr-5',
      time: '08:45 AM',
      category: 'daycare',
      title: 'Salida hacia Guardería Canina',
      desc: 'Considerar 30 a 60 min de tráfico para entrar a las 9:00 AM. Subir al auto con rampa/asistencia.',
      priority: 'high',
      completedToday: false
    },
    {
      id: 'pr-6',
      time: '09:00 AM - 05:00 PM',
      category: 'daycare',
      title: 'Estadía en Guardería Canina',
      desc: 'Socialización moderada, descansos en sombra, evitar saltos con otros perros.',
      priority: 'medium',
      completedToday: false
    },
    {
      id: 'pr-7',
      time: '05:30 PM',
      category: 'home',
      title: 'Llegada a casa & Revisión de patas',
      desc: 'Revisar almohadillas, cepillado superficial para remover basuritas de su manto largo.',
      priority: 'medium',
      completedToday: false
    },
    {
      id: 'pr-8',
      time: '06:15 PM',
      category: 'walk',
      title: 'Paseo sanitario vespertino',
      desc: 'Paseo corto de 10 min sobre césped o tierra blanda para orinar y estirar patitas.',
      priority: 'medium',
      completedToday: false
    },
    {
      id: 'pr-9',
      time: '07:30 PM',
      category: 'food',
      title: 'Cena ligera + Vitaminas / Omega-3',
      desc: 'Porción controlada para cuidar su peso (esencial para displasia) + Omega-3 antiinflamatorio.',
      priority: 'high',
      completedToday: false
    },
    {
      id: 'pr-10',
      time: '08:30 PM',
      category: 'medication',
      title: 'Gotas oftálmicas nocturnas',
      desc: 'Segunda dosis de colirio oftálmico para lubricación corneal nocturna.',
      priority: 'medium',
      completedToday: false
    },
    {
      id: 'pr-11',
      time: '09:45 PM',
      category: 'walk',
      title: 'Último pipí nocturno & Cama ortopédica',
      desc: 'Salida rápida al jardín/patio. Asegurar cama viscoelástica para soporte de cadera.',
      priority: 'low',
      completedToday: false
    }
  ];

  const routine = Array.isArray(data.routine) && data.routine.length > 0
    ? data.routine.map(r => ({
        id: safeString(r.id || 'pr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
        time: safeString(r.time || '08:00 AM'),
        category: ['medication', 'walk', 'food', 'daycare', 'hydro', 'care', 'home'].includes(r.category) ? r.category : 'care',
        title: safeString(r.title || 'Actividad'),
        desc: safeString(r.desc || ''),
        priority: ['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium',
        completedToday: Boolean(r.completedToday)
      }))
    : defaultRoutine;

  const defaultMedications = [
    {
      id: 'med-1',
      name: 'Levotiroxina Sódica (Eutirox / Tiroidina)',
      condition: 'Hipotiroidismo Canino',
      dosage: '1 comprimido en ayunas',
      frequency: 'Diario (Mañanas en ayunas, 30 min antes de comer)',
      timing: 'morning_fasting',
      lastAdministeredDate: '',
      notes: 'No dar con alimentos de alto calcio en el mismo minuto para no inhibir absorción.',
      active: true
    },
    {
      id: 'med-2',
      name: 'Gotas Oftálmicas Lubricantes / Antiox',
      condition: 'Nubes en los ojos (Cataratas seniles)',
      dosage: '1 gota en cada ojo',
      frequency: 'Cada 12 horas (Mañana y Noche)',
      timing: 'twice_daily',
      lastAdministeredMorning: '',
      lastAdministeredNight: '',
      notes: 'Limpiar párpados suavemente con gasa tibia si hay lagañitas.',
      active: true
    },
    {
      id: 'med-3',
      name: 'Colágeno + Glucosamina & Condroitina',
      condition: 'Displasia de cadera',
      dosage: '1 dosis diaria con alimento',
      frequency: 'Diario (Desayuno)',
      timing: 'with_breakfast',
      lastAdministeredDate: '',
      notes: 'Protector articular de cartílago para aliviar rigidez matutina.',
      active: true
    },
    {
      id: 'med-4',
      name: 'Omega-3 (EPA/DHA) & Complejo Vitamínico Senior',
      condition: 'Soporte geriátrico y articulaciones',
      dosage: '1 cápsula / bomba dosificadora',
      frequency: 'Diario (Cena)',
      timing: 'with_dinner',
      lastAdministeredDate: '',
      notes: 'Potente antiinflamatorio natural para cadera y salud del manto.',
      active: true
    }
  ];

  const medications = Array.isArray(data.medications) && data.medications.length > 0
    ? data.medications.map(m => ({
        id: safeString(m.id || 'med-' + Date.now()),
        name: safeString(m.name || 'Medicamento'),
        condition: safeString(m.condition || ''),
        dosage: safeString(m.dosage || ''),
        frequency: safeString(m.frequency || 'Diario'),
        timing: safeString(m.timing || 'anytime'),
        lastAdministeredDate: safeString(m.lastAdministeredDate || ''),
        lastAdministeredMorning: safeString(m.lastAdministeredMorning || ''),
        lastAdministeredNight: safeString(m.lastAdministeredNight || ''),
        notes: safeString(m.notes || ''),
        active: Boolean(m.active !== false)
      }))
    : defaultMedications;

  const defaultPreventive = [
    {
      id: 'prev-1',
      type: 'bath_grooming',
      title: 'Baño bimensual & Secado profundo post-nado',
      frequencyDesc: 'Cada 2 semanas (coordinado con natación)',
      intervalDays: 14,
      lastDate: '2026-10-18',
      nextDueDate: '2026-11-01',
      notes: 'Doble manto de pastor alemán: secador a fondo en raíz para evitar hot-spots húmedos y secado ótico con toalla.',
      status: 'pending'
    },
    {
      id: 'prev-2',
      type: 'deworming_ext',
      title: 'Desparasitación Externa (Pulgas, garrapatas & agua)',
      frequencyDesc: 'Cada 3 meses (por guardería & natación frecuente)',
      intervalDays: 90,
      lastDate: '2026-08-15',
      nextDueDate: '2026-11-15',
      notes: 'Pipeta o tableta masticable (ej. Simparica / Nexgard / Bravecto).',
      status: 'pending'
    },
    {
      id: 'prev-3',
      type: 'deworming_int',
      title: 'Desparasitación Interna preventiva',
      frequencyDesc: 'Cada 4 meses (socializa con otros perros en guardería)',
      intervalDays: 120,
      lastDate: '2026-07-20',
      nextDueDate: '2026-11-20',
      notes: 'Control parasitario de amplio espectro.',
      status: 'pending'
    },
    {
      id: 'prev-4',
      type: 'nails_paws',
      title: 'Corte y limado de uñas preventivo',
      frequencyDesc: 'Cada 3 semanas',
      intervalDays: 21,
      lastDate: '2026-10-12',
      nextDueDate: '2026-11-02',
      notes: 'Vital para displasia: uñas largas cambian el apoyo articular y causan dolor de cadera al caminar.',
      status: 'pending'
    },
    {
      id: 'prev-5',
      type: 'vet_checkup',
      title: 'Control geriátrico tiroideo & revisión de cadera',
      frequencyDesc: 'Cada 6 meses',
      intervalDays: 180,
      lastDate: '2026-06-10',
      nextDueDate: '2026-12-10',
      notes: 'Perfil tiroideo T4 total/libre y palpación de movilidad articular.',
      status: 'pending'
    },
    {
      id: 'prev-6',
      type: 'vaccine',
      title: 'Refuerzo Bordetella (Tos de las perreras)',
      frequencyDesc: 'Anual (requisito indispensable de guardería)',
      intervalDays: 365,
      lastDate: '2026-02-14',
      nextDueDate: '2027-02-14',
      notes: 'Protección para guarderías y convivencia canina.',
      status: 'completed'
    },
    {
      id: 'prev-7',
      type: 'vaccine',
      title: 'Vacuna Múltiple Canina (DHPPI + L) & Rabia',
      frequencyDesc: 'Anual',
      intervalDays: 365,
      lastDate: '2026-02-14',
      nextDueDate: '2027-02-14',
      notes: 'Esquema de vacunación senior completo al día.',
      status: 'completed'
    }
  ];

  const preventiveCare = Array.isArray(data.preventiveCare) && data.preventiveCare.length > 0
    ? data.preventiveCare.map(p => ({
        id: safeString(p.id || 'prev-' + Date.now()),
        type: safeString(p.type || 'care'),
        title: safeString(p.title || 'Cuidado preventivo'),
        frequencyDesc: safeString(p.frequencyDesc || ''),
        intervalDays: safeNumber(p.intervalDays, 30),
        lastDate: safeString(p.lastDate || ''),
        nextDueDate: safeString(p.nextDueDate || ''),
        notes: safeString(p.notes || ''),
        status: ['completed', 'pending', 'overdue'].includes(p.status) ? p.status : 'pending'
      }))
    : defaultPreventive;

  const walkLogs = Array.isArray(data.walkLogs)
    ? data.walkLogs.map(w => ({
        id: safeString(w.id || 'wlk-' + Date.now()),
        date: safeString(w.date || getLocalDateString()),
        time: safeString(w.time || '08:00 AM'),
        durationMinutes: safeNumber(w.durationMinutes, 15),
        surface: safeString(w.surface || 'Pasto / Tierra'),
        hipGaitRating: ['fluido', 'ligera_rigidez', 'rigido_con_cojera'].includes(w.hipGaitRating) ? w.hipGaitRating : 'fluido',
        notes: safeString(w.notes || '')
      }))
    : [];

  const customTips = Array.isArray(data.customTips) && data.customTips.length > 0
    ? data.customTips.map(sanitizePetTip).filter(Boolean)
    : defaultBiomechanicalTips;

  return {
    profile,
    daycare,
    hydrotherapy,
    routine,
    medications,
    preventiveCare,
    walkLogs,
    customTips,
    lastDailyResetDate: safeString(data.lastDailyResetDate || getLocalDateString())
  };
};

// 17. Bag & Exit Essentials (Checklist de Cosas para Salir / EDC)
export const defaultBagEssentials = [
  { id: 'bag-1', name: 'Pañuelo (lentes o general)', category: 'hygiene', categoryLabel: 'Higiene', packed: false },
  { id: 'bag-2', name: 'Papel', category: 'hygiene', categoryLabel: 'Higiene', packed: false },
  { id: 'bag-3', name: 'Perfume', category: 'hygiene', categoryLabel: 'Cuidado', packed: false },
  { id: 'bag-4', name: 'Chicles', category: 'wellness', categoryLabel: 'Extras', packed: false },
  { id: 'bag-5', name: 'Desodorante', category: 'hygiene', categoryLabel: 'Cuidado', packed: false },
  { id: 'bag-6', name: 'Crema', category: 'hygiene', categoryLabel: 'Cuidado', packed: false },
  { id: 'bag-7', name: 'Bloqueador', category: 'hygiene', categoryLabel: 'Cuidado', packed: false },
  { id: 'bag-8', name: 'Reloj', category: 'tech', categoryLabel: 'Accesorio', packed: false },
  { id: 'bag-9', name: 'Sombrilla', category: 'tech', categoryLabel: 'Práctico', packed: false },
  { id: 'bag-10', name: 'Audífonos', category: 'tech', categoryLabel: 'Tecnología', packed: false },
  { id: 'bag-11', name: 'Pila (Batería portátil)', category: 'tech', categoryLabel: 'Tecnología', packed: false },
  { id: 'bag-12', name: 'Cepillo (cabello)', category: 'hygiene', categoryLabel: 'Cuidado', packed: false },
  { id: 'bag-13', name: 'Cepillo de dientes', category: 'hygiene', categoryLabel: 'Dental', packed: false },
  { id: 'bag-14', name: 'Pasta (dental)', category: 'hygiene', categoryLabel: 'Dental', packed: false },
  { id: 'bag-15', name: 'Llaves', category: 'essentials', categoryLabel: 'Básicos', packed: false },
  { id: 'bag-16', name: 'Alcohol (gel / spray)', category: 'hygiene', categoryLabel: 'Higiene', packed: false },
  { id: 'bag-17', name: 'Tarjetas', category: 'essentials', categoryLabel: 'Finanzas', packed: false },
  { id: 'bag-18', name: 'Dinero (efectivo)', category: 'essentials', categoryLabel: 'Finanzas', packed: false }
];

export const sanitizeBagEssential = (item) => {
  if (!item || typeof item !== 'object') return null;
  return {
    id: safeString(item.id || 'bag-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    name: safeString(item.name || 'Artículo'),
    category: ['hygiene', 'tech', 'essentials', 'wellness'].includes(item.category) ? item.category : 'essentials',
    categoryLabel: safeString(item.categoryLabel || 'Esencial'),
    packed: Boolean(item.packed),
    notes: safeString(item.notes || '')
  };
};

export const sanitizeBagEssentialsList = (list) => {
  if (!Array.isArray(list) || list.length === 0) return defaultBagEssentials;
  return list.map(sanitizeBagEssential).filter(Boolean);
};



