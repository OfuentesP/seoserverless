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

    // Llamada a WebPageTest usando GET con querystring
    const params = new URLSearchParams({
      url,
      runs: '1',
      location: 'ec2-us-east-1:Chrome.Cable',
      video: 'true',
      mobile: 'false',
      f: 'json',
      lighthouse: '1'
    });

    const resp = await fetch(`https://www.webpagetest.org/runtest.php?${params.toString()}`, {
      headers: {
        'X-WPT-API-KEY': process.env.WPT_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`WPT error ${resp.status}: ${err.statusText || JSON.stringify(err)}`);
    }

    const data = await resp.json();
    const testId = data.data?.testId || data.testId;

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
        detalles: data.data?.userUrl || data.data?.summary || data.userUrl || data.summary 
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
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    log(`[info] Consultando resultados para testId: ${testId}`);

    // Intentar obtener resultados usando la API PRO v1
    const response = await fetch(
      `https://product.webpagetest.org/api/v1/result/${testId}?lighthouse=1`,
      {
        headers: {
          'X-API-Key': process.env.WPT_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      // Si falla la API PRO, intentar con la API legacy
      log('[info] API PRO no disponible, intentando con API legacy...');
      const legacyResponse = await fetch(
        `https://www.webpagetest.org/jsonResult.php?test=${testId}&f=json`,
        {
          headers: {
            'X-WPT-API-KEY': process.env.WPT_API_KEY,
            'Accept': 'application/json'
          }
        }
      );

      if (!legacyResponse.ok) {
        const err = await legacyResponse.json().catch(() => ({}));
        throw new Error(`Error obteniendo resultados: ${legacyResponse.status}`);
      }

      const data = await legacyResponse.json();
      return processTestResults(data, testId, res);
    }

    const data = await response.json();
    return processTestResults(data, testId, res);

  } catch (error) {
    log(`❌ Error obteniendo resultados: ${error.message}`, 'error');
    return res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo resultados.',
      error: error.message
    });
  }
});

// Función auxiliar para procesar resultados del test
function processTestResults(data, testId, res) {
  if (data.statusCode === 100 || data.statusText?.includes("Testing")) {
    return res.status(202).json({
      status: 'pending',
      message: 'El test sigue en proceso. Por favor, espere.',
      data: data
    });
  }

  if (data.statusCode === 200 || data.status === 'complete') {
    const firstView = data.data?.runs?.['1']?.firstView || {};
    const resumen = {
      url: data.data?.url || data.data?.testUrl,
      loadTime: firstView.loadTime,
      SpeedIndex: firstView.SpeedIndex,
      TTFB: firstView.TTFB,
      totalSize: firstView.bytesIn,
      requests: firstView.requests,
      lcp: firstView.largestContentfulPaint,
      cls: firstView.cumulativeLayoutShift,
      tbt: firstView.totalBlockingTime,
      detalles: data.data?.summary || data.data?.userUrl,
      lighthouse: data.data?.lighthouse || null
    };

    analysisStatus.set(testId, {
      timestamp: Date.now(),
      status: 'complete',
      resumen
    });

    return res.json({ status: 'complete', resumen });
  }

  return res.status(202).json({
    status: 'pending',
    message: 'Estado del test desconocido.',
    data: data
  });
}

// ---------------- RUTAS DE LIGHTHOUSE ----------------

router.get('/lighthouse/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    log(`[info] Consultando resultados Lighthouse para testId: ${testId}`);

    const response = await fetch(
      `https://product.webpagetest.org/api/v1/result/${testId}?lighthouse=1`,
      {
        headers: { 
          'X-API-Key': process.env.WPT_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`WPT Pro error ${response.status}: ${err.statusText || JSON.stringify(err)}`);
    }

    const json = await response.json();
    log(`[debug] Respuesta completa: ${JSON.stringify(json).substring(0, 200)}...`);

    // Verificar si el test está completo
    if (json.statusCode === 100 || (json.statusText && json.statusText.includes("Testing"))) {
      return res.status(202).json({
        success: false,
        status: 'pending',
        message: 'El test sigue en proceso. Por favor, espere.'
      });
    }

    // Verificar que tenemos datos de Lighthouse
    if (!json.data?.lighthouse) {
      throw new Error('No se encontraron datos de Lighthouse en la respuesta');
    }

    log('[info] Lighthouse obtenido correctamente via API PRO');
    return res.json({
      success: true,
      status: 'complete',
      lighthouse: json.data.lighthouse
    });

  } catch (error) {
    log(`[error] Error obteniendo resultados Lighthouse: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo resultados de Lighthouse.',
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