import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar el modelo de Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Analiza los resultados de WebPageTest con Gemini
 * @param {Object} data - Datos de WebPageTest
 * @param {string} url - URL analizada
 * @returns {Promise<string>} Análisis generado por Gemini
 */
export const analyzeWithGemini = async (data, url) => {
  try {
    // Preparar los datos para el análisis
    const performanceData = {
      loadTime: data.median.firstView.loadTime,
      speedIndex: data.median.firstView.SpeedIndex,
      ttfb: data.median.firstView.TTFB,
      lighthouseScore: data.lighthouseResult ? {
        performance: Math.round(data.lighthouseResult.categories.performance.score * 100),
        accessibility: Math.round(data.lighthouseResult.categories.accessibility.score * 100),
        bestPractices: Math.round(data.lighthouseResult.categories['best-practices'].score * 100),
        seo: Math.round(data.lighthouseResult.categories.seo.score * 100)
      } : null,
      technologies: data.technologies || []
    };

    // Crear el prompt para Gemini
    const prompt = `
      Analiza los siguientes datos de rendimiento web para la URL: ${url}
      
      Datos de rendimiento:
      - Tiempo de carga: ${performanceData.loadTime}ms
      - Speed Index: ${performanceData.speedIndex}ms
      - TTFB (Time to First Byte): ${performanceData.ttfb}ms
      
      ${performanceData.lighthouseScore ? `
      Puntuaciones Lighthouse:
      - Rendimiento: ${performanceData.lighthouseScore.performance}/100
      - Accesibilidad: ${performanceData.lighthouseScore.accessibility}/100
      - Buenas prácticas: ${performanceData.lighthouseScore.bestPractices}/100
      - SEO: ${performanceData.lighthouseScore.seo}/100
      ` : ''}
      
      ${performanceData.technologies.length > 0 ? `
      Tecnologías detectadas:
      ${performanceData.technologies.map(tech => `- ${tech.name}`).join('\n')}
      ` : ''}
      
      Por favor, proporciona un análisis detallado que incluya:
      1. Un resumen general del rendimiento
      2. Problemas identificados
      3. Recomendaciones para mejorar
      4. Acciones prioritarias
      
      Formato el análisis de manera que sea fácil de leer y entender para un usuario no técnico.
    `;

    // Generar el análisis con Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error al analizar con Gemini:', error);
    return 'No se pudo generar el análisis con IA debido a un error.';
  }
};

/**
 * Analiza los resultados del sitemap con Gemini
 * @param {Object} data - Datos del sitemap
 * @returns {Promise<Object>} Análisis generado por Gemini
 */
export const analyzeSitemapWithGemini = async (data) => {
  try {
    // Crear el prompt para Gemini
    const prompt = `
      Analiza los siguientes datos de sitemap:
      
      Estadísticas generales:
      - Total de URLs: ${data.totalUrls}
      - URLs válidas: ${data.validUrls}
      - URLs inválidas: ${data.invalidUrls}
      
      Tipo de sitemap: ${data.type}
      ${data.type === 'sitemap_index.xml' ? `Número de sitemaps: ${data.sitemapCount}` : ''}
      
      ${data.lastmod ? `Última modificación: ${data.lastmod}` : ''}
      
      ${data.images ? `
      Imágenes:
      - Total de imágenes: ${data.images.total}
      - URLs con imágenes: ${data.images.urlsWithImages}
      ` : ''}
      
      ${data.videos ? `
      Videos:
      - Total de videos: ${data.videos.total}
      - URLs con videos: ${data.videos.urlsWithVideos}
      ` : ''}
      
      ${data.localization && data.localization.hasAlternates ? `
      Localización:
      - URLs con alternativas: ${data.localization.urlsWithAlternates}
      - Idiomas disponibles: ${Object.keys(data.localization.languages).join(', ')}
      ` : ''}
      
      Por favor, proporciona un análisis detallado que incluya:
      1. Un resumen general del sitemap
      2. Problemas identificados
      3. Recomendaciones para mejorar
      4. Acciones prioritarias
      
      Devuelve el análisis en formato JSON con las siguientes claves:
      - summary: Resumen general
      - problems: Array de problemas identificados
      - recommendations: Array de recomendaciones
      - actionItems: Array de acciones prioritarias
    `;

    // Generar el análisis con Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Intentar parsear la respuesta como JSON
    try {
      return JSON.parse(response.text());
    } catch (e) {
      // Si no se puede parsear como JSON, devolver un objeto con el texto
      return {
        summary: response.text(),
        problems: [],
        recommendations: [],
        actionItems: []
      };
    }
  } catch (error) {
    console.error('Error al analizar sitemap con Gemini:', error);
    return {
      summary: 'No se pudo generar el análisis con IA debido a un error.',
      problems: [],
      recommendations: [],
      actionItems: []
    };
  }
};

/**
 * Analiza los metadatos con Gemini
 * @param {Object} data - Datos de metadatos
 * @param {string} url - URL analizada
 * @returns {Promise<Object>} Análisis generado por Gemini
 */
