/**
 * Gemini AI & Image Processing Utilities
 * Aura Nexus — Armario Virtual Inteligente
 */

/**
 * Compresses an image file in the browser using HTML5 Canvas to keep
 * payload and localStorage/Firestore footprint minimal (~30-70 KB).
 * 
 * @param {File} file 
 * @param {number} maxDimension - Max width or height in pixels
 * @param {number} quality - JPEG compression quality (0 to 1)
 * @returns {Promise<{ dataUrl: string, base64: string, mimeType: string }>}
 */
export const compressImage = (file, maxDimension = 800, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(new Error('Error al leer el archivo de imagen: ' + err.message));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen seleccionada.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1];

        resolve({ dataUrl, base64, mimeType });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes a clothing image using Google Gemini Multimodal API and returns
 * structured JSON fields corresponding to Aura Nexus wardrobe categories.
 * 
 * @param {string} base64Data - Raw base64 string without data:image/jpeg;base64, prefix
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @param {string} apiKey - Gemini API Key from Google AI Studio
 * @returns {Promise<{ name: string, category: string, color: string, tags: string[] }>}
 */
export const analyzeClothingImage = async (base64Data, mimeType, apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Debes configurar tu Gemini API Key para usar el análisis automático.');
  }

  const prompt = `
Eres un asistente experto en estilismo, moda y organización de guardarropas.
Analiza la prenda de vestir en esta fotografía y responde EXCLUSIVAMENTE con un objeto JSON válido (sin formato markdown adicional, sin bloques de código ni texto antes o después) con la siguiente estructura:

{
  "name": "Nombre descriptivo, estilizado y conciso de la prenda (ej. 'Playera Gráfica Oversize', 'Blazer Cruzado Marino', 'Botas Chelsea de Cuero')",
  "category": "tops" | "bottoms" | "outerwear" | "footwear" | "accessories",
  "color": "Color predominante y tono en español (ej. 'Negro profundo', 'Azul marino', 'Verde olivo', 'Gris jaspeado')",
  "tags": ["3 a 5 palabras clave sobre estilo, corte, ocasión o material, ej: 'algodón', 'oversize', 'casual', 'cuero', 'formal', 'grunge', 'geek'"]
}

Reglas estrictas de categoría:
- "tops": playeras, camisas, blusas, tops, crop tops, camisetas sin mangas.
- "bottoms": pantalones, jeans, cargo, shorts, faldas, leggings, pants.
- "outerwear": chamarras, sudaderas, hoodies, blazers, sacos, abrigos, chalecos, suéteres, cardigans.
- "footwear": tenis, botas, mocasines, sandalias, zapatos de tacón, botines.
- "accessories": gorros, bufandas, cinturones, lentes, mochilas, bolsas, joyas, scrunchies.
`;

  // Production models with automatic fallback
  // 'gemini-flash-latest' always points to the latest production Flash model (supports vision & fast inference)
  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || response.statusText;
        
        if (response.status === 400 && errMsg.toLowerCase().includes('api key')) {
          throw new Error('La API Key ingresada no es válida en Google AI Studio. Verifica tu clave.');
        }
        if (response.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('Límite de cuota temporal alcanzado en Gemini. Intenta en unos momentos.');
        }
        throw new Error(`[${model}] Error de Gemini: ${errMsg}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini no devolvió texto de respuesta para la imagen.');
      }

      // Parse JSON from response
      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
      const parsed = JSON.parse(cleaned);

      // Validate and sanitize categories
      const validCategories = ['tops', 'bottoms', 'outerwear', 'footwear', 'accessories'];
      let category = parsed.category?.toLowerCase() || '';
      if (!validCategories.includes(category)) {
        const textToInspect = `${parsed.name || ''} ${category} ${(parsed.tags || []).join(' ')}`.toLowerCase();
        if (/pantalon|jeans|short|falda|cargo|legging|pants|bermuda/.test(textToInspect)) {
          category = 'bottoms';
        } else if (/chamarra|sudadera|hoodie|blazer|abrigo|sueter|cardigan|saco|chaleco|chaqueta/.test(textToInspect)) {
          category = 'outerwear';
        } else if (/zapato|tenis|bota|mocas|sandalia|tac|sneaker|calzado/.test(textToInspect)) {
          category = 'footwear';
        } else if (/gorro|gorra|cinturon|lente|mochila|bolsa|joya|bufanda|reloj|collar|anillo/.test(textToInspect)) {
          category = 'accessories';
        } else {
          category = 'tops';
        }
      }

      return {
        name: parsed.name || 'Prenda sin título',
        category,
        color: parsed.color || 'Varios',
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      };
    } catch (err) {
      console.warn(`Attempt with ${model} failed:`, err.message);
      lastError = err;
      // If error is definitely an invalid API key, do not retry other models uselessly
      if (err.message.includes('API Key ingresada no es válida')) {
        break;
      }
    }
  }

  throw lastError || new Error('No se pudo procesar la imagen con Gemini.');
};

/**
 * Algorithmic stylist fallback that creates a harmonious outfit from clean garments
 * based on occasion keywords and garment categories when Gemini is offline or without API Key.
 */
export const generateFallbackOutfit = (cleanGarments, occasion = '') => {
  if (!cleanGarments || cleanGarments.length === 0) {
    throw new Error('No hay prendas limpias disponibles para armar un outfit.');
  }

  const occLower = (occasion || '').toLowerCase();
  const isFormal = /formal|ejecutiv|director|socio|negocio|gala|boda|entrevista/.test(occLower);
  const isCreative = /creativ|geek|tech|arte|diseño|anime|innovac/.test(occLower);
  const isSportyOrComfort = /gym|deport|confort|viaje|comod|home office|descanso/.test(occLower);

  let formalityLevel = 'Smart Casual';
  if (isFormal) formalityLevel = 'Formal';
  else if (isCreative) formalityLevel = 'Creativo';
  else if (isSportyOrComfort) formalityLevel = 'Confort';

  const tops = cleanGarments.filter(g => g.category === 'tops');
  const bottoms = cleanGarments.filter(g => g.category === 'bottoms');
  const outerwear = cleanGarments.filter(g => g.category === 'outerwear');
  const footwear = cleanGarments.filter(g => g.category === 'footwear');
  const accessories = cleanGarments.filter(g => g.category === 'accessories');

  // Scoring helper
  const scoreGarment = (g) => {
    let score = 0;
    const text = `${g.name} ${g.color} ${(g.tags || []).join(' ')}`.toLowerCase();
    if (isFormal) {
      if (/blazer|camisa|cuero|saco|formal|vestir|oscuro|joya|recto/.test(text)) score += 3;
      if (/estampado|anime|deportiv|pants/.test(text)) score -= 2;
    } else if (isCreative) {
      if (/oversize|cargo|anime|geek|estampad|grafic|contraste/.test(text)) score += 3;
    } else if (isSportyOrComfort) {
      if (/legging|hoodie|sudadera|confort|algodon|tenis/.test(text)) score += 3;
    }
    return score;
  };

  const pickBest = (list) => {
    if (!list || list.length === 0) return null;
    const sorted = [...list].sort((a, b) => scoreGarment(b) - scoreGarment(a));
    return sorted[0];
  };

  const selectedGarments = [];
  const top = pickBest(tops);
  if (top) selectedGarments.push(top);

  const bottom = pickBest(bottoms);
  if (bottom) selectedGarments.push(bottom);

  // Outerwear is ideal for formal or creative occasions
  if (outerwear.length > 0 && (isFormal || isCreative || Math.random() > 0.4)) {
    const out = pickBest(outerwear);
    if (out) selectedGarments.push(out);
  }

  // Footwear
  const foot = pickBest(footwear);
  if (foot) selectedGarments.push(foot);

  // Accessories
  if (accessories.length > 0) {
    const acc = pickBest(accessories);
    if (acc) selectedGarments.push(acc);
  }

  // If both tops and bottoms were missing or incomplete, grab whatever clean items are available
  if (selectedGarments.length === 0) {
    selectedGarments.push(...cleanGarments.slice(0, 3));
  }

  const selectedGarmentIds = selectedGarments.map(g => g.id);
  const colors = selectedGarments.map(g => g.color).filter(Boolean);

  let styleRationale = `Conjunto equilibrado para "${occasion || 'tu reunión'}" combinando prendas limpias en tonos armónicos (${colors.slice(0, 3).join(', ')}). Proyecta presencia cuidada y acorde al momento.`;
  if (isFormal) {
    styleRationale = `Combinación de corte estructurado y pulcro ideal para proyectar autoridad, profesionalismo y confianza en tu reunión de trabajo.`;
  } else if (isCreative) {
    styleRationale = `Look dinámico con contrastes de textura que destaca tu personalidad y creatividad sin sacrificar elegancia.`;
  }

  return {
    outfitName: `Look ${formalityLevel}: ${occasion ? occasion.slice(0, 32) : 'Estilo Personal'}`,
    selectedGarmentIds,
    styleRationale,
    stylingTips: 'Faja ligeramente el top o camisa al frente y mantén el calzado limpio para un acabado impecable.',
    formalityLevel
  };
};

/**
 * Recommends an optimal outfit for a specific meeting/occasion using
 * Google Gemini Multimodal / Text AI, selecting exclusively from garments marked as clean.
 * 
 * @param {Array<Object>} cleanGarments - List of garments where isClean === true
 * @param {string} occasion - Meeting or occasion description
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<{
 *   outfitName: string,
 *   selectedGarmentIds: string[],
 *   styleRationale: string,
 *   stylingTips: string,
 *   formalityLevel: string
 * }>}
 */
export const recommendOutfitForOccasion = async (cleanGarments, occasion, apiKey) => {
  if (!cleanGarments || cleanGarments.length === 0) {
    throw new Error('No tienes prendas limpias disponibles en tu armario para armar un outfit.');
  }

  // Fallback if no API key is set
  if (!apiKey || !apiKey.trim()) {
    return generateFallbackOutfit(cleanGarments, occasion);
  }

  const cleanInventorySummary = cleanGarments.map(g => ({
    id: g.id,
    name: g.name,
    category: g.category,
    color: g.color,
    tags: g.tags
  }));

  const prompt = `
Eres un asesor de imagen de élite y estilista personal para la aplicación AURA Nexus.
El usuario necesita armar un outfit completo para la siguiente ocasión / reunión:
"${occasion || 'Reunión importante'}"

INVENTARIO DE ROPA LIMPIA DISPONIBLE:
${JSON.stringify(cleanInventorySummary, null, 2)}

INSTRUCCIONES ESTRICTAS:
1. Selecciona ÚNICAMENTE prendas que existan en el inventario limpio de arriba, devolviendo sus IDs exactos en "selectedGarmentIds".
2. Un outfit armónico y funcional debe tener:
   - 1 Top (prenda superior)
   - 1 Bottom (pantalón, short, falda, leggings)
   - 1 Footwear (calzado, si hay disponible)
   - Opcional: 1 Outerwear (chamarra, blazer, abrigo, suéter si aporta al estilo de la ocasión)
   - Opcional: 1 Accesorio (reloj, lentes, gorro, mochila)
3. La combinación de colores, cortes y nivel de formalidad debe ser impecable para el evento solicitado.

Responde EXCLUSIVAMENTE con un JSON válido con la siguiente estructura:
{
  "outfitName": "Nombre corto y estilizado del outfit (ej: 'Smart Casual Ejecutivo', 'Look Café Creativo')",
  "selectedGarmentIds": ["id_de_prenda_1", "id_de_prenda_2", "id_de_prenda_3"],
  "styleRationale": "2 o 3 oraciones explicando con lenguaje de estilista profesional por qué estas piezas combinan y por qué son ideales para la reunión.",
  "stylingTips": "Consejos prácticos de uso (ej. fajado francés, remangar mangas, uso de contrastes o calzado).",
  "formalityLevel": "Formal" | "Smart Casual" | "Casual" | "Creativo" | "Confort"
}
`;

  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];
  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.3
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      const parsed = JSON.parse(cleaned);

      // Verify that all IDs exist in cleanGarments
      const validIds = (parsed.selectedGarmentIds || []).filter(id => 
        cleanGarments.some(cg => cg.id === id)
      );

      if (validIds.length > 0) {
        return {
          outfitName: parsed.outfitName || `Look para ${occasion || 'tu Reunión'}`,
          selectedGarmentIds: validIds,
          styleRationale: parsed.styleRationale || 'Combinación de prendas limpias seleccionada con criterio estilístico.',
          stylingTips: parsed.stylingTips || 'Mantén tu calzado limpio y combina con accesorios discretos.',
          formalityLevel: parsed.formalityLevel || 'Smart Casual'
        };
      }
    } catch (err) {
      console.warn(`Attempt with ${model} failed for outfit recommendation:`, err.message);
    }
  }

  // If all models failed or network error, return the algorithmic fallback
  return generateFallbackOutfit(cleanGarments, occasion);
};

/**
 * Algorithmic fallback for health, pain, ergonomic & aesthetic triage
 * when Gemini API key is missing or offline.
 * 
 * @param {Object} symptom
 * @returns {Object} Structured clinical & ergonomic guidance
 */
export const generateFallbackHealthTriage = (symptom) => {
  const text = `${symptom.title || ''} ${symptom.bodyZone || ''} ${symptom.trigger || ''} ${symptom.notes || ''} ${symptom.category || ''}`.toLowerCase();
  
  // Pain / Musculoskeletal / Posture / Driving
  if (/espalda|lumbar|ciatic|columna|tobillo|manejar|conduc|rodilla|pie|talon|cuello|cervical|hombro|postura|ergonom|muñeca|tunel/.test(text)) {
    const isDriving = /manejar|conduc|auto|carro|pedal|acelerad/.test(text);
    return {
      specialist: 'Ortopedista / Fisioterapeuta o Fisiatra',
      specialistDescription: 'Especialista en biomecánica musculoesquelética, columna y rehabilitación articular postural.',
      priority: (symptom.painLevel >= 7) ? 'Atención Recomendada' : 'Rutinario',
      physiologicalExplanation: isDriving
        ? 'La conducción prolongada genera tensión asimétrica: el pie derecho en el pedal hiperextiende los tendones del tobillo, mientras que la vibración y el ángulo del asiento aplanan la curvatura lumbar natural (L4-S1), irradiando molestia a rodillas y cadera.'
        : 'Sobrecarga miofascial y desalineación postural por posturas estáticas prolongadas o desbalance en los grupos musculares estabilizadores.',
      immediateReliefTips: [
        'Ajustar la distancia del asiento del auto: tus rodillas deben quedar flexionadas a 120° con el talón apoyado de pivote frente al freno.',
        'Colocar un cojín o toalla enrollada como soporte lumbar en la curva baja de la espalda.',
        'Realizar pausas activas cada 45-60 min: estiramiento suave de isquiotibiales y rotaciones circulares de tobillo.',
        'Aplicar compresas tibias 15 minutos por la noche en la zona lumbar para relajar los músculos paravertebrales.'
      ],
      consultationQuestions: [
        '¿Recomienda estudios de imagen (radiografía/resonancia) para evaluar alineación articular o descartar pinzamiento?',
        '¿Qué ejercicios específicos de fortalecimiento de core y flexibilidad debo integrar en mi rutina?',
        '¿Sería conveniente el uso de plantillas ortopédicas personalizadas para optimizar la pisada al caminar y conducir?'
      ],
      lifestyleHabits: [
        'Evitar llevar billetera u objetos voluminosos en los bolsillos traseros al sentarte.',
        'Fortalecer el abdomen y glúteos 3 veces por semana para proteger la zona lumbar.'
      ],
      redFlags: 'Dolor que irradia con adormecimiento/hormigueo hacia los dedos del pie, pérdida de fuerza o dolor que no cede en reposo total.'
    };
  }

  // Skin / Warts / Dry skin / Dermatological
  if (/verruga|piel|reseca|talon|cutan|mancha|lunar|acne|poro|dermat|alergia|eczema|granit/.test(text)) {
    const isWart = /verruga|mezquino|lunar|bulto|verrug/.test(text);
    return {
      specialist: 'Dermatólogo Clínico',
      specialistDescription: 'Médico especialista en patologías cutáneas, lesiones epidérmicas y restauración de la barrera de la piel.',
      priority: isWart ? 'Rutinario' : 'Preventivo',
      physiologicalExplanation: isWart
        ? 'Las lesiones verrugosas o queratosis suelen ser proliferaciones epidérmicas benignas causadas por microtraumatismos o agentes virales localizados que requieren diagnóstico dermatoscópico.'
        : 'Pérdida de agua transepidérmica y déficit en la síntesis de ceramidas y factores naturales de hidratación, agravado por agua caliente, jabones abrasivos o climas secos.',
      immediateReliefTips: [
        'Para resequedad severa: aplicar cremas con Urea al 10% - 20% inmediatamente después de la ducha sobre la piel húmeda.',
        'No cortar, raspar ni aplicar químicos cáusticos caseros sobre verrugas o lunares para evitar cicatrices o infección.',
        'Usar sustitutos de jabón (syndet) con pH neutro 5.5 y agua tibia en lugar de caliente.',
        'Aplicar protector solar diario FPS 50+ en todas las áreas corporales expuestas.'
      ],
      consultationQuestions: [
        '¿Qué procedimiento de consultorio (crioterapia, electrofulguración, láser) es el más seguro y estético para retirar la lesión?',
        '¿Cuál es la concentración ideal de activos (urea, ácido láctico, ceramidas) para mi tipo de piel?',
        '¿Requiere biopsia o análisis dermatoscópico para mayor tranquilidad?'
      ],
      lifestyleHabits: [
        'Duchas breves menores a 8 minutos sin esponjas ásperas.',
        'Mantener hidratación hídrica constante con al menos 2.5 litros de agua al día.'
      ],
      redFlags: 'Lesiones que cambien rápidamente de color, tamaño, sangren espontáneamente o tengan bordes irregulares y asimétricos.'
    };
  }

  // Hair / Frizz / Scalp
  if (/cabello|frizz|pelo|cuero cabelludo|capilar|horzuela|quiebre|alopec|caida/.test(text)) {
    return {
      specialist: 'Tricólogo / Dermatólogo Capilar',
      specialistDescription: 'Especialista en salud del folículo piloso, cutícula capilar y cuero cabelludo.',
      priority: 'Preventivo',
      physiologicalExplanation: 'La cutícula capilar deshidratada o porosa absorbe la humedad ambiental de forma desigual, levantando las escamas del cabello y generando frizz y encrespamiento estático.',
      immediateReliefTips: [
        'Dormir con funda o gorro de satén para reducir la fricción nocturna que rompe la fibra.',
        'Secar con toalla de microfibra mediante toques suaves, sin frotar con toallas de algodón.',
        'Sellar las puntas con 2-3 gotas de aceite de argán o jojoba tras aplicar acondicionador leave-in.',
        'Terminar el lavado con agua templada a fría para cerrar la cutícula.'
      ],
      consultationQuestions: [
        '¿Qué tratamiento de consultorio (reconstrucción térmica, ozonoterapia capilar) es más compatible con mi fibra capilar?',
        '¿Presento porosidad alta o desbalance proteico en la hebra capilar?'
      ],
      lifestyleHabits: [
        'Usar cepillos de cerdas de madera natural para distribuir los aceites propios del cuero cabelludo.',
        'Aplicar protector térmico si se utilizan herramientas de calor.'
      ],
      redFlags: 'Caída masiva en mechones, zonas circulares sin cabello o prurito y descamación severa en el cuero cabelludo.'
    };
  }

  // Weight / Metabolism / Digestion
  if (/peso|sobrepeso|grasa|metabol|inflam|digest|hinchaz|gastrit|colitis/.test(text)) {
    return {
      specialist: 'Nutriólogo Clínico / Endocrinólogo',
      specialistDescription: 'Especialista en metabolismo, balance hormonal y recomposición corporal sostenible.',
      priority: 'Atención Recomendada',
      physiologicalExplanation: 'El sobrepeso o la inflamación recurrente se asocian a un balance calórico desajustado, resistencia a la insulina o disbiosis intestinal que impactan la energía y la salud articular.',
      immediateReliefTips: [
        'Priorizar 25-30g de proteína de alta calidad y fibra en el desayuno para regular la saciedad y glucosa.',
        'Caminar 10-15 minutos a paso ligero inmediatamente después de las comidas principales.',
        'Eliminar bebidas azucaradas y harinas refinadas ultraprocesadas.',
        'Mantener un horario regular de sueño (7-8 horas) para regular el cortisol y la grelina.'
      ],
      consultationQuestions: [
        '¿Qué panel de laboratorio (química sanguínea completa, perfil tiroideo, insulina en ayunas) sugiere realizar?',
        '¿Cómo planificar un déficit calórico moderado que preserve mi masa muscular y energía?',
        '¿Hay factores hormonales o de absorción que estén dificultando mi control de peso?'
      ],
      lifestyleHabits: [
        'Planificar compras saludables semanales usando el Comparador de Precios de AURA Nexus.',
        'Registrar el pesaje semanal matutino en ayunas para monitorear tendencias.'
      ],
      redFlags: 'Aumento o pérdida drástica de peso involuntaria, fatiga extrema o sed excesiva acompañada de visión borrosa.'
    };
  }

  // Bruxism / Jaw / Headaches
  if (/bruxis|mandib|diente|mord|cabeza|migraña|tensin|apret/.test(text)) {
    return {
      specialist: 'Odontólogo Especialista en ATM / Rehabilitación Oral',
      specialistDescription: 'Especialista en articulación temporomandibular, oclusión y protección contra el desgaste dental nocturno.',
      priority: 'Atención Recomendada',
      physiologicalExplanation: 'El bruxismo céntrico o excéntrico somete a la articulación temporomandibular (ATM) a cargas de hasta 100 kg/cm² durante el sueño por estrés no canalizado.',
      immediateReliefTips: [
        'Aplicar compresas tibias en los laterales del rostro (músculos maseteros) 10 min antes de dormir.',
        'Practicar la posición de reposo mandibular: lengua pegada al paladar, dientes ligeramente separados y labios sellados.',
        'Evitar masticar chicle, alimentos extremadamente duros o apoyar la barbilla en las manos al trabajar.',
        'Tomar citrato de magnesio por la noche para favorecer la relajación muscular.'
      ],
      consultationQuestions: [
        '¿Presento facetas de desgaste en el esmalte dental o inflamación en la cápsula articular?',
        '¿Qué tipo de guarda oclusiva rígida de acrílico es la más adecuada para mi mordida?',
        '¿Se recomienda fisioterapia maxilofacial complementaria?'
      ],
      lifestyleHabits: [
        'Realizar higiene del sueño sin pantallas 30 minutos antes de dormir.',
        'Ejercicios de respiración diafragmática al final del día.'
      ],
      redFlags: 'Bloqueo mandibular (incapacidad para abrir o cerrar la boca) o chasquidos con dolor agudo al masticar.'
    };
  }

  // General / Default
  return {
    specialist: 'Médico General / Especialista en Medicina Preventiva',
    specialistDescription: 'Profesional de primer contacto para evaluación integral, descarte clínico y canalización precisa.',
    priority: (symptom.painLevel >= 6) ? 'Atención Recomendada' : 'Rutinario',
    physiologicalExplanation: `Manifestación sintomática en ${symptom.bodyZone || 'el organismo'} asociada a factores de estilo de vida, posturas cotidianas o procesos inflamatorios leves que ameritan seguimiento clínico.`,
    immediateReliefTips: [
      'Llevar una bitácora detallada de cuándo se intensifica la molestia y qué actividades la alivian.',
      'Mantener hidratación adecuada y evitar posturas forzadas o sobreesfuerzos repentinos.',
      'Favorecer periodos de descanso y sueño reparador.'
    ],
    consultationQuestions: [
      '¿Qué causas principales pueden originar esta molestia con base en mi historial?',
      '¿Qué medidas preventivas o estudios específicos recomienda realizar?'
    ],
    lifestyleHabits: [
      'Seguimiento periódico de signos y registro en AURA Nexus.',
      'Alimentación equilibrada y actividad física moderada.'
    ],
    redFlags: 'Aparición de fiebre, dolor súbito incapacitante, inflamación desmedida o alteraciones neurológicas.'
  };
};

/**
 * Analyzes a health symptom / pain / posture / aesthetic complaint using Google Gemini AI
 * and returns structured triage, specialist recommendation, consultation questions, and relief tips.
 * 
 * @param {Object} symptom - The symptom object with title, bodyZone, trigger, painLevel, notes, etc.
 * @param {string} apiKey - Gemini API Key from Google AI Studio
 * @returns {Promise<Object>}
 */
export const analyzeHealthSymptomWithGemini = async (symptom, apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    // Return high quality algorithmic triage immediately
    return generateFallbackHealthTriage(symptom);
  }

  const prompt = `
Eres un médico especialista en medicina preventiva, ergonomía clínica y dermatología/estética.
Analiza la siguiente molestia o síntoma registrado por la usuaria y genera una orientación médica/estética estructurada para canalizarla con el especialista adecuado y darle pautas claras para su consulta y alivio inmediato.

Información del síntoma:
- Título / Molestia: "${symptom.title || ''}"
- Categoría: "${symptom.category || 'general'}"
- Zona corporal afectada: "${symptom.bodyZone || 'No especificada'}"
- Escala de dolor/molestia (1-10): ${symptom.painLevel || 3}/10
- Desencadenante / Contexto: "${symptom.trigger || 'No especificado'}"
- Frecuencia: "${symptom.frequency || 'Ocasional'}"
- Notas / Descripción detallada: "${symptom.notes || 'Ninguna'}"

Responde EXCLUSIVAMENTE con un objeto JSON válido (sin formato markdown adicional, sin bloques de código ni texto antes o después) con la siguiente estructura exacta:

{
  "specialist": "Nombre exacto del especialista médico idóneo (ej: 'Ortopedista / Fisioterapeuta', 'Dermatólogo Clínico', 'Nutriólogo Clínico / Endocrinólogo', 'Tricólogo Capilar', 'Odontólogo Especialista en ATM', 'Podólogo Clínico')",
  "specialistDescription": "1 o 2 oraciones explicando por qué este profesional es el más capacitado para atender esta molestia",
  "priority": "Preventivo" | "Rutinario" | "Atención Recomendada" | "Prioritario",
  "physiologicalExplanation": "Explicación clara, empática y con rigor biomecánico o fisiológico de por qué ocurre este síntoma o molestia y cómo los factores como postura, manejo, clima o estrés lo detonan.",
  "immediateReliefTips": [
    "Consejo ergonómico o de autocuidado práctico y seguro #1 (ej. ajuste específico del asiento del auto o escritorio)",
    "Consejo de alivio #2 (ej. compresa, estiramiento suave, crema con urea o cambio de hábito)",
    "Consejo de alivio #3",
    "Consejo de alivio #4"
  ],
  "consultationQuestions": [
    "Pregunta clave #1 formulada para que la usuaria le haga al médico en su cita",
    "Pregunta clave #2 sobre estudios de imagen, laboratorio o tratamientos",
    "Pregunta clave #3"
  ],
  "lifestyleHabits": [
    "Hábito preventivo diario #1",
    "Hábito preventivo diario #2"
  ],
  "redFlags": "Signos de alarma específicos que ameritarían acudir a urgencias médicas"
}
`;

  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.25
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      const parsed = JSON.parse(cleaned);

      if (parsed.specialist && parsed.physiologicalExplanation) {
        return {
          specialist: parsed.specialist,
          specialistDescription: parsed.specialistDescription || 'Especialista clínico indicado para valoración.',
          priority: parsed.priority || 'Atención Recomendada',
          physiologicalExplanation: parsed.physiologicalExplanation,
          immediateReliefTips: Array.isArray(parsed.immediateReliefTips) ? parsed.immediateReliefTips : [],
          consultationQuestions: Array.isArray(parsed.consultationQuestions) ? parsed.consultationQuestions : [],
          lifestyleHabits: Array.isArray(parsed.lifestyleHabits) ? parsed.lifestyleHabits : [],
          redFlags: parsed.redFlags || 'Dolor intenso súbito, pérdida de fuerza o cambios abruptos en la lesión.'
        };
      }
    } catch (err) {
      console.warn(`Attempt with ${model} failed for health triage:`, err.message);
    }
  }

  // Fallback if AI endpoint failed
  return generateFallbackHealthTriage(symptom);
};

/**
 * Multimodal analysis of a Product / Skincare / Pantry / Household item image
 * Extracts product name, category, brand, active ingredients / notes, and store recommendations.
 * 
 * @param {string} base64Data 
 * @param {string} mimeType 
 * @param {string} apiKey 
 * @returns {Promise<{ name: string, category: string, brand: string, notes: string, stores: Array }>}
 */
export const analyzeProductImage = async (base64Data, mimeType, apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    // Algorithmic fallback
    return {
      name: 'Producto Identificado',
      category: 'Skincare',
      brand: 'Marca Registrada',
      notes: 'Ingredientes activos y fórmula para cuidado personal.',
      stores: [
        { storeName: 'Farmacias Guadalajara', price: 95, quantity: 150 },
        { storeName: 'Amazon', price: 110, quantity: 150 }
      ]
    };
  }

  const prompt = `
Eres un asistente de compras inteligente y experto en productos de consumo, cosmética, skincare, despensa y farmacia.
Analiza la fotografía de este producto o etiqueta y responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown adicional) con la siguiente estructura:

