import express from 'express';
import { analyzeSitemap } from '../../services/sitemap.js';
import * as cheerio from 'cheerio';
import axios from 'axios';
import corevitalsRouter from './corevitals.js';

const router = express.Router();

// Función de logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// Estado temporal de los análisis
const analysisStatus = new Map();

// ---------------- RUTAS DE WEBPAGETEST ----------------

// Iniciar test de WebPageTest
router.post('/webpagetest/run', async (req, res) => {
  try {
    const { url, lighthouse = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    log(`[info] Iniciando test para URL: ${url}, lighthouse: ${lighthouse}`);

    // Construir los parámetros para la API legacy
    const params = new URLSearchParams();
    params.append('url', url);
    params.append('f', 'json');
    params.append('runs', '1');
    params.append('location', 'Dulles:Chrome');
    params.append('video', '1');
    params.append('web_vitals', '1');
    params.append('lighthouse', lighthouse ? '1' : '0');

    const response = await fetch('https://www.webpagetest.org/runtest.php', {
      method: 'POST',
      headers: {
        'X-WPT-API-KEY': process.env.WPT_API_KEY
      },
      body: params
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      log(`❌ Error parseando respuesta: ${responseText}`, 'error');
      return res.status(500).json({
        error: 'Error parseando respuesta de WebPageTest',
        details: responseText
      });
    }

    if (!response.ok) {
      log(`❌ Error de WebPageTest (runtest): ${response.status} – ${JSON.stringify(result)}`, 'error');
      return res.status(response.status).json({
        error: 'Error iniciando el test',
        details: result
      });
    }

    const testId = result.data?.testId;
    if (!testId) {
      throw new Error('No se recibió testId en la respuesta de runtest');
    }

    // Guardar estado inicial
    analysisStatus.set(testId, {
      timestamp: Date.now(),
      status: 'pending',
      resumen: null
    });

    log(`[info] Test iniciado correctamente: ${testId}`);
    return res.json({
      success: true,
      testId,
      resumen: { detalles: result.data.summary || result.data.userUrl },
      status: 'pending'
    });

  } catch (error) {
    log(`❌ Error inesperado en /webpagetest/run: ${error.message}`, 'error');
    return res.status(500).json({
      error: 'Error interno ejecutando test',
      details: error.message
    });
  }
});

// Obtener resultados de WebPageTest
router.get('/webpagetest/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      return res.status(400).json({ error: 'Test ID is required' });
    }

    log(`[info] Obteniendo resultados para test ID: ${testId}`);

    // Construir los parámetros para la API legacy
    const params = new URLSearchParams({
      test: testId,
      f: 'json'
    });

    const url = `https://www.webpagetest.org/jsonResult.php?${params}`;
    log(`[debug] URL de WebPageTest: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-WPT-API-KEY': process.env.WPT_API_KEY,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    log(`[debug] Respuesta de WebPageTest: ${response.status} ${response.statusText}`);
    log(`[debug] Headers de respuesta: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

    const responseText = await response.text();
    log(`[debug] Contenido de la respuesta: ${responseText.substring(0, 200)}...`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      log(`❌ Error parseando respuesta: ${responseText}`, 'error');
      return res.status(500).json({
        error: 'Error parseando respuesta de WebPageTest',
        details: responseText
      });
    }

    if (!response.ok) {
      log(`❌ Error obteniendo resultados: ${response.status}`, 'error');
      return res.status(response.status).json({
        error: 'Error obteniendo resultados',
        details: data
      });
    }

    // Si el test aún está en proceso
    if (data.statusCode === 100) {
      log(`[info] Test en progreso: ${testId}`);
      return res.json({
        success: true,
        testId,
        status: 'pending',
        message: 'Test still running'
      });
    }

    // Si el test está completo
    if (data.statusCode === 200) {
      // Verificar que tenemos los datos necesarios
      if (!data.data?.runs?.['1']?.firstView) {
        log(`❌ Datos incompletos en la respuesta: ${JSON.stringify(data)}`, 'error');
        return res.status(500).json({
          error: 'Datos incompletos en la respuesta de WebPageTest',
          details: data
        });
      }

      // Extraer métricas
      const fv = data.data.runs['1'].firstView;
      log(`[debug] FirstView data COMPLETO:`, JSON.stringify(data.data, null, 2));
      log(`[debug] Estructura de datos completa:`, {
        hasData: !!data.data,
        hasRuns: !!data.data?.runs,
        hasRun1: !!data.data?.runs?.['1'],
        hasFirstView: !!data.data?.runs?.['1']?.firstView,
        firstViewKeys: Object.keys(fv || {})
      });

      // Extracción robusta de LCP
      let lcp = fv.LCP || fv.largestContentfulPaint || fv.largest_contentful_paint;
      let lcpSource = 'direct';
      if (!lcp && Array.isArray(fv.chromeUserTiming)) {
        const lcpTiming = fv.chromeUserTiming.find(t => t.name === 'LargestContentfulPaint');
        if (lcpTiming) {
          lcp = lcpTiming.time;
          lcpSource = 'chromeUserTiming';
        }
      }
      if (!lcp && fv['chromeUserTiming.LargestContentfulPaint']) {
        lcp = fv['chromeUserTiming.LargestContentfulPaint'];
        lcpSource = 'chromeUserTiming.LargestContentfulPaint';
      }
      if (!lcp && Array.isArray(fv.largestPaints) && fv.largestPaints.length > 0) {
        lcp = fv.largestPaints[0].time;
        lcpSource = 'largestPaints[0]';
      }
      log(`[debug] LCP extraído: ${lcp} (fuente: ${lcpSource})`);

      // Extracción robusta de CLS
      let cls = null;
      let clsSource = null;

      log(`[debug] === INICIO EXTRACCIÓN CLS ===`);
      
      // Verificar repeatView primero ya que sabemos que tiene el valor
      if (data.data.runs?.['1']?.repeatView) {
        const rv = data.data.runs['1'].repeatView;
        log(`[debug] RepeatView encontrado, buscando CLS...`);
        log(`[debug] chromeUserTiming.CumulativeLayoutShift: ${rv['chromeUserTiming.CumulativeLayoutShift']}`);
        
        if (typeof rv['chromeUserTiming.CumulativeLayoutShift'] !== 'undefined') {
          cls = rv['chromeUserTiming.CumulativeLayoutShift'];
          clsSource = 'repeatView.chromeUserTiming.CumulativeLayoutShift';
          log(`[debug] CLS encontrado en repeatView: ${cls}`);
        }
      }

      // Si no encontramos en repeatView, buscar en firstView
      if (cls === null) {
        log(`[debug] No se encontró CLS en repeatView, buscando en firstView...`);
        if (typeof fv['chromeUserTiming.CumulativeLayoutShift'] !== 'undefined') {
          cls = fv['chromeUserTiming.CumulativeLayoutShift'];
          clsSource = 'firstView.chromeUserTiming.CumulativeLayoutShift';
          log(`[debug] CLS encontrado en firstView: ${cls}`);
        }
      }

      // Asegurar que cls sea un número y tenga 4 decimales
      if (cls !== null) {
        cls = Number(cls).toFixed(4);
        log(`[debug] CLS final formateado: ${cls} (fuente: ${clsSource})`);
      } else {
        log(`[debug] No se encontró valor de CLS en ninguna fuente`);
      }

      // Extracción robusta de TTFB
      let ttfb = null;
      if (data.data.runs?.['1']?.firstView?.TTFB !== undefined) {
        ttfb = data.data.runs['1'].firstView.TTFB;
        log(`[debug] TTFB encontrado en firstView.TTFB: ${ttfb}`);
      } else if (data.data.median?.firstView?.TTFB !== undefined) {
        ttfb = data.data.median.firstView.TTFB;
        log(`[debug] TTFB encontrado en median.firstView.TTFB: ${ttfb}`);
      }

      // Asegurar que ttfb sea un número
      if (ttfb !== null) {
        ttfb = Number(ttfb).toFixed(0);
        log(`[debug] TTFB formateado final: ${ttfb}`);
      }

      // Extracción robusta de Speed Index y TBT
      let speedIndex = null;
      let tbt = null;

      log(`[debug] === INICIO EXTRACCIÓN MÉTRICAS ===`);
      
      // Verificar firstView primero
      if (data.data.runs?.['1']?.firstView) {
        const fv = data.data.runs['1'].firstView;
        log(`[debug] FirstView encontrado, buscando métricas...`);
        
        // Speed Index
        if (typeof fv.SpeedIndex !== 'undefined') {
          speedIndex = fv.SpeedIndex;
          log(`[debug] SpeedIndex encontrado en firstView: ${speedIndex}`);
        }
        
        // TBT
        if (typeof fv.TotalBlockingTime !== 'undefined') {
          tbt = fv.TotalBlockingTime;
          log(`[debug] TBT encontrado en firstView: ${tbt}`);
        }
      }

      // Si no se encontró en firstView, verificar repeatView
      if (data.data.runs?.['1']?.repeatView) {
        const rv = data.data.runs['1'].repeatView;
        log(`[debug] RepeatView encontrado, buscando métricas...`);
        
        // Speed Index
        if (speedIndex === null && typeof rv.SpeedIndex !== 'undefined') {
          speedIndex = rv.SpeedIndex;
          log(`[debug] SpeedIndex encontrado en repeatView: ${speedIndex}`);
        }
        
        // TBT
        if (tbt === null && typeof rv.TotalBlockingTime !== 'undefined') {
          tbt = rv.TotalBlockingTime;
          log(`[debug] TBT encontrado en repeatView: ${tbt}`);
        }
      }

      // Si aún no se encontró TBT, intentar con lighthouse
      if (tbt === null && metrics['total-blocking-time']?.numericValue) {
        tbt = metrics['total-blocking-time'].numericValue;
        log(`[debug] TBT encontrado en lighthouse: ${tbt}`);
      }

      // Verificar si tenemos un valor válido de Speed Index
      if (speedIndex !== null) {
        speedIndex = Number(speedIndex).toFixed(0);
        log(`[debug] SpeedIndex final formateado: ${speedIndex}`);
      }
      
      if (tbt !== null) {
        tbt = Number(tbt).toFixed(0);
        log(`[debug] TBT final formateado: ${tbt}`);
      }

      log(`[debug] === FIN EXTRACCIÓN MÉTRICAS ===`);

      // Crear el resumen con los valores extraídos
      const resumen = {
        url: data.data.url || data.data.testUrl || null,
        lcp: lcp ?? null,
        cls: cls ?? null,
        tbt: tbt ?? null,
        fcp: data.data.median.firstView.firstContentfulPaint ?? null,
        si: speedIndex ?? null,
        ttfb: data.data.median.firstView.TTFB ?? null,
        loadTime: data.data.median.firstView.loadTime ?? null,
        webpagetestUrl: data.data.summary ?? null,
        totalSize: data.data.median.firstView.bytesIn ?? null,
        requests: data.data.median.firstView.requestsFull ?? null
      };

      log(`[debug] Resumen final con métricas (TTFB):`, { 
        ttfb: resumen.ttfb,
        ttfbType: typeof resumen.ttfb
      });

      analysisStatus.set(testId, {
        timestamp: Date.now(),
        status: 'complete',
        resumen
      });

      log(`[info] Resultados obtenidos correctamente para: ${testId}`);
      return res.json({
        success: true,
        testId,
        status: 'complete',
        resumen
      });
    }

    // Si llegamos aquí, hay un error inesperado
    log(`❌ Estado inesperado: ${data.statusCode}`, 'error');
    throw new Error(`Estado inesperado: ${data.statusCode}`);

  } catch (error) {
    log(`❌ Error interno en /webpagetest/results: ${error.message}`, 'error');
    return res.status(500).json({
      error: 'Error interno obteniendo resultados',
      details: error.message
    });
  }
});

