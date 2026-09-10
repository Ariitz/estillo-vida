/**
 * Utility functions for similarity and duplicate detection across AURA Nexus modules.
 */

export const normalizeString = (str) =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

/**
 * Searches for a similar item in an existing list based on token overlap, substring matching,
 * and keyword heuristics.
 * 
 * @param {string} newItemName - Name of the new item being entered/checked
 * @param {Array} existingList - List of existing items
 * @param {string} nameKey - The property holding the item name (e.g. 'name', 'title')
 * @returns {Object|null} The matching existing item or null
 */
export const findSimilarity = (newItemName, existingList = [], nameKey = 'name') => {
  if (!newItemName || !existingList || !Array.isArray(existingList) || existingList.length === 0) {
    return null;
  }

  const cleanNew = normalizeString(newItemName);
  if (!cleanNew || cleanNew.length < 3) return null;

  const newWords = cleanNew.split(/\s+/).filter(w => w.length > 2);
  const stopWords = new Set([
    'con', 'para', 'del', 'los', 'las', 'una', 'uno', 'por', 'que', 'min',
    'sesion', 'rutina', 'crema', 'serum', 'cremas', 'tiempo', 'facial',
    'coreana', 'extracto', 'de', 'el', 'la', 'en', 'un', 'y', 'al'
  ]);
  const significantNewWords = newWords.filter(w => !stopWords.has(w));

  for (const item of existingList) {
    if (!item) continue;
    const existingRawName = item[nameKey] || item.name || item.title || '';
    const existingName = normalizeString(existingRawName);
    if (!existingName || existingName.length < 3) continue;

    // 1. Direct exact equality
    if (cleanNew === existingName) {
      return item;
    }

    // 2. Direct substring containment (if length is substantial)
    if (cleanNew.length >= 4 && existingName.includes(cleanNew)) {
      return item;
    }
    if (existingName.length >= 4 && cleanNew.includes(existingName)) {
      return item;
    }

    // 3. Significant word overlap (e.g. 'arroz', 'retinol', 'nacar', 'led')
    if (significantNewWords.length > 0) {
      const existingWords = new Set(existingName.split(/\s+/).filter(w => w.length > 2));
      const matchCount = significantNewWords.filter(w => existingWords.has(w)).length;
      
      if (matchCount >= 2) {
        return item;
      }
      if (significantNewWords.length === 1 && matchCount === 1 && significantNewWords[0].length >= 4) {
        return item;
      }
    }
  }

  return null;
};