{
  "name": "Nombre completo, marca y presentación del producto (ej. 'Crema Aclaradora Concha Nácar Teatrical 200g', 'Serum Retinol 0.3% CeraVe 30ml', 'Café Tostado Sam\\'s Member\\'s Mark 1kg')",
  "category": "Skincare" | "Dental" | "Higiene" | "Despensa" | "Limpieza" | "Otros",
  "brand": "Marca del producto (ej. 'Teatrical', 'CeraVe', 'Colgate', 'Kirkland')",
  "notes": "Resumen conciso (1-2 oraciones) de ingredientes activos clave, beneficios principales o modo de uso",
  "stores": [
    { "storeName": "Costco" | "Sam's Club" | "Bodega Aurrera" | "Tiendas 3B" | "Farmacias Guadalajara" | "Amazon", "price": 0, "quantity": 1 }
  ]
}

Reglas estrictas de categoría:
- "Skincare": cremas faciales, sueros, bloqueadores solares, mascarillas, tónicos, contorno de ojos, jabón facial.
- "Dental": pastas dentales, cepillos, enjuague bucal, hilo dental, guardas.
- "Higiene": desodorantes, jabón corporal, champú, toallas sanitarias, rastrillos, cremas corporales.
- "Despensa": café, arroz, avena, especies, aceites, suplementos alimenticios, snacks.
- "Limpieza": detergentes, suavizantes, cloro, limpiapisos, bolsas de basura.
- "Otros": medicamentos de venta libre, herramientas, accesorios.
`;

  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      const parsed = JSON.parse(cleaned);
      if (parsed.name) {
        const validCats = ['Skincare', 'Dental', 'Higiene', 'Despensa', 'Limpieza', 'Otros'];
        const cat = validCats.includes(parsed.category) ? parsed.category : 'Skincare';
        return {
          name: parsed.name,
          category: cat,
          brand: parsed.brand || '',
          notes: parsed.notes || '',
          stores: Array.isArray(parsed.stores) && parsed.stores.length > 0 ? parsed.stores : [
            { storeName: 'Farmacias Guadalajara', price: '', quantity: '' },
            { storeName: 'Amazon', price: '', quantity: '' }
          ]
        };
      }
    } catch (err) {
      console.warn(`Product image analysis with ${model} failed:`, err.message);
    }
  }

  throw new Error('No se pudo analizar la imagen del producto con Gemini.');
};

/**
 * Multimodal analysis of an Experience, Landmark, Restaurant, Cafe or Place image
 * 
 * @param {string} base64Data 
 * @param {string} mimeType 
 * @param {string} apiKey 
 * @returns {Promise<{ name: string, type: string, category: string, placeOrBrand: string, cost: string, notes: string }>}
 */
export const analyzeExperienceImage = async (base64Data, mimeType, apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    return {
      name: 'Lugar o Experiencia Identificada',
      type: 'place',
      category: 'Cafeterías',
      placeOrBrand: 'Zona Centro',
      cost: '$$',
      notes: 'Espacio recomendado para visita cultural o gastronómica.'
    };
  }

  const prompt = `
