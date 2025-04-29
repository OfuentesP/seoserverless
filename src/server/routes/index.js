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
    params.append('location', 'ec2-us-east-1:Chrome.Cable');
    params.append('video', '1');
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

    const response = await fetch(`https://www.webpagetest.org/jsonResult.php?${params}`, {
      method: 'GET',
      headers: {
        'X-WPT-API-KEY': process.env.WPT_API_KEY
      }
    });

    const responseText = await response.text();
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
      return res.json({
        success: true,
        testId,
        status: 'pending',
        message: 'Test still running'
      });
    }

    // Si el test está completo
    if (data.statusCode === 200) {
      // Extraer métricas
      const fv = data.data.runs['1'].firstView;
      const resumen = {
        url: data.data.url,
        loadTime: fv.loadTime,
        SpeedIndex: fv.SpeedIndex,
        TTFB: fv.TTFB,
        totalSize: fv.bytesIn,
        requests: fv.requests,
        lcp: fv.largestContentfulPaint,
        cls: fv.cumulativeLayoutShift,
        tbt: fv.totalBlockingTime,
        detalles: data.data.summary
      };

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

export default router;