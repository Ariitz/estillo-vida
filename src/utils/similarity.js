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

/**
 * Searches for similar items in the price comparator database, checking BOTH
 * the main product name and all registered subproducts/varieties.
 * 
 * Example:
 * If an item is "Jabón" with subproduct "Sedal", searching "Shampoo Sedal" will detect:
 * - Match on subproduct "Sedal" inside "Jabón"
 * - Match on main product "Shampoo" (if shampoo exists)
 * 
 * @param {string} newItemName - The name being typed/submitted
 * @param {Array} householdList - List of household/price comparator items
 * @param {number} maxResults - Max candidates to return (default 3)
 * @returns {Array<{ item: Object, score: number, matchType: 'name'|'subproduct'|'both', matchedSubproduct: string }>}
 */
export const findSimilarHouseholdItems = (newItemName, householdList = [], maxResults = 3) => {
  if (!newItemName || !householdList || !Array.isArray(householdList) || householdList.length === 0) {
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

  for (const item of householdList) {
    if (!item) continue;
    const existingRawName = item.name || item.title || '';
    const existingName = normalizeString(existingRawName);

    // Extract all registered subproducts and varieties for this item
    const subTerms = Array.from(new Set([
      ...(Array.isArray(item.subproducts) ? item.subproducts : []),
      ...(Array.isArray(item.stores) ? item.stores.map(s => s && s.variety).filter(Boolean) : [])
    ]));

    let nameScore = 0;
    let bestSubScore = 0;
    let matchedSubproduct = '';

    // 1. Check against item.name
    if (existingName && existingName.length >= 3) {
      if (cleanNew === existingName) {
        nameScore = 1000;
      } else if (cleanNew.length >= 4 && existingName.includes(cleanNew)) {
        nameScore = 200 + (cleanNew.length / existingName.length) * 50;
      } else if (existingName.length >= 4 && cleanNew.includes(existingName)) {
        nameScore = 200 + (existingName.length / cleanNew.length) * 50;
      } else if (significantNewWords.length > 0) {
        const existingWords = new Set(existingName.split(/\s+/).filter(w => w.length > 2));
        const matchedWords = significantNewWords.filter(w => existingWords.has(w));
        if (matchedWords.length >= 2) {
          nameScore = 100 + matchedWords.length * 30;
        } else if (matchedWords.length === 1 && matchedWords[0].length >= 4) {
          nameScore = 50 + matchedWords[0].length * 5;
        }
      }
    }

    // 2. Check against each subproduct / variety
    for (const sub of subTerms) {
      const cleanSub = normalizeString(sub);
      if (!cleanSub || cleanSub.length < 3) continue;

      let currentSubScore = 0;
      if (cleanNew === cleanSub) {
        currentSubScore = 500;
      } else if (cleanSub.length >= 4 && cleanNew.includes(cleanSub)) {
        currentSubScore = 240 + (cleanSub.length / cleanNew.length) * 50;
      } else if (cleanNew.length >= 4 && cleanSub.includes(cleanNew)) {
        currentSubScore = 180 + (cleanNew.length / cleanSub.length) * 50;
      } else if (significantNewWords.length > 0) {
        const subWords = new Set(cleanSub.split(/\s+/).filter(w => w.length > 2));
        const matchedSubWords = significantNewWords.filter(w => subWords.has(w));
        if (matchedSubWords.length >= 2) {
          currentSubScore = 120 + matchedSubWords.length * 25;
        } else if (matchedSubWords.length === 1 && matchedSubWords[0].length >= 4) {
          currentSubScore = 60 + matchedSubWords[0].length * 5;
        }
      }

      if (currentSubScore > bestSubScore) {
        bestSubScore = currentSubScore;
        matchedSubproduct = sub;
      }
    }

    // Determine final score and match classification
    let totalScore = 0;
    let matchType = 'name';

    if (nameScore > 0 && bestSubScore > 0) {
      totalScore = nameScore + bestSubScore * 0.8;
      matchType = 'both';
    } else if (nameScore > 0) {
      totalScore = nameScore;
      matchType = 'name';
    } else if (bestSubScore > 0) {
      totalScore = bestSubScore;
      matchType = 'subproduct';
    }

    if (totalScore >= 45) {
      scoredCandidates.push({
        item,
        score: totalScore,
        matchType,
        matchedSubproduct: matchedSubproduct || (subTerms[0] || ''),
        matchedName: existingRawName
      });
    }
  }

  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
};

export const findHouseholdSimilarity = (newItemName, householdList = []) => {
  const matches = findSimilarHouseholdItems(newItemName, householdList, 1);
  return matches.length > 0 ? matches[0] : null;
};