Eres un guía turístico, crítico gastronómico y curador de experiencias de estilo de vida.
Analiza la fotografía de este lugar, monumento arquitectónico, cafetería, restaurante, museo o platillo y responde EXCLUSIVAMENTE con un objeto JSON válido con la siguiente estructura:

{
  "name": "Nombre reconocido y preciso del lugar, monumento, café o experiencia (ej. 'Palacio de Bellas Artes', 'Café Nin', 'Museo Frida Kahlo (Casa Azul)', 'Restaurante Rosetta')",
  "type": "place" | "product",
  "category": "Cafeterías" | "Restaurantes" | "Cuidado Personal" | "Gourmet/Despensa" | "Entretenimiento al aire libre" | "Tiendas Especializadas",
  "placeOrBrand": "Ubicación, colonia o zona geográfica (ej. 'Centro Histórico, CDMX', 'Roma Norte, CDMX', 'Coyoacán, CDMX')",
  "cost": "$" | "$$" | "$$$" | "$$$$",
  "notes": "Breve descripción (1-2 oraciones) de su importancia arquitectónica, atmósfera o recomendación principal (ej. 'Majestuoso palacio de mármol de estilo Art Nouveau y Art Decó; ideal para paseos culturales y fotos al atardecer.')"
}

Reglas estrictas de categoría:
- "Entretenimiento al aire libre": monumentos, museos, teatros, parques, paseos históricos (ej. Bellas Artes, Chapultepec).
- "Cafeterías": specialty coffee, cafeterías de autor, panaderías boutique.
- "Restaurantes": bistrós, alta cocina, comida tradicional, cenas.
- "Cuidado Personal": spas, estéticas, barberías, centros de relajación.
- "Gourmet/Despensa": mercados gourmet, tiendas de té, chocolaterías.
- "Tiendas Especializadas": librerías, boutiques, tiendas de diseño o anime.
`;

  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      const parsed = JSON.parse(cleaned);
      if (parsed.name) {
        return {
          name: parsed.name,
          type: parsed.type === 'product' ? 'product' : 'place',
          category: parsed.category || 'Entretenimiento al aire libre',
          placeOrBrand: parsed.placeOrBrand || 'Ubicación identificada',
          cost: parsed.cost || '$$',
          notes: parsed.notes || 'Experiencia registrada con IA.'
        };
      }
    } catch (err) {
      console.warn(`Experience image analysis with ${model} failed:`, err.message);
    }
  }

  throw new Error('No se pudo analizar la foto de la experiencia con Gemini.');
};

/**
 * Multimodal analysis of a Health, Skin, Posture or Aesthetic image
 * 
 * @param {string} base64Data 
 * @param {string} mimeType 
 * @param {string} apiKey 
 * @returns {Promise<{ title: string, category: string, bodyZone: string, notes: string }>}
 */
export const analyzeHealthImage = async (base64Data, mimeType, apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    return {
      title: 'Molestia o Condición Cutánea Identificada',
      category: 'aesthetic_skin',
      bodyZone: 'Piel (Talones / Manos / Cuerpo)',
      notes: 'Observación visual para valoración de autocuidado o consulta médica.'
    };
  }

  const prompt = `
