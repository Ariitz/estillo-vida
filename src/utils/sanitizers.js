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
  if (['yes', 'maybe', 'no'].includes(item.repurchaseVerdict)) {
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
