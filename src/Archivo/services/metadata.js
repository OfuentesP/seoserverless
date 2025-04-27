import axios from 'axios';

/**
 * Analiza los metadatos de una URL
 * @param {string} url - URL a analizar
 * @returns {Promise<Object>} Resultados del análisis de metadatos
 */
export const analyzeMetadata = async (url) => {
  try {
    // Usar un proxy CORS para evitar problemas de acceso
    const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const html = response.data.contents;
    
    // Extraer metadatos usando expresiones regulares
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)?.[1] || '';
    const keywords = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]*)"[^>]*>/i)?.[1] || '';
    const robots = html.match(/<meta[^>]*name="robots"[^>]*content="([^"]*)"[^>]*>/i)?.[1] || '';
    const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i)?.[1] || '';
    
    // Extraer Open Graph tags
    const ogTags = {};
    const ogMatches = html.matchAll(/<meta[^>]*property="og:([^"]*)"[^>]*content="([^"]*)"[^>]*>/gi);
    for (const match of ogMatches) {
      ogTags[match[1]] = match[2];
    }
    
    // Extraer Twitter Card tags
    const twitterTags = {};
    const twitterMatches = html.matchAll(/<meta[^>]*name="twitter:([^"]*)"[^>]*content="([^"]*)"[^>]*>/gi);
    for (const match of twitterMatches) {
      twitterTags[match[1]] = match[2];
    }
    
    // Analizar longitud del título
    const titleLength = title.length;
    const titleAnalysis = {
      length: titleLength,
      isOptimal: titleLength >= 50 && titleLength <= 60,
      recommendation: titleLength < 50 
        ? 'El título es demasiado corto. Se recomienda entre 50-60 caracteres.'
        : titleLength > 60
          ? 'El título es demasiado largo. Se recomienda entre 50-60 caracteres.'
          : 'La longitud del título es óptima.'
    };
    
    // Analizar longitud de la descripción
    const descriptionLength = description.length;
    const descriptionAnalysis = {
      length: descriptionLength,
      isOptimal: descriptionLength >= 150 && descriptionLength <= 160,
      recommendation: descriptionLength < 150
        ? 'La descripción es demasiado corta. Se recomienda entre 150-160 caracteres.'
        : descriptionLength > 160
          ? 'La descripción es demasiado larga. Se recomienda entre 150-160 caracteres.'
          : 'La longitud de la descripción es óptima.'
    };
    
    // Verificar duplicados entre título y descripción
    const duplicateWords = findDuplicateWords(title, description);
    const duplicateAnalysis = {
      hasDuplicates: duplicateWords.length > 0,
      duplicateWords,
      recommendation: duplicateWords.length > 0
        ? 'Se encontraron palabras duplicadas entre el título y la descripción. Considere reescribir para mejorar la relevancia.'
        : 'No se encontraron duplicados significativos entre el título y la descripción.'
    };
    
    // Contar palabras clave en título y descripción
    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
    const keywordAnalysis = {
      totalKeywords: keywordList.length,
      keywordsInTitle: keywordList.filter(k => title.toLowerCase().includes(k)).length,
      keywordsInDescription: keywordList.filter(k => description.toLowerCase().includes(k)).length,
      recommendation: keywordList.length === 0
        ? 'No se encontraron palabras clave definidas.'
        : 'Se encontraron palabras clave y se analizó su presencia en el título y la descripción.'
    };
    
    return {
      title,
      description,
      keywords,
      robots,
      canonical,
      ogTags,
      twitterTags,
      titleAnalysis,
      descriptionAnalysis,
      duplicateAnalysis,
      keywordAnalysis
    };
  } catch (error) {
    console.error('Error al analizar metadatos:', error);
    throw new Error(`Error al analizar metadatos: ${error.message}`);
  }
};

/**
 * Encuentra palabras duplicadas entre dos textos
 * @param {string} text1 - Primer texto
 * @param {string} text2 - Segundo texto
 * @returns {Array} Lista de palabras duplicadas
 */
const findDuplicateWords = (text1, text2) => {
  const words1 = text1.toLowerCase().match(/\b\w+\b/g) || [];
  const words2 = text2.toLowerCase().match(/\b\w+\b/g) || [];
  const duplicates = new Set();
  
  for (const word of words1) {
    if (words2.includes(word) && word.length > 3) {
      duplicates.add(word);
    }
  }
  
  return Array.from(duplicates);
}; 