Eres un asistente clínico y dermatológico.
Analiza con respeto y rigor la fotografía de esta molestia, postura, condición en la piel (ej. resequedad, talones agrietados, verrugas, tono irregular), cabello o producto de salud.
Responde EXCLUSIVAMENTE con un objeto JSON válido con la siguiente estructura:

{
  "title": "Título conciso y respetuoso de la molestia o condición (ej. 'Resequedad y descamación en talones', 'Frizz y cutícula abierta en cabello ondulado', 'Tensión cervical postural')",
  "category": "pain_posture" | "aesthetic_skin" | "metabolism" | "general",
  "bodyZone": "Espalda baja / Lumbar" | "Tobillo / Pie" | "Rodillas / Piernas" | "Cuello / Cervicales" | "Hombros / Trapecios" | "Muñecas / Manos" | "Rostro / Mandíbula (ATM)" | "Piel (Talones / Manos / Cuerpo)" | "Cabello & Cuero cabelludo" | "Abdomen / Zona Digestiva" | "Otra zona corporal",
  "notes": "Descripción objetiva de las características visuales (textura, enrojecimiento, descamación, postura) para orientar el registro"
}
`;

  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      const parsed = JSON.parse(cleaned);
      if (parsed.title) {
        return {
          title: parsed.title,
          category: parsed.category || 'aesthetic_skin',
          bodyZone: parsed.bodyZone || 'Piel (Talones / Manos / Cuerpo)',
          notes: parsed.notes || ''
        };
      }
    } catch (err) {
      console.warn(`Health image analysis with ${model} failed:`, err.message);
    }
  }

  throw new Error('No se pudo analizar la foto médica/estética con Gemini.');
};

/**
 * Offline / Heuristic fallback for Copilot Routine and Lifestyle Parser
 */
export const generateFallbackCopilotResponse = (userText = '') => {
  const lower = userText.toLowerCase();

  // Skincare Matrix (Retinol, Concha Nácar, Máscara LED, Mascarilla de Arroz)
  if (/skincare|retinol|concha n|teatrical|m[aá]scara led|arroz|activo|facial/.test(lower)) {
    return {
      replyText: `### 🌸 Estrategia de Skincare y Frecuencias No Diarias

