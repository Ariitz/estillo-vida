/**
 * Utility functions for similarity and duplicate detection across AURA Nexus modules.
 */

export const normalizeString = (str) =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Extracts a basic Spanish stem so related words (e.g. "mascara"/"mascarilla",
 * "toalla"/"toallitas", "hidratante"/"hidratacion", "limpiador"/"limpieza") match.
 */
export const getWordStem = (word = '') => {
  const w = normalizeString(word);
  if (w.length < 4) return w;
  return w
    .replace(/(illas|illos|illa|illo|itas|itos|ita|ito|ciones|cion|adoras|adores|adora|ador|antes|entes|ante|ente|miento|ibles|ible|ales|ares|es|s)$/, '')
    .replace(/(a|o|e)$/, '');
};

/**
 * Checks if two normalized strings are within 1 edit distance (for typo tolerance on words >= 5 chars).
 */
const isWithinOneEdit = (a = '', b = '') => {
  if (a === b) return true;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > 1 || Math.min(lenA, lenB) < 4) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < lenA && j < lenB) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (lenA > lenB) i++;
      else if (lenB > lenA) j++;
      else {
        i++;
        j++;
      }
    }
  }
  if (i < lenA || j < lenB) edits++;
  return edits <= 1;
};

const RELATED_CONCEPT_SYNONYMS = {
  papel: ['higienico', 'servitoalla', 'servilleta', 'toalla', 'panuelo', 'kleenex', 'rollo'],
  toalla: ['papel', 'servitoalla', 'microfibra', 'femenina', 'humeda', 'kleenex'],
  jabon: ['limpiador', 'gel', 'barra', 'espuma', 'shampoo', 'detergente', 'corporal', 'facial'],
  limpiador: ['jabon', 'agua micelar', 'gel', 'desmaquillante', 'limpieza', 'cloro', 'multiusos'],
  crema: ['locion', 'hidratante', 'humectante', 'balsamo', 'unguento', 'pomada', 'gel'],
  serum: ['suero', 'ampolleta', 'concentrado', 'retinol', 'vitamina', 'acido'],
  suero: ['serum', 'retinol', 'hidratante', 'electrolit'],
  bloqueador: ['protector', 'solar', 'fps', 'spf', 'pantalla'],
  solar: ['bloqueador', 'protector', 'fps', 'spf'],
  mascara: ['mascarilla', 'rimel', 'pestanas', 'facial', 'led'],
  mascarilla: ['mascara', 'sheet', 'facial', 'capilar', 'tratamiento'],
  desodorante: ['antitranspirante', 'perspirex', 'drysol', 'axila'],
  antitranspirante: ['desodorante', 'perspirex', 'drysol'],
  pasta: ['dental', 'dientes', 'colgate', 'sensodyne', 'espagueti', 'fideo', 'sopa'],
  dientes: ['dental', 'pasta', 'cepillo', 'enjuague', 'hilo'],
  shampoo: ['champu', 'acondicionador', 'cabello', 'capilar', 'head', 'pantene'],
  champu: ['shampoo', 'acondicionador', 'cabello', 'capilar'],
  jamon: ['pavo', 'pechuga', 'pierna', 'carnes frias', 'salchicha', 'fud', 'san rafael', 'kirkland'],
  detergente: ['jabon', 'ropa', 'suavizante', 'cloro', 'lavatrastes', 'ariel', 'persil']
};

/**
 * Accent-insensitive, stem-aware, multi-word & synonym-tolerant search matcher.
 * Treating "ma" === "má", "serum" === "sérum", "mascara" === "mascarilla", etc.
 */
