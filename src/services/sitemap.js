import axios from 'axios';
import { parseStringPromise } from 'xml2js';

/**
 * Analiza el sitemap de un sitio web
 * @param {string} url - URL del sitio web a analizar
 * @returns {Promise<Object>} Resultados del análisis del sitemap
 */
export const analyzeSitemap = async (url) => {
  try {
    // Normalizar la URL para obtener la base
    const baseUrl = new URL(url).origin;
    
    // Intentar obtener el sitemap.xml
    let sitemapUrl = `${baseUrl}/sitemap.xml`;
    let sitemapContent;
    let type = 'sitemap.xml';
    
    try {
      // Usar un proxy CORS para evitar problemas de acceso
      const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(sitemapUrl)}`);
      sitemapContent = response.data.contents;
    } catch (error) {
      console.warn(`No se pudo acceder a ${sitemapUrl} directamente:`, error.message);
      
      // Si no se encuentra sitemap.xml, intentar con sitemap_index.xml
      sitemapUrl = `${baseUrl}/sitemap_index.xml`;
      try {
        const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(sitemapUrl)}`);
        sitemapContent = response.data.contents;
        type = 'sitemap_index.xml';
      } catch (innerError) {
        throw new Error('No se pudo encontrar un sitemap válido');
      }
    }
    
    // Parsear el XML
    const parsedXml = await parseStringPromise(sitemapContent);
    
    // Inicializar variables para almacenar datos
    let urls = [];
    let sitemapCount = 0;
    let lastmod = null;
    let images = { total: 0, urlsWithImages: 0 };
    let videos = { total: 0, urlsWithVideos: 0 };
    let localization = { hasAlternates: false, urlsWithAlternates: 0, languages: {} };
    
    // Procesar según el tipo de sitemap
    if (type === 'sitemap_index.xml' && parsedXml.sitemapindex) {
      // Procesar sitemap index
      const sitemaps = parsedXml.sitemapindex.sitemap || [];
      sitemapCount = sitemaps.length;
      
      // Procesar cada sitemap en el índice
      for (const sitemap of sitemaps) {
        const loc = sitemap.loc[0];
        const lastmodValue = sitemap.lastmod ? sitemap.lastmod[0] : null;
        
        if (!lastmod || (lastmodValue && new Date(lastmodValue) > new Date(lastmod))) {
          lastmod = lastmodValue;
        }
        
        try {
          const subResponse = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(loc)}`);
          const subParsedXml = await parseStringPromise(subResponse.data.contents);
          if (subParsedXml.urlset && subParsedXml.urlset.url) {
            const subUrls = subParsedXml.urlset.url;
            subUrls.forEach(url => {
              const urlData = processUrl(url);
              urls.push(urlData);
              updateStats(urlData, images, videos, localization);
            });
          }
        } catch (error) {
          console.error(`Error al procesar sub-sitemap ${loc}:`, error);
        }
      }
    } else if (parsedXml.urlset) {
      // Procesar sitemap normal
      const urlset = parsedXml.urlset.url || [];
      
      urlset.forEach(url => {
        const urlData = processUrl(url);
        urls.push(urlData);
        updateStats(urlData, images, videos, localization);
      });
      
      // Obtener última modificación
      if (urlset.length > 0 && urlset[0].lastmod) {
        lastmod = urlset[0].lastmod[0];
      }
    }
    
    // Validar URLs
    const validationResults = await validateUrls(urls);
    
    // Calcular estadísticas
    const totalUrls = urls.length;
    const validUrls = validationResults.validUrls.length;
    const invalidUrls = validationResults.invalidUrls.length;
    
    // Agrupar errores por tipo
    const errorTypes = {};
    validationResults.invalidUrls.forEach(url => {
      const status = url.status || 'unknown';
      errorTypes[status] = (errorTypes[status] || 0) + 1;
    });
    
    // Calcular distribución de prioridades
    const priorities = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    urls.forEach(url => {
      const priority = parseFloat(url.priority) || 0;
      if (priority >= 0.8) priorities.high++;
      else if (priority >= 0.4) priorities.medium++;
      else priorities.low++;
    });
    
    // Calcular distribución de frecuencias de cambio
    const changefreq = {};
    urls.forEach(url => {
      const freq = url.changefreq || 'unknown';
      changefreq[freq] = (changefreq[freq] || 0) + 1;
    });
    
    return {
      type,
      sitemapCount,
      totalUrls,
      validUrls,
      invalidUrls,
      lastmod,
      images,
      videos,
      localization,
      errorTypes,
      priorities,
      changefreq,
      urls: validationResults.validUrls
    };
  } catch (error) {
    console.error('Error al analizar sitemap:', error);
    throw new Error(`Error al analizar sitemap: ${error.message}`);
  }
};

/**
 * Procesa una URL del sitemap
 * @param {Object} url - Objeto URL del sitemap
 * @returns {Object} URL procesada
 */
const processUrl = (url) => {
  const result = {
    loc: url.loc[0],
    lastmod: url.lastmod ? url.lastmod[0] : null,
    changefreq: url.changefreq ? url.changefreq[0] : null,
    priority: url.priority ? url.priority[0] : null
  };
  
  // Procesar imágenes
  if (url['image:image']) {
    result.images = url['image:image'].map(img => ({
      loc: img['image:loc'] ? img['image:loc'][0] : null,
      title: img['image:title'] ? img['image:title'][0] : null,
      caption: img['image:caption'] ? img['image:caption'][0] : null
    }));
  }
  
  // Procesar videos
  if (url['video:video']) {
    result.videos = url['video:video'].map(video => ({
      thumbnail: video['video:thumbnail_loc'] ? video['video:thumbnail_loc'][0] : null,
      title: video['video:title'] ? video['video:title'][0] : null,
      description: video['video:description'] ? video['video:description'][0] : null
    }));
  }
  
  // Procesar alternativas de idioma
  if (url['xhtml:link']) {
    result.alternates = url['xhtml:link']
      .filter(link => link.$.rel === 'alternate')
      .map(link => ({
        href: link.$.href,
        hreflang: link.$.hreflang
      }));
  }
  
  return result;
};

/**
 * Actualiza las estadísticas con los datos de una URL
 * @param {Object} urlData - Datos de la URL
 * @param {Object} images - Estadísticas de imágenes
 * @param {Object} videos - Estadísticas de videos
 * @param {Object} localization - Estadísticas de localización
 */
const updateStats = (urlData, images, videos, localization) => {
  // Actualizar estadísticas de imágenes
  if (urlData.images && urlData.images.length > 0) {
    images.total += urlData.images.length;
    images.urlsWithImages++;
  }
  
  // Actualizar estadísticas de videos
  if (urlData.videos && urlData.videos.length > 0) {
    videos.total += urlData.videos.length;
    videos.urlsWithVideos++;
  }
  
  // Actualizar estadísticas de localización
  if (urlData.alternates && urlData.alternates.length > 0) {
    localization.hasAlternates = true;
    localization.urlsWithAlternates++;
    
    urlData.alternates.forEach(alt => {
      if (alt.hreflang) {
        localization.languages[alt.hreflang] = (localization.languages[alt.hreflang] || 0) + 1;
      }
    });
  }
};

/**
 * Valida las URLs del sitemap
 * @param {Array} urls - Lista de URLs a validar
 * @returns {Promise<Object>} Resultados de la validación
 */
const validateUrls = async (urls) => {
  const validUrls = [];
  const invalidUrls = [];
  
  // Limitar a 50 URLs para no sobrecargar
  const urlsToValidate = urls.slice(0, 50);
  
  for (const url of urlsToValidate) {
    try {
      // Usar un proxy CORS para evitar problemas de acceso
      const response = await axios.get(`https://api.allorigins.win/head?url=${encodeURIComponent(url.loc)}`, { timeout: 5000 });
      if (response.status >= 200 && response.status < 400) {
        validUrls.push(url);
      } else {
        invalidUrls.push({ ...url, status: response.status });
      }
    } catch (error) {
      invalidUrls.push({ ...url, status: error.response?.status || 'error' });
    }
  }
  
  return { validUrls, invalidUrls };
}; 