He analizado tu protocolo para optimizar la renovación celular y evitar sobreexposición o irritación de la barrera cutánea:

1. **Matriz de Activos Nocturnos (Alternancia Segura):**
   - **Noche A (Renovación & Colágeno):** Aplicar **Retinol Facial** sobre piel completamente seca.
   - **Noche B (Aclarado & Nutrición):** Aplicar **Concha Nácar + Teatrical Aclaradora** para despigmentar e hidratar.
   - *Regla de oro:* No encimar retinol y concha nácar la misma noche para proteger el manto lipídico.

2. **Fototerapia con Máscara LED Roja:**
   - **Frecuencia:** 3 a 4 veces por semana (días alternos).
   - **Duración:** 10 a 15 minutos en piel limpia antes de los activos densos. Estimula la síntesis de colágeno y calma la inflamación.

3. **Mascarilla Coreana de Arroz:**
   - **Frecuencia:** Un día sí, un día no (intervalo de 2 días) para unificar el tono y luminosidad sin saturar los poros.

---

A continuación tienes las **tarjetas de acciones automáticas** para integrar todo a tus módulos con un solo clic:`,
      actions: {
        products: [
          { name: 'Serum de Retinol Facial 0.3% - 0.5%', category: 'Skincare', notes: 'Uso nocturno días alternos para renovación celular.' },
          { name: 'Crema Concha Nácar Natural', category: 'Skincare', notes: 'Activo despigmentante para tono uniforme.' },
          { name: 'Crema Aclaradora Teatrical con Células Madre', category: 'Skincare', notes: 'Hidratación y sellado nocturno en noches sin retinol.' },
          { name: 'Máscara Facial LED de Luz Roja', category: 'Skincare', notes: 'Terapia de colágeno y fotorejuvenecimiento 3-4x/semana.' },
          { name: 'Mascarilla Coreana de Extracto de Arroz', category: 'Skincare', notes: 'Hidratación profunda e iluminación día por medio.' }
        ],
        selfCare: [
          {
            title: 'Fototerapia con Máscara LED Roja (12 min)',
            frequency: 'custom',
            daysInterval: 2,
            category: 'skincare',
            notes: 'Sesión de luz roja 10-15 min sobre piel limpia para estimulación de colágeno.',
            protocol: 'Usar 3 a 4 veces por semana en días alternos.'
          },
          {
            title: 'Mascarilla Coreana de Arroz (Iluminación & Tono)',
            frequency: 'custom',
            daysInterval: 2,
            category: 'skincare',
            notes: 'Aplicar durante 15 minutos un día sí y un día no.',
            protocol: 'Cadencia día por medio para mantener la barrera cutánea radiante.'
          },
          {
            title: 'Noche de Retinol (Renovación Celular)',
            frequency: 'custom',
            daysInterval: 2,
            category: 'skincare',
            notes: 'Aplicar capa fina de retinol de noche sobre piel seca.',
            protocol: 'Alternar con noches de Concha Nácar.'
          },
          {
            title: 'Noche de Concha Nácar + Teatrical Aclaradora',
            frequency: 'custom',
            daysInterval: 2,
            category: 'skincare',
            notes: 'Masaje facial aclarador e hidratación profunda.',
            protocol: 'Uso nocturno en días sin retinol.'
          }
        ],
        timers: [
          { name: 'Máscara LED Roja (Terapia Facial)', durationSeconds: 720, category: 'skincare', description: 'Temporizador de 12 minutos para fototerapia facial.' },
          { name: 'Mascarilla Coreana de Arroz', durationSeconds: 900, category: 'skincare', description: 'Temporizador de 15 minutos para absorción de nutrientes.' }
        ],
        schedule: [
          { time: '22:00', title: 'Rutina de Skincare Nocturna & Activos Alternos', tag: 'beauty', isRoutine: true }
        ]
      }
    };
  }

  // General lifestyle parser fallback
  return {
    replyText: `### 🤖 Asistente AURA Copilot

