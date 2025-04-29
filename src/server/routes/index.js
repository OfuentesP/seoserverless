import express from 'express';
import WebPageTest from 'webpagetest';
import { analyzeSitemap } from '../../services/sitemap.js';

const router = express.Router();
const wpt = new WebPageTest('https://www.webpagetest.org', process.env.WPT_API_KEY);

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

    const testPromise = new Promise((resolve, reject) => {
      wpt.runTest(url, {
        connectivity: 'Cable',
        location: 'ec2-us-east-1:Chrome',
        runs: 1,
        video: true,
        mobile: false,
        pollResults: false
      }, (err, data) => {
        if (err) {
          log(`[error] Error de WebPageTest: ${err.message}`);
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const data = await testPromise;
    
    if (!data || !data.data || !data.data.testId) {
      throw new Error('Respuesta inválida del servidor WebPageTest');
    }

    // Guardar estado inicial
    analysisStatus.set(data.data.testId, { 
      timestamp: Date.now(),
      status: 'pending', 
      resumen: null 
    });

    log(`[info] Test iniciado correctamente: ${data.data.testId}`);

    return res.json({
      success: true,
      testId: data.data.testId,
      resumen: {
        loadTime: null,
        SpeedIndex: null,
        TTFB: null,
        detalles: data.data.userUrl
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
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    const resultUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}`;
    const response = await fetch(resultUrl, {
      headers: {
        'X-API-Key': process.env.WPT_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo resultados: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.statusCode === 100) {
      return res.status(202).json({
        status: 'pending',
        message: 'El test sigue en proceso. Por favor, espere.'
      });
    }

    if (data.statusCode === 200) {
      const firstView = data.data.runs['1'].firstView;
      const resumen = {
        url: data.data.url,
        loadTime: firstView.loadTime,
        SpeedIndex: firstView.SpeedIndex,
        TTFB: firstView.TTFB,
        totalSize: firstView.bytesIn,
        requests: firstView.requests,
        lcp: firstView.largestContentfulPaint,
        cls: firstView.cumulativeLayoutShift,
        tbt: firstView.totalBlockingTime,
        detalles: data.data.summary
      };

      analysisStatus.set(testId, {
        timestamp: Date.now(),
        status: 'complete',
        resumen
      });

      return res.json({ status: 'complete', resumen });
    }

    throw new Error(`Estado inesperado: ${data.statusText}`);

  } catch (error) {
    log(`Error obteniendo resultados: ${error.message}`, 'error');
    return res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo resultados.',
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

    const lighthouseUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}&lighthouse=1`;
    const response = await fetch(lighthouseUrl, {
      headers: {
        'X-API-Key': process.env.WPT_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo resultados Lighthouse: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data?.lighthouse) {
      return res.status(202).json({
        status: 'pending',
        message: 'Resultados de Lighthouse aún no disponibles.'
      });
    }

    return res.json(data.data.lighthouse);

  } catch (error) {
    log(`Error obteniendo resultados Lighthouse: ${error.message}`, 'error');
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