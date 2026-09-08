/**
 * AURA Nexus - Data Sanitizers & Validators
 * Ensures robust data integrity across modules, local storage, cloud sync, and AI inputs.
 */

export const safeNumber = (val, fallback = 0) => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};

export const sanitizeHouseholdItem = (item) => {
  if (!item || typeof item !== 'object') return null;

  // Name
  let name = 'Producto';
  if (typeof item.name === 'string' && item.name.trim()) {
    name = item.name.trim();
  } else if (item.name && typeof item.name === 'object') {
    name = item.name.name || item.name.title || item.name.product || 'Producto';
  }

  // Category
  let category = 'Skincare';
  if (typeof item.category === 'string' && item.category.trim()) {
    category = item.category.trim();
  } else if (item.category && typeof item.category === 'object') {
    category = item.category.name || item.category.category || 'Skincare';
  }

  // Notes
  let notes = '';
  if (typeof item.notes === 'string') {
    notes = item.notes;
  } else if (Array.isArray(item.notes)) {
    notes = item.notes.map(n => (typeof n === 'string' ? n : JSON.stringify(n))).join('. ');
  } else if (item.notes && typeof item.notes === 'object') {
    notes = item.notes.notes || item.notes.desc || item.notes.description || JSON.stringify(item.notes);
  }

  // Stores
  const stores = (Array.isArray(item.stores) ? item.stores : [])
    .filter(s => s && typeof s === 'object')
    .map(s => {
      const price = safeNumber(s.price, 0);
      const quantity = safeNumber(s.quantity, 1);
      const unitPrice = typeof s.unitPrice === 'number' && !isNaN(s.unitPrice)
        ? s.unitPrice
        : (quantity > 0 ? price / quantity : 0);
      return {
        storeName: String(s.storeName || s.name || s.store || 'Tienda'),
        price: price,
        quantity: quantity,
        unitPrice: unitPrice
      };
    })
    .filter(s => s.price > 0 && s.quantity > 0);

  // Preferred Store
  let preferredStore = '';
  if (typeof item.preferredStore === 'string') {
    preferredStore = item.preferredStore;
  } else if (stores.length > 0) {
    preferredStore = stores[0].storeName;
  }

  // Repurchase Verdict
  let repurchaseVerdict = 'yes';
  if (['yes', 'maybe', 'no'].includes(item.repurchaseVerdict)) {
    repurchaseVerdict = item.repurchaseVerdict;
  }

  return {
    id: String(item.id || 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    name: String(name),
    category: String(category),
    stores: stores,
    preferredStore: String(preferredStore),
    repurchaseVerdict: repurchaseVerdict,
    notes: String(notes)
  };
};

export const sanitizeHouseholdList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeHouseholdItem).filter(Boolean);
};

export const sanitizeSelfCareItem = (sc) => {
  if (!sc || typeof sc !== 'object') return null;

  let title = 'Actividad de Autocuidado';
  if (typeof sc.title === 'string' && sc.title.trim()) {
    title = sc.title.trim();
  } else if (sc.title && typeof sc.title === 'object') {
    title = sc.title.name || sc.title.title || 'Actividad';
  }

  const daysInterval = Math.max(1, parseInt(sc.daysInterval, 10) || 2);
  const frequency = typeof sc.frequency === 'string' ? sc.frequency : 'custom';
  const customUnit = typeof sc.customUnit === 'string' ? sc.customUnit : 'days';
  const customValue = Math.max(1, parseInt(sc.customValue || sc.daysInterval, 10) || 2);

  let category = 'beauty';
  if (sc.category === 'skincare' || sc.category === 'beauty') category = 'beauty';
  else if (typeof sc.category === 'string') category = sc.category;

  let notes = '';
  if (typeof sc.notes === 'string') notes = sc.notes;
  else if (Array.isArray(sc.notes)) notes = sc.notes.join('. ');
  else if (sc.notes && typeof sc.notes === 'object') notes = JSON.stringify(sc.notes);

  let protocol = '';
  if (typeof sc.protocol === 'string') protocol = sc.protocol;
  else if (sc.protocol && typeof sc.protocol === 'object') protocol = JSON.stringify(sc.protocol);

  return {
    id: String(sc.id || 'sc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    title: String(title),
    frequency: frequency,
    customValue: customValue,
    customUnit: customUnit,
    daysInterval: daysInterval,
    lastCompletedDate: sc.lastCompletedDate || new Date().toISOString().split('T')[0],
    category: category,
    notes: String(notes),
    protocol: String(protocol || 'Cadencia configurada por AURA Copilot.')
  };
};

export const sanitizeSelfCareList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeSelfCareItem).filter(Boolean);
};