He procesado tu solicitud de estilo de vida: **"${userText}"**.

Aquí tienes el desglose estratégico de acciones para incorporar en tu sistema:
- **Compras recomendadas:** Insumos y productos necesarios para la ejecución.
- **Autocuidado periódico:** Frecuencias no diarias programadas.
- **Temporizadores:** Minutos de aplicación listos para activar.

Haz clic en los botones de abajo para agregar cada elemento a su módulo correspondiente.`,
    actions: {
      products: [
        { name: 'Insumo sugerido para: ' + userText.slice(0, 30), category: 'Skincare', notes: 'Recomendado por AURA Copilot.' }
      ],
      selfCare: [
        {
          title: 'Sesión periódica: ' + userText.slice(0, 35),
          frequency: 'custom',
          daysInterval: 3,
          category: 'skincare',
          notes: 'Protocolo de autocuidado periódico.',
          protocol: 'Realizar cada 3 días según recomendaciones.'
        }
      ],
      timers: [
        { name: 'Temporizador AURA (' + userText.slice(0, 20) + ')', durationSeconds: 600, category: 'custom', description: '10 minutos de enfoque o tratamiento.' }
      ],
      schedule: []
    }
  };
};

/**
 * Intelligent Routine & Lifestyle Parser using Google Gemini
 * Analyzes complex routines, advice or text and returns a conversational explanation
 * alongside structured actionable items (products, self care cadences, timers, schedule blocks).
 * 
 * @param {string} userMessage - Text or routine pasted by user
 * @param {Array} history - Previous chat messages
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<{ replyText: string, actions: { products: Array, selfCare: Array, timers: Array, schedule: Array } }>}
 */
export const parseRoutineWithCopilot = async (userMessage, history = [], apiKey = '') => {
  if (!apiKey || !apiKey.trim()) {
    return generateFallbackCopilotResponse(userMessage);
  }

  const prompt = `
