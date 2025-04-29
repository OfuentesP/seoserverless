import express from 'express';
import { analyzeSitemap } from '../../services/sitemap.js';

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
    const { url } = req.body;

    if (!url) {
      log('❌ No se proporcionó URL.', 'error');
      return res.status(400).json({ success: false, message: 'URL no proporcionada.' });
    }

    log(`[info] Iniciando test para: ${url}`);
    log(`[debug] API Key: ${process.env.WPT_API_KEY.substring(0, 4)}...`);

    // Usar el endpoint legacy con parámetros para JSON y Lighthouse
    const params = new URLSearchParams({
      url,
      runs: '1',
      location: 'ec2-us-east-1:Chrome.Cable',
      video: 'true',
      mobile: 'false',
      f: 'json',
      lighthouse: '1'
    });

    const response = await fetch(
      `https://www.webpagetest.org/runtest.php?${params.toString()}`,
      {
        headers: {
          'X-WPT-API-KEY': process.env.WPT_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log(`❌ Error de WebPageTest: ${response.status} - ${JSON.stringify(errorData)}`, 'error');
      throw new Error(`Error de WebPageTest: ${response.status}`);
    }

    const data = await response.json();
    const testId = data.data?.testId;

    if (!testId) {
      throw new Error('No se recibió testId en la respuesta');
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
      testId: testId,
      resumen: { 
        detalles: data.data?.summary || data.data?.userUrl 
      },
      status: 'pending'
    });

  } catch (error) {
    log(`❌ Error inesperado: ${error.message}`, 'error');
    return res.status(500).json({ 
      success: false, 
      message: 'Error inesperado ejecutando test.',
      error: error.message
    });
  }
});

// Obtener resultados de WebPageTest
router.get('/webpagetest/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    
    if (!testId) {
      log('❌ No se proporcionó testId.', 'error');
      return res.status(400).json({ success: false, message: 'TestId no proporcionado.' });
    }

    log(`[info] Consultando resultados para test: ${testId}`);

    // 1) Intenta primero la API Pro v1
    let response = await fetch(
      `https://product.webpagetest.org/api/v1/result/${testId}`,
      { headers: { 'X-API-Key': process.env.WPT_API_KEY, 'Accept': 'application/json' } }
    );
    // 2) Si falla, cae en la API gratuita legacy
    if (!response.ok) {
      log(`[info] Pro v1 no disponible (${response.status}), uso legacy`);
      response = await fetch(
        `https://www.webpagetest.org/jsonResult.php?test=${testId}&f=json`,
        { headers: { 'X-WPT-API-KEY': process.env.WPT_API_KEY, 'Accept': 'application/json' } }
      );
      if (!response.ok) throw new Error(`Legacy error HTTP ${response.status}`);
    }
    const data = await response.json();
    
    // Si el test aún está en proceso
    if (data.statusCode === 100 || data.statusText?.includes("Testing")) {
      return res.json({
        success: true,
        testId,
        status: 'pending',
        message: 'Test en proceso'
      });
    }
    
    // Actualizar estado
    analysisStatus.set(testId, {
      timestamp: Date.now(),
      status: 'completed',
      resumen: data
    });

    log(`[info] Resultados obtenidos correctamente para: ${testId}`);

    return res.json({
      success: true,
      testId,
      status: 'completed',
      resumen: {
        url: data.data?.url || data.url,
        loadTime: data.data?.runs?.['1']?.firstView?.loadTime || data.loadTime,
        SpeedIndex: data.data?.runs?.['1']?.firstView?.SpeedIndex || data.SpeedIndex,
        TTFB: data.data?.runs?.['1']?.firstView?.TTFB || data.TTFB,
        totalSize: data.data?.runs?.['1']?.firstView?.bytesIn || data.bytesIn,
        requests: data.data?.runs?.['1']?.firstView?.requests || data.requests,
        lcp: data.data?.runs?.['1']?.firstView?.largestContentfulPaint || data.LCP,
        cls: data.data?.runs?.['1']?.firstView?.cumulativeLayoutShift || data.CLS,
        tbt: data.data?.runs?.['1']?.firstView?.totalBlockingTime || data.TBT,
        detalles: data.data?.summary || data.summary,
        lighthouse: data.data?.lighthouse || data.lighthouse || null
      }
    });

  } catch (error) {
    log(`❌ Error inesperado: ${error.message}`, 'error');
    return res.status(500).json({
      success: false,
      message: 'Error inesperado obteniendo resultados.',
      error: error.message
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
    const statusResponse = await fetch(`https://product.webpagetest.org/api/v1/result/${testId}`, {
      headers: {
        'X-API-Key': process.env.WPT_API_KEY,
        'Accept': 'application/json'
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
    
    // Si el test principal está completo, intentar obtener resultados de Lighthouse
    const lighthouseResponse = await fetch(`https://product.webpagetest.org/api/v1/result/${testId}?lighthouse=1`, {
      headers: {
        'X-API-Key': process.env.WPT_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!lighthouseResponse.ok) {
      if (lighthouseResponse.status === 404) {
        return res.json({
          success: false,
          status: 'completed',
          message: 'Test completado pero no se encontraron resultados de Lighthouse'
        });
      }
      throw new Error(`Error obteniendo resultados de Lighthouse: ${lighthouseResponse.status}`);
    }

    const data = await lighthouseResponse.json();
    log(`[debug] Respuesta de Lighthouse recibida para test ${testId}`);

    if (!data.data?.lighthouse) {
      return res.json({
        success: false,
        status: 'completed',
        message: 'Test completado pero no incluye resultados de Lighthouse'
      });
    }

    return res.json({
      success: true,
      status: 'completed',
      lighthouse: data.data.lighthouse
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
      return res.status(400).json({ success: false, message: 'URL no proporcionada.' });
    }
    
    const sitemapResults = await analyzeSitemap(url);
    
    if (testId) {
      const status = analysisStatus.get(testId) || {};
      analysisStatus.set(testId, {
        ...status,
        timestamp: Date.now(),
        sitemapResults
      });
    }
    
    res.json(sitemapResults);
    
  } catch (error) {
    log(`Error analizando sitemap: ${error.message}`, 'error');
    res.status(500).json({ 
      success: false, 
      message: 'Error analizando sitemap.',
      error: error.message
    });
  }
});

// ---------------- RUTA DE ESTADO ----------------

router.get('/status/:testId', (req, res) => {
  const { testId } = req.params;
  
  if (!testId) {
    return res.status(400).json({ success: false, message: 'Test ID faltante.' });
  }
  
  const status = analysisStatus.get(testId) || {
    resumen: null,
    lighthouse: null,
    sitemapResults: null,
  };
  
  res.json(status);
});

// Limpieza periódica de resultados antiguos (cada hora)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [testId, data] of analysisStatus.entries()) {
    if (data.timestamp < oneHourAgo) {
      analysisStatus.delete(testId);
      log(`Limpiando resultados antiguos para testId: ${testId}`);
    }
  }
}, 60 * 60 * 1000);

export default router; 