/**
 * AURA Nexus - Data Sanitizers & Validators
 * Ensures robust data integrity across modules, local storage, cloud sync, and AI inputs.
 */

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
  if (['yes', 'maybe', 'no', 'need_to_buy'].includes(item.repurchaseVerdict)) {
    repurchaseVerdict = item.repurchaseVerdict;
  }

  return {
    id: safeString(item.id || 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    name: name,
    category: category,
    stores: stores,
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
    lastCompletedDate: safeString(sc.lastCompletedDate || new Date().toISOString().split('T')[0]),
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
export const sanitizeHealthSymptom = (s) => {
  if (!s || typeof s !== 'object') return null;

  return {
    id: safeString(s.id || 'sym-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    title: safeString(s.title || s.name || s.symptom || 'Registro de Síntoma'),
    bodyPart: safeString(s.bodyPart || 'general'),
    severity: Math.min(10, Math.max(1, parseInt(s.severity, 10) || 5)),
    date: safeString(s.date || new Date().toISOString().split('T')[0]),
    status: ['active', 'relieved', 'monitoring'].includes(s.status) ? s.status : 'active',
    triggers: Array.isArray(s.triggers) ? s.triggers.map(t => safeString(t)).filter(Boolean) : (typeof s.triggers === 'string' ? [s.triggers] : []),
    protocolUsed: safeString(s.protocolUsed || ''),
    notes: safeString(s.notes || '')
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
    date: safeString(exp.date || new Date().toISOString().split('T')[0]),
    notes: safeString(exp.notes || '')
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
  const defaultDate = now.toISOString().split('T')[0];
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
    date: safeString(log.date || new Date().toISOString().split('T')[0]),
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