Eres AURA Copilot, el asistente de inteligencia artificial élite de AURA Nexus para Estilo de Vida, Belleza, Skincare, Ergonomía, Productividad y Organización Personal.

La usuaria te ha enviado el siguiente mensaje o rutina para analizar y estructurar:
"${userMessage}"

Tu tarea es doble:
1. "replyText": Escribe una respuesta conversacional, empática, elegante y profesional en Markdown (en español). Explica claramente la estrategia, cómo combinar los activos/hábitos de forma segura (ej. qué días usar retinol vs concha nácar para evitar irritación, cuánto tiempo usar la máscara LED, etc.), y qué beneficios obtendrá.
2. "actions": Extrae de forma estructurada y precisa todos los elementos accionables que la usuaria necesitará para que la aplicación los agregue a sus respectivos módulos con un solo clic.

Responde EXCLUSIVAMENTE con un JSON válido con esta estructura exacta:

{
  "replyText": "Respuesta en markdown con explicaciones claras, pasos y recomendaciones...",
  "actions": {
    "products": [
      {
        "name": "Nombre completo del producto (ej. 'Serum de Retinol Facial 0.3%', 'Crema Concha Nácar Teatrical', 'Máscara LED Roja')",
        "category": "Skincare" | "Dental" | "Higiene" | "Despensa" | "Limpieza" | "Otros",
        "notes": "Para qué sirve o en qué momento de la rutina se usa"
      }
    ],
    "selfCare": [
      {
        "title": "Nombre de la actividad de autocuidado periódico (ej. 'Máscara LED Roja (12 min)', 'Mascarilla Coreana de Arroz (Día sí / Día no)')",
        "frequency": "daily" | "weekly" | "biweekly" | "monthly" | "bimonthly" | "custom",
        "daysInterval": 2,
        "category": "skincare" | "health" | "body" | "hair" | "general",
        "notes": "Instrucciones de uso o precauciones",
        "protocol": "Especificación de cadencia (ej. 'Usar 3 a 4 veces por semana' o 'Un día sí y un día no')"
      }
    ],
    "timers": [
      {
        "name": "Nombre del temporizador (ej. 'Máscara LED Facial', 'Mascarilla de Arroz')",
        "durationSeconds": 720,
        "category": "skincare" | "health" | "custom",
        "description": "Tiempo exacto recomendado"
      }
    ],
    "schedule": [
      {
        "time": "22:00",
        "title": "Rutina de Skincare Nocturna & Activos",
        "tag": "beauty",
        "isRoutine": true
      }
    ]
  }
}
`;

  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.3
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      const parsed = JSON.parse(cleaned);
      if (parsed.replyText) {
        return {
          replyText: parsed.replyText,
          actions: {
            products: Array.isArray(parsed.actions?.products) ? parsed.actions.products : [],
            selfCare: Array.isArray(parsed.actions?.selfCare) ? parsed.actions.selfCare : [],
            timers: Array.isArray(parsed.actions?.timers) ? parsed.actions.timers : [],
            schedule: Array.isArray(parsed.actions?.schedule) ? parsed.actions.schedule : []
          }
        };
      }
    } catch (err) {
      console.warn(`Copilot routine parsing with ${model} failed:`, err.message);
    }
  }

  // Fallback if AI endpoint failed
  return generateFallbackCopilotResponse(userMessage);
};


