import axios from 'axios';
import { parseString } from 'xml2js';
import { analyzeSitemapWithPlaywright } from './sitemapAnalyzer.js';
import { analyzeSitemapWithGemini } from './gemini.js';

// Cache para almacenar resultados de análisis
const analysisCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

/**
 * Analiza el sitemap de un sitio web
 * @param {string} url - URL del sitio a analizar
 * @returns {Promise<Object>} - Resultados del análisis
 */
export async function analyzeSitemap(url) {
  console.log(`[sitemap] 🚀 Iniciando análisis de sitemap para: ${url}`);
  
  // Verificar caché
  const cachedResult = getCachedResult(url);
  if (cachedResult) {
    console.log(`[sitemap] ✅ Usando resultado en caché para: ${url}`);
    return cachedResult;
  }
  
  try {
    // Normalizar URL
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    console.log(`[sitemap] 🔍 URL base normalizada: ${baseUrl}`);
    
    // Intentar acceder al sitemap.xml
    console.log(`[sitemap] 🔍 Intentando acceder a sitemap.xml...`);
    let sitemapContent;
    try {
      const response = await axios.get(`${baseUrl}/sitemap.xml`, {
        timeout: 15000, // Aumentar timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Aceptar códigos 2xx y 3xx, pero también 4xx para manejar errores
        }
      });
      
      if (response.status >= 400) {
        console.log(`[sitemap] ⚠️ Respuesta con código de error: ${response.status}`);
        throw new Error(`Respuesta con código de error: ${response.status}`);
      }
      
      sitemapContent = response.data;
      console.log(`[sitemap] ✅ sitemap.xml encontrado`);
    } catch (error) {
      console.log(`[sitemap] ⚠️ No se pudo acceder a sitemap.xml: ${error.message}`);
      
      // Intentar con sitemap_index.xml
      console.log(`[sitemap] 🔍 Intentando acceder a sitemap_index.xml...`);
      try {
        const response = await axios.get(`${baseUrl}/sitemap_index.xml`, {
          timeout: 15000, // Aumentar timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        });
        
        if (response.status >= 400) {
          console.log(`[sitemap] ⚠️ Respuesta con código de error: ${response.status}`);
          throw new Error(`Respuesta con código de error: ${response.status}`);
        }
        
        sitemapContent = response.data;
        console.log(`[sitemap] ✅ sitemap_index.xml encontrado`);
      } catch (error) {
        console.log(`[sitemap] ⚠️ No se pudo acceder a sitemap_index.xml: ${error.message}`);
        
        // Intentar con robots.txt
        console.log(`[sitemap] 🔍 Intentando acceder a robots.txt...`);
        try {
          const response = await axios.get(`${baseUrl}/robots.txt`, {
            timeout: 15000, // Aumentar timeout
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            validateStatus: function (status) {
              return status >= 200 && status < 500;
            }
          });
          
          if (response.status >= 400) {
            console.log(`[sitemap] ⚠️ Respuesta con código de error: ${response.status}`);
            throw new Error(`Respuesta con código de error: ${response.status}`);
          }
          
          const robotsContent = response.data;
          const sitemapMatch = robotsContent.match(/Sitemap: (.*)/i);
          if (sitemapMatch) {
            const sitemapUrl = sitemapMatch[1];
            console.log(`[sitemap] 🔍 Sitemap encontrado en robots.txt: ${sitemapUrl}`);
            const sitemapResponse = await axios.get(sitemapUrl, {
              timeout: 15000, // Aumentar timeout
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              validateStatus: function (status) {
                return status >= 200 && status < 500;
              }
            });
            
            if (sitemapResponse.status >= 400) {
              console.log(`[sitemap] ⚠️ Respuesta con código de error: ${sitemapResponse.status}`);
              throw new Error(`Respuesta con código de error: ${sitemapResponse.status}`);
            }
            
            sitemapContent = sitemapResponse.data;
            console.log(`[sitemap] ✅ Sitemap encontrado en robots.txt accedido correctamente`);
          } else {
            console.log(`[sitemap] ⚠️ No se encontró Sitemap en robots.txt`);
            throw new Error('No se encontró Sitemap en robots.txt');
          }
        } catch (error) {
          console.log(`[sitemap] ⚠️ No se pudo acceder a robots.txt: ${error.message}`);
          throw new Error('No se pudo acceder a robots.txt');
        }
      }
    }
    
    // Parsear el contenido XML
    console.log(`[sitemap] 🔄 Parseando contenido XML...`);
    const result = await new Promise((resolve, reject) => {
      parseString(sitemapContent, { explicitArray: false }, (err, result) => {
        if (err) {
          console.error(`[sitemap] ❌ Error parseando XML: ${err.message}`);
          return reject(err);
        }
        resolve(result);
      });
    });
    
    // Procesar el sitemap
    console.log(`[sitemap] 🔄 Procesando sitemap...`);
    const processedResult = await processSitemap(result, baseUrl);
    
    // Analizar con Gemini
    console.log(`[sitemap] 🔄 Analizando con Gemini...`);
    try {
      const geminiAnalysis = await analyzeSitemapWithGemini(processedResult);
      processedResult.insights = geminiAnalysis;
    } catch (geminiError) {
      console.error(`[sitemap] ⚠️ Error al analizar con Gemini: ${geminiError.message}`);
      processedResult.insights = {
        summary: "No se pudo generar el análisis con IA debido a un error.",
        problems: [],
        recommendations: [],
        actionItems: []
      };
    }
    
    // Almacenar en caché
    cacheResult(url, processedResult);
    
    console.log(`[sitemap] ✅ Análisis completado`);
    return processedResult;
  } catch (error) {
    console.error(`[sitemap] ❌ Error en el análisis: ${error.message}`);
    console.error(`[sitemap] 🔍 Stack trace: ${error.stack}`);
    
    // Intentar con Playwright como fallback
    console.log(`[sitemap] 🔄 Intentando análisis con Playwright como fallback...`);
    try {
      const playwrightResult = await analyzeSitemapWithPlaywright(url);
      
      // Analizar con Gemini
      console.log(`[sitemap] 🔄 Analizando resultados de Playwright con Gemini...`);
      try {
        const geminiAnalysis = await analyzeSitemapWithGemini(playwrightResult);
        playwrightResult.insights = geminiAnalysis;
      } catch (geminiError) {
        console.error(`[sitemap] ⚠️ Error al analizar con Gemini: ${geminiError.message}`);
        playwrightResult.insights = {
          summary: "No se pudo generar el análisis con IA debido a un error.",
          problems: [],
          recommendations: [],
          actionItems: []
        };
      }
      
      // Almacenar en caché
      cacheResult(url, playwrightResult);
      
      console.log(`[sitemap] ✅ Análisis con Playwright completado`);
      return playwrightResult;
    } catch (playwrightError) {
      console.error(`[sitemap] ❌ Error en el análisis con Playwright: ${playwrightError.message}`);
      console.error(`[sitemap] 🔍 Stack trace: ${playwrightError.stack}`);
      
      // Devolver un resultado mínimo en caso de error
      const errorResult = {
        type: 'error',
        sitemapCount: 0,
        totalUrls: 0,
        total404: 0,
        lastmod: null,
        problems: [{
          title: 'Error de análisis',
          description: `No se pudo analizar el sitemap: ${error.message}`
        }],
        insights: {
          summary: "No se pudo analizar el sitemap debido a errores de conexión o acceso.",
          problems: ["Error de conexión o acceso al sitio"],
          recommendations: ["Verificar que el sitio esté accesible", "Comprobar la conexión a internet"],
          actionItems: ["Reintentar el análisis más tarde"]
        }
      };
      
      // Almacenar en caché para evitar reintentos inmediatos
      cacheResult(url, errorResult);
      
      return errorResult;
    }
  }
}

/**
 * Procesa el resultado del sitemap
 * @param {Object} result - Resultado parseado del XML
 * @param {string} baseUrl - URL base del sitio
 * @returns {Promise<Object>} - Resultado procesado
 */
async function processSitemap(result, baseUrl) {
  console.log(`[sitemap] 🔄 Procesando sitemap...`);
  
  let urls = [];
  let sitemapCount = 0;
  
  // Procesar sitemap index
  if (result.sitemapindex && result.sitemapindex.sitemap) {
    console.log(`[sitemap] 📊 Procesando sitemap index...`);
    const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
      ? result.sitemapindex.sitemap 
      : [result.sitemapindex.sitemap];
    
    sitemapCount = sitemaps.length;
    console.log(`[sitemap] 📊 Sitemaps encontrados: ${sitemapCount}`);
    
    // Procesar cada sitemap
    for (const sitemap of sitemaps) {
      console.log(`[sitemap] 🔍 Procesando sitemap: ${sitemap.loc}`);
      try {
        const response = await axios.get(sitemap.loc, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const sitemapResult = await new Promise((resolve, reject) => {
          parseString(response.data, { explicitArray: false }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
        
        if (sitemapResult.urlset && sitemapResult.urlset.url) {
          const sitemapUrls = Array.isArray(sitemapResult.urlset.url) 
            ? sitemapResult.urlset.url 
            : [sitemapResult.urlset.url];
          
          urls = urls.concat(sitemapUrls);
          console.log(`[sitemap] ✅ URLs añadidas de sitemap: ${sitemapUrls.length}`);
        }
      } catch (error) {
        console.log(`[sitemap] ⚠️ Error procesando sitemap ${sitemap.loc}: ${error.message}`);
      }
    }
  }
  
  // Procesar urlset
  if (result.urlset && result.urlset.url) {
    console.log(`[sitemap] 📊 Procesando urlset...`);
    const urlsetUrls = Array.isArray(result.urlset.url) 
      ? result.urlset.url 
      : [result.urlset.url];
    
    urls = urls.concat(urlsetUrls);
    console.log(`[sitemap] ✅ URLs añadidas de urlset: ${urlsetUrls.length}`);
  }
  
  // Procesar URLs
  console.log(`[sitemap] 🔄 Procesando ${urls.length} URLs...`);
  const processedUrls = await Promise.all(urls.map(async url => {
    try {
      // Verificar si la URL es válida
      const isValid = await validateUrl(url.loc);
      console.log(`[sitemap] 🔍 URL ${url.loc} es ${isValid ? 'válida' : 'inválida'}`);
      
      return {
        loc: url.loc,
        lastmod: url.lastmod || null,
        changefreq: url.changefreq || null,
        priority: url.priority || null,
        status: isValid ? 'OK' : 'Error'
      };
    } catch (error) {
      console.log(`[sitemap] ⚠️ Error procesando URL ${url.loc}: ${error.message}`);
      return {
        loc: url.loc,
        lastmod: url.lastmod || null,
        changefreq: url.changefreq || null,
        priority: url.priority || null,
        status: 'Error'
      };
    }
  }));
  
  // Calcular estadísticas
  console.log(`[sitemap] 📊 Calculando estadísticas...`);
  const stats = {
    total: processedUrls.length,
    valid: processedUrls.filter(url => url.status === 'OK').length,
    invalid: processedUrls.filter(url => url.status === 'Error').length,
    validated: processedUrls.length,
    skipped: 0
  };
  
  console.log(`[sitemap] ✅ Procesamiento completado`);
  const totalUrls = urls.length;
  const total404 = urls.filter(u => u.status === 404).length;
  const lastmod = processedUrls.length > 0 ? processedUrls[0].lastmod : null;
  return {
    type: 'sitemap.xml',
    sitemapCount,
    totalUrls,
    total404,
    lastmod
  };
}

/**
 * Valida una URL
 * @param {string} url - URL a validar
 * @returns {Promise<boolean>} - true si la URL es válida
 */
async function validateUrl(url) {
  console.log(`[sitemap] 🔍 Validando URL: ${url}`);
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const isValid = response.status >= 200 && response.status < 400;
    console.log(`[sitemap] ✅ URL ${url} - Status: ${response.status} - Válida: ${isValid}`);
    return isValid;
  } catch (error) {
    console.log(`[sitemap] ❌ URL ${url} - Error: ${error.message}`);
    return false;
  }
}

/**
 * Obtiene un resultado en caché si existe y no ha expirado
 * @param {string} url - URL para la que buscar en caché
 * @returns {Object|null} - Resultado en caché o null si no existe o ha expirado
 */
function getCachedResult(url) {
  const cached = analysisCache.get(url);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    console.log(`[sitemap] ⏳ Caché expirado para: ${url}`);
    analysisCache.delete(url);
    return null;
  }
  
  return cached.data;
}

/**
 * Almacena un resultado en caché
 * @param {string} url - URL para la que almacenar en caché
 * @param {Object} data - Datos a almacenar
 */
function cacheResult(url, data) {
  analysisCache.set(url, {
    data,
    timestamp: Date.now()
  });
  console.log(`[sitemap] 💾 Resultado almacenado en caché para: ${url}`);
} 