export const matchesFlexibleSearch = (query = '', targetFields = [], { includeSynonyms = true } = {}) => {
  const normQuery = normalizeString(query);
  if (!normQuery) return true;

  const fieldsArray = Array.isArray(targetFields) ? targetFields : [targetFields];
  const combinedHaystack = normalizeString(fieldsArray.filter(Boolean).join(' '));
  if (!combinedHaystack) return false;

  // 1. Direct normalized substring match (handles "ma" matching "Máscara", "Mascarilla", "Crema", etc.)
  if (combinedHaystack.includes(normQuery)) {
    return true;
  }

  const queryWords = normQuery.split(/\s+/).filter(Boolean);
  const haystackWords = combinedHaystack.split(/\s+/).filter(Boolean);

  // 2. Check if every query token matches via substring, stem/root, typo tolerance, or related concept
  return queryWords.every(qw => {
    if (combinedHaystack.includes(qw)) return true;

    const qStem = getWordStem(qw);
    for (const hw of haystackWords) {
      if (hw.includes(qw) || (qw.length >= 3 && qw.includes(hw) && hw.length >= 3)) {
        return true;
      }
      if (qStem.length >= 4) {
        const hStem = getWordStem(hw);
        if (hStem.length >= 4 && (hStem.startsWith(qStem) || qStem.startsWith(hStem))) {
          return true;
        }
      }
      if (qw.length >= 5 && hw.length >= 5 && isWithinOneEdit(qw, hw)) {
        return true;
      }
    }

    if (includeSynonyms && qw.length >= 4) {
      const syns = RELATED_CONCEPT_SYNONYMS[qw] || RELATED_CONCEPT_SYNONYMS[qStem] || [];
      if (syns.some(s => combinedHaystack.includes(s))) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Computes a relevance score for a household item against a search query,
 * treating accented and unaccented characters identically ("mas" === "más").
 * Prioritizes matches in the product name (especially prefix matches like "Máscara" / "Mascarilla")
 * over subproducts and notes, and prevents Spanish stop-words in notes (like "más") from polluting results.
 */
export const scoreHouseholdItemSearch = (query = '', item = null) => {
  if (!item) return 0;
  const normQuery = normalizeString(query);
  if (!normQuery) return 1;

  const normName = normalizeString(item.name || item.title || '');
  const nameWords = normName.split(/\s+/).filter(Boolean);

  // 1. Exact or prefix match on product name ("mas" / "más" -> "Máscara Facial LED de Luz Roja")
  if (normName === normQuery) return 1000;
  if (normName.startsWith(normQuery)) return 850 + Math.max(0, 40 - normName.length * 0.5);
  if (nameWords.some(w => w.startsWith(normQuery))) return 700;
  if (normName.includes(normQuery)) return 550;

  // 2. Flexible stem / synonym / typo match on product name
  if (matchesFlexibleSearch(normQuery, [item.name || item.title || ''])) {
    return 420;
  }

  // 3. Match on subproducts / varieties / favorite variety
  const varietyFields = [
    item.favoriteVariety,
    ...(item.subproducts || []),
    ...(item.stores || []).map(s => s?.variety),
    ...(item.pendingStores || []).map(ps => ps?.suggestedVariety)
  ].filter(Boolean);

  const normVarieties = normalizeString(varietyFields.join(' '));
  if (normVarieties.split(/\s+/).some(w => w.startsWith(normQuery))) return 350;
  if (matchesFlexibleSearch(normQuery, varietyFields)) return 280;

  // 4. Match on category or store names
  const storeAndCatFields = [
    item.category,
    ...(item.stores || []).map(s => s?.storeName),
    ...(item.pendingStores || []).map(ps => ps?.storeName)
  ].filter(Boolean);
  if (matchesFlexibleSearch(normQuery, storeAndCatFields, { includeSynonyms: false })) {
    return 180;
  }

  // 5. Match on notes — ignore short common Spanish stop-words like "mas"/"más" in notes
  // so products whose notes say "dura más" or "más salado" don't eclipse "Máscara Facial LED"
  const noteStopWords = new Set(['mas', 'con', 'por', 'para', 'sin', 'del', 'las', 'los', 'una', 'uno', 'uso', 'dia', 'vez']);
  if (!noteStopWords.has(normQuery) && normQuery.length >= 3) {
    if (matchesFlexibleSearch(normQuery, [item.notes || ''], { includeSynonyms: false })) {
      return 90;
    }
  }

  return 0;
};

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
  if (!cleanNew || cleanNew.length < 2) return [];

  const newWords = cleanNew.split(/\s+/).filter(w => w.length >= 2);
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
    if (!existingName || existingName.length < 2) continue;

    let score = 0;
    const existingWordsList = existingName.split(/\s+/).filter(Boolean);

    // 1. Exact equality (highest priority)
    if (cleanNew === existingName) {
      score = 1000;
    }
    // 2. Prefix or direct substring containment
    else if (existingName.startsWith(cleanNew)) {
      score = 400 + (cleanNew.length / existingName.length) * 50;
    } else if (existingWordsList.some(w => w.startsWith(cleanNew))) {
      score = 320 + (cleanNew.length / existingName.length) * 50;
    } else if (cleanNew.length >= 3 && existingName.includes(cleanNew)) {
      score = 200 + (cleanNew.length / existingName.length) * 50;
    } else if (existingName.length >= 3 && cleanNew.includes(existingName)) {
      score = 200 + (existingName.length / cleanNew.length) * 50;
    }
    // 3. Significant word overlap (e.g. 'teatrical', 'concha', 'kirkland')
    else if (significantNewWords.length > 0) {
      const existingWords = new Set(existingWordsList.filter(w => w.length > 2));
      const matchedWords = significantNewWords.filter(w => existingWords.has(w));
      const matchCount = matchedWords.length;

      if (matchCount >= 2) {
        score = 100 + matchCount * 30;
      } else if (matchCount === 1) {
        const matchedWord = matchedWords[0];
        if (matchedWord.length >= 3) {
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
  if (!cleanNew || cleanNew.length < 2) return [];

  const newWords = cleanNew.split(/\s+/).filter(w => w.length >= 2);
  const stopWords = new Set([
    'con', 'para', 'del', 'los', 'las', 'una', 'uno', 'por', 'que', 'min',
    'sesion', 'rutina', 'tiempo', 'de', 'el', 'la', 'en', 'un', 'y', 'al'
  ]);
  const significantNewWords = newWords.filter(w => !stopWords.has(w));

  const scoredCandidates = [];

  const wordMatchesFlexible = (qWord, targetWordsArr) => {
    const qStem = getWordStem(qWord);
    for (const tw of targetWordsArr) {
      if (tw === qWord) return 2; // exact word
      if (qWord.length >= 2 && (tw.startsWith(qWord) || (tw.length >= 3 && qWord.startsWith(tw)))) return 1.6;
      if (qStem.length >= 4) {
        const tStem = getWordStem(tw);
        if (tStem.length >= 4 && (tStem.startsWith(qStem) || qStem.startsWith(tStem))) return 1.3;
      }
      if (qWord.length >= 5 && tw.length >= 5 && isWithinOneEdit(qWord, tw)) return 1.2;
    }
    return 0;
  };

  for (const item of householdList) {
    if (!item) continue;
    const existingRawName = item.name || item.title || '';
    const existingName = normalizeString(existingRawName);

    // Extract all registered subproducts and varieties for this item
    const subTerms = Array.from(new Set([
      ...(Array.isArray(item.subproducts) ? item.subproducts : []),
      ...(Array.isArray(item.stores) ? item.stores.map(s => s && s.variety).filter(Boolean) : []),
      ...(Array.isArray(item.pendingStores) ? item.pendingStores.map(ps => ps && ps.suggestedVariety).filter(Boolean) : [])
    ]));

    let nameScore = 0;
    let bestSubScore = 0;
    let matchedSubproduct = '';

    // 1. Check against item.name (with strong priority for prefix matches like "mas" / "más" -> "Máscara Facial LED de Luz Roja")
    if (existingName && existingName.length >= 2) {
      const existingWordsArr = existingName.split(/\s+/).filter(w => w.length >= 2);
      if (cleanNew === existingName) {
        nameScore = 1000;
      } else if (existingName.startsWith(cleanNew)) {
        nameScore = 420 + (cleanNew.length / existingName.length) * 50;
      } else if (existingWordsArr.some(w => w.startsWith(cleanNew))) {
        nameScore = 340 + (cleanNew.length / existingName.length) * 50;
      } else if (cleanNew.length >= 2 && existingName.includes(cleanNew)) {
        nameScore = 200 + (cleanNew.length / existingName.length) * 50;
      } else if (existingName.length >= 3 && cleanNew.includes(existingName)) {
        nameScore = 200 + (existingName.length / cleanNew.length) * 50;
      } else if (significantNewWords.length > 0) {
        let matchedWeight = 0;
        let matchedCount = 0;
        for (const qw of significantNewWords) {
          const wScore = wordMatchesFlexible(qw, existingWordsArr);
          if (wScore > 0) {
            matchedCount++;
            matchedWeight += wScore;
          }
        }
        if (matchedCount >= 2) {
          nameScore = 100 + matchedWeight * 25;
        } else if (matchedCount === 1 && significantNewWords[0].length >= 2) {
          nameScore = 50 + matchedWeight * 15;
        }
      }
    }

    // 2. Check against each subproduct / variety
    for (const sub of subTerms) {
      const cleanSub = normalizeString(sub);
      if (!cleanSub || cleanSub.length < 2) continue;

      let currentSubScore = 0;
      if (cleanNew === cleanSub) {
        currentSubScore = 500;
      } else if (cleanSub.length >= 3 && cleanNew.includes(cleanSub)) {
        currentSubScore = 240 + (cleanSub.length / cleanNew.length) * 50;
      } else if (cleanNew.length >= 3 && cleanSub.includes(cleanNew)) {
        currentSubScore = 180 + (cleanNew.length / cleanSub.length) * 50;
      } else if (significantNewWords.length > 0) {
        const subWordsArr = cleanSub.split(/\s+/).filter(w => w.length >= 2);
        let matchedWeight = 0;
        let matchedCount = 0;
        for (const qw of significantNewWords) {
          const wScore = wordMatchesFlexible(qw, subWordsArr);
          if (wScore > 0) {
            matchedCount++;
            matchedWeight += wScore;
          }
        }
        if (matchedCount >= 2) {
          currentSubScore = 120 + matchedWeight * 20;
        } else if (matchedCount === 1 && significantNewWords[0].length >= 3) {
          currentSubScore = 60 + matchedWeight * 15;
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