export const analyzeMetadataWithGemini = async (data, url) => {
  try {
    // Crear el prompt para Gemini
    const prompt = `
      Analiza los siguientes metadatos para la URL: ${url}
      
      Título:
      - Contenido: ${data.title || 'No encontrado'}
      - Longitud: ${data.titleLengthStatus.length} caracteres
      - Estado: ${data.titleLengthStatus.isOptimal ? 'Óptimo' : 'No óptimo'}
      - Recomendación: ${data.titleLengthStatus.recommendation}
      
      Descripción:
      - Contenido: ${data.description || 'No encontrado'}
      - Longitud: ${data.descriptionLengthStatus.length} caracteres
      - Estado: ${data.descriptionLengthStatus.isOptimal ? 'Óptimo' : 'No óptimo'}
      - Recomendación: ${data.descriptionLengthStatus.recommendation}
      
      ${data.keywords.length > 0 ? `
      Palabras clave:
      ${data.keywords.map(keyword => `- ${keyword}`).join('\n')}
      - Palabras clave en título: ${data.keywordsInTitle}
      - Palabras clave en descripción: ${data.keywordsInDescription}
      ` : ''}
      
      ${data.hasDuplicates ? 'ADVERTENCIA: Hay contenido duplicado entre el título y la descripción.' : ''}
      
      ${data.canonical ? `URL canónica: ${data.canonical}` : ''}
      
      ${data.hasOpenGraph ? `
      Open Graph:
      - Título: ${data.ogTitle || 'No encontrado'}
      - Descripción: ${data.ogDescription || 'No encontrado'}
      - Imagen: ${data.ogImage || 'No encontrado'}
      ` : 'No se encontraron etiquetas Open Graph.'}
      
      ${data.hasTwitterCards ? `
      Twitter Cards:
      - Título: ${data.twitterTitle || 'No encontrado'}
      - Descripción: ${data.twitterDescription || 'No encontrado'}
      - Imagen: ${data.twitterImage || 'No encontrado'}
      ` : 'No se encontraron etiquetas Twitter Cards.'}
      
      Por favor, proporciona un análisis detallado que incluya:
      1. Un resumen general de los metadatos
      2. Problemas identificados
      3. Recomendaciones para mejorar
      4. Acciones prioritarias
      
      Devuelve el análisis en formato JSON con las siguientes claves:
      - summary: Resumen general
      - problems: Array de problemas identificados
      - recommendations: Array de recomendaciones
      - actionItems: Array de acciones prioritarias
    `;

    // Generar el análisis con Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Intentar parsear la respuesta como JSON
    try {
      return JSON.parse(response.text());
    } catch (e) {
      // Si no se puede parsear como JSON, devolver un objeto con el texto
      return {
        summary: response.text(),
        problems: [],
        recommendations: [],
        actionItems: []
      };
    }
  } catch (error) {
    console.error('Error al analizar metadatos con Gemini:', error);
    return {
      summary: 'No se pudo generar el análisis con IA debido a un error.',
      problems: [],
      recommendations: [],
      actionItems: []
    };
  }
};

/**
 * Analiza los resultados de Lighthouse con Gemini
 * @param {Object} lighthouseData - Datos Lighthouse
 * @param {string} url - URL analizada
 * @returns {Promise<string>} Análisis generado por Gemini
 */
export const analyzeLighthouseWithGemini = async (lighthouseData, url) => {
  try {
    // Preparar el prompt para Gemini
    const prompt = `
      Analiza los siguientes resultados de Lighthouse para la URL: ${url}
      Puntuaciones:
      - Performance: ${lighthouseData.categories?.performance ? Math.round(lighthouseData.categories.performance.score * 100) : 'N/A'}
      - Accesibilidad: ${lighthouseData.categories?.accessibility ? Math.round(lighthouseData.categories.accessibility.score * 100) : 'N/A'}
      - Best Practices: ${lighthouseData.categories?.['best-practices'] ? Math.round(lighthouseData.categories['best-practices'].score * 100) : 'N/A'}
      - SEO: ${lighthouseData.categories?.seo ? Math.round(lighthouseData.categories.seo.score * 100) : 'N/A'}
      - PWA: ${lighthouseData.categories?.pwa ? Math.round(lighthouseData.categories.pwa.score * 100) : 'N/A'}

      Si hay detalles de auditoría, considera también los siguientes puntos:
      ${lighthouseData.audits ? Object.values(lighthouseData.audits).slice(0, 10).map(audit => `- ${audit.title}: ${audit.description} (${audit.score !== undefined ? (audit.score * 100).toFixed(0) + '/100' : 'N/A'})`).join('\n') : ''}

      Por favor, genera el análisis en formato markdown, usando títulos jerárquicos (#, ##, ###) y agrega un emoji relevante al inicio de cada sección:
      1. Un resumen general del rendimiento (usa un emoji de gráfico o check ✅)
      2. Problemas identificados (usa un emoji de advertencia ⚠️)
      3. Recomendaciones para mejorar (usa un emoji de bombilla 💡)
      4. Acciones prioritarias (usa un emoji de cohete 🚀)

      El análisis debe ser claro y fácil de leer para un usuario no técnico. Usa listas y negritas donde ayude a la comprensión.
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error al analizar Lighthouse con Gemini:', error);
    return 'No se pudo generar el análisis con IA debido a un error.';
  }
}; 