// ---------------- RUTAS DE LIGHTHOUSE ----------------

router.get('/lighthouse/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    log(`[info] Consultando resultados Lighthouse para testId: ${testId}`);

    // Primero verificar el estado del test principal
    const statusResponse = await fetch(`https://www.webpagetest.org/jsonResult.php?test=${testId}`, {
      headers: {
        'X-WPT-API-KEY': process.env.WPT_API_KEY
      }
    });

    if (!statusResponse.ok) {
      if (statusResponse.status === 404) {
        return res.json({
          success: true,
          status: 'pending',
          message: 'Test en proceso'
        });
      }
      throw new Error(`Error verificando estado del test: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    
    // Si el test principal aún está en proceso
    if (statusData.statusCode === 100 || statusData.statusText?.includes("Testing")) {
      return res.json({
        success: true,
        status: 'pending',
        message: 'Test en proceso'
      });
    }

    // Los resultados de Lighthouse vienen en la misma respuesta
    if (statusData.data?.lighthouse) {
      log(`[info] Resultados Lighthouse obtenidos correctamente para: ${testId}`);
      return res.json({
        success: true,
        status: 'completed',
        lighthouse: statusData.data.lighthouse
      });
    }

    return res.json({
      success: true,
      status: 'pending',
      message: 'Resultados de Lighthouse aún no disponibles'
    });

  } catch (error) {
    log(`❌ Error inesperado: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: 'Error inesperado obteniendo resultados de Lighthouse.',
      error: error.message
    });
  }
});

