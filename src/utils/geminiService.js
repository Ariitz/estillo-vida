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
