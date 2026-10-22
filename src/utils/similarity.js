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
 * and keyword heuristics, returning the highest-scoring candidate.
 * 
 * @param {string} newItemName - Name of the new item being entered/checked
 * @param {Array} existingList - List of existing items
 * @param {string} nameKey - The property holding the item name (e.g. 'name', 'title')
 * @returns {Object|null} The best matching existing item or null
 */
export const findSimilarity = (newItemName, existingList = [], nameKey = 'name') => {
  const matches = findSimilarItems(newItemName, existingList, nameKey, 1);
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Searches for similar items in an existing list and returns up to maxResults matches,
 * sorted by similarity confidence.
 * 
 * @param {string} newItemName - Name of the new item
 * @param {Array} existingList - List of existing items
 * @param {string} nameKey - Property holding item name
 * @param {number} maxResults - Max items to return
 * @returns {Array} List of matching items
 */
export const findSimilarItems = (newItemName, existingList = [], nameKey = 'name', maxResults = 3) => {
  if (!newItemName || !existingList || !Array.isArray(existingList) || existingList.length === 0) {
    return [];
  }

  const cleanNew = normalizeString(newItemName);
  if (!cleanNew || cleanNew.length < 3) return [];

  const newWords = cleanNew.split(/\s+/).filter(w => w.length > 2);
  const stopWords = new Set([
    'con', 'para', 'del', 'los', 'las', 'una', 'uno', 'por', 'que', 'min',
    'sesion', 'rutina', 'tiempo', 'de', 'el', 'la', 'en', 'un', 'y', 'al'
  ]);
  const significantNewWords = newWords.filter(w => !stopWords.has(w));

  const scoredCandidates = [];

  for (const item of existingList) {
    if (!item) continue;
    const existingRawName = item[nameKey] || item.name || item.title || '';
    const existingName = normalizeString(existingRawName);
    if (!existingName || existingName.length < 3) continue;

    let score = 0;

    // 1. Exact equality (highest priority)
    if (cleanNew === existingName) {
      score = 1000;
    }
    // 2. Direct substring containment
    else if (cleanNew.length >= 4 && existingName.includes(cleanNew)) {
      score = 200 + (cleanNew.length / existingName.length) * 50;
    } else if (existingName.length >= 4 && cleanNew.includes(existingName)) {
      score = 200 + (existingName.length / cleanNew.length) * 50;
    }
    // 3. Significant word overlap (e.g. 'teatrical', 'concha', 'kirkland')
    else if (significantNewWords.length > 0) {
      const existingWords = new Set(existingName.split(/\s+/).filter(w => w.length > 2));
      const matchedWords = significantNewWords.filter(w => existingWords.has(w));
      const matchCount = matchedWords.length;

      if (matchCount >= 2) {
        score = 100 + matchCount * 30;
      } else if (matchCount === 1) {
        const matchedWord = matchedWords[0];
        if (matchedWord.length >= 4) {
          score = 50 + matchedWord.length * 5;
        }
      }
    }

    if (score >= 40) {
      scoredCandidates.push({ item, score });
    }
  }

  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(c => c.item);
};