// ---------------- RUTAS DE SITEMAP ----------------

router.post('/sitemap/analyze', async (req, res) => {
  try {
    const { url, testId } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const sitemapResults = await analyzeSitemap(url);
    if (testId) {
      const st = analysisStatus.get(testId) || {};
      analysisStatus.set(testId, { ...st, timestamp: Date.now(), sitemapResults });
    }
    res.json(sitemapResults);
  } catch (error) {
    log(`❌ Error sitemap: ${error.message}`, 'error');
    res.status(500).json({ error: 'Error analizando sitemap', details: error.message });
  }
});

// ---------------- RUTA DE ESTADO ----------------
router.get('/status/:testId', (req, res) => {
  const { testId } = req.params;
  if (!testId) return res.status(400).json({ error: 'Test ID is required' });
  const status = analysisStatus.get(testId) || { resumen: null, lighthouse: null, sitemapResults: null };
  res.json(status);
});

// Endpoint para analizar metadatos
router.get('/analyze-meta', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL es requerida' });
    }

    // Realizar la petición con axios para obtener headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SeoAnalyzer/1.0; +http://localhost)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3'
      },
      timeout: 10000,
      validateStatus: false // Para obtener todos los códigos de respuesta
    });

    const $ = cheerio.load(response.data);

    // Análisis de scripts
    const scripts = $('script').toArray();
    const asyncScripts = scripts.filter(script => $(script).attr('async')).length;
    const deferScripts = scripts.filter(script => $(script).attr('defer')).length;
    const blockingScripts = scripts.filter(script => 
      !$(script).attr('async') && !$(script).attr('defer')
    ).length;

    // Análisis de imágenes
    const images = $('img').toArray();
    const imagesWithoutAlt = images.filter(img => !$(img).attr('alt')).length;
    const modernImageFormats = images.filter(img => {
      const src = $(img).attr('src') || '';
      return src.match(/\.(webp|avif)$/i);
    }).length;

    // Análisis de fuentes y preconnect
    const fontUrls = [];
    const preconnectUrls = [];
    const dnsPrefetchUrls = [];
    $('link').each((i, elem) => {
      const href = $(elem).attr('href');
      const rel = $(elem).attr('rel');
      if (href && href.includes('fonts.googleapis.com')) {
        fontUrls.push(href);
      }
      if (rel === 'preconnect') {
        preconnectUrls.push(href);
      }
      if (rel === 'dns-prefetch') {
        dnsPrefetchUrls.push(href);
      }
    });

    // Análisis de headers
    const headers = {
      content_type: response.headers['content-type'],
      content_encoding: response.headers['content-encoding'],
      cache_control: response.headers['cache-control'],
      hsts: Boolean(response.headers['strict-transport-security']),
      protocol: response.request?.res?.httpVersion || 'unknown'
    };

    // Análisis de rendimiento y recursos
    const performance = {
      load_time: response.headers['x-response-time'] ? parseFloat(response.headers['x-response-time']) : null,
      ttfb: response.headers['x-ttfb'] ? parseFloat(response.headers['x-ttfb']) : null,
      page_weight_kb: Math.round(response.data.length / 1024),
      requests: scripts.length + images.length + fontUrls.length
    };

    // Análisis de Core Web Vitals (simulado, estos valores deberían venir de Lighthouse o CrUX)
    const coreWebVitals = {
      fcp: null,
      lcp: null,
      cls: null,
      tbt: null,
      tti: null,
      fid: null
    };

    const metaData = {
      title: {
        content: $('title').text().trim(),
        length: $('title').text().trim().length,
        status: getTitleStatus($('title').text().trim().length)
      },
      description: {
        content: $('meta[name="description"]').attr('content') || '',
        length: ($('meta[name="description"]').attr('content') || '').length,
        status: getDescriptionStatus(($('meta[name="description"]').attr('content') || '').length)
      },
      keywords: $('meta[name="keywords"]').attr('content') || '',
      robots: $('meta[name="robots"]').attr('content') || '',
      canonical: $('link[rel="canonical"]').attr('href') || '',
      ogTitle: $('meta[property="og:title"]').attr('content') || '',
      ogDescription: $('meta[property="og:description"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content') || '',
      twitterCard: $('meta[name="twitter:card"]').attr('content') || '',
      twitterTitle: $('meta[name="twitter:title"]').attr('content') || '',
      viewport: $('meta[name="viewport"]').attr('content') || '',
      charset: $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || '',
      language: $('html').attr('lang') || ''
    };

    const technicalAnalysis = {
      headers,
      performance,
      coreWebVitals,
      resources: {
        blocking_scripts: blockingScripts,
        async_scripts: asyncScripts,
        defer_scripts: deferScripts,
        images_without_alt: imagesWithoutAlt,
        modern_image_formats: modernImageFormats,
        total_images: images.length
      },
      optimization: {
        preconnect: preconnectUrls.length > 0,
        dns_prefetch: dnsPrefetchUrls.length > 0,
        font_loading: {
          google_fonts: fontUrls.length,
          preconnect_fonts: preconnectUrls.some(url => url.includes('fonts.gstatic.com')),
          font_display: $('style').text().includes('font-display')
        }
      },
      security: {
        https: url.startsWith('https://'),
        hsts: Boolean(response.headers['strict-transport-security'])
      }
    };

    res.json({
      url,
      metaData,
      technicalAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing meta data:', error);
    const errorMessage = error.response 
      ? `Error ${error.response.status}: ${error.response.statusText}`
      : error.code === 'ECONNABORTED'
      ? 'Timeout al intentar acceder a la URL'
      : 'Error al analizar los metadatos';

    res.status(500).json({ 
      error: errorMessage,
      url: req.query.url,
      timestamp: new Date().toISOString()
    });
  }
});

// Funciones auxiliares
function getTitleStatus(length) {
  if (length < 30) return 'below recommended length';
  if (length > 60) return 'exceeds recommended length';
  return 'optimal';
}

function getDescriptionStatus(length) {
  if (length < 120) return 'below recommended length';
  if (length > 160) return 'exceeds recommended length';
  return 'optimal';
}

// Limpieza periódica de resultados antiguos (cada hora)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [testId, entry] of analysisStatus.entries()) {
    if (entry.timestamp < oneHourAgo) {
      analysisStatus.delete(testId);
      log(`🧹 Limpiando estado antiguo para: ${testId}`);
    }
  }
}, 60 * 60 * 1000);

// Usar el router de corevitals
router.use('/corevitals', corevitalsRouter);

export default router;