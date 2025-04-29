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
      throw new Error(`WPT Pro error ${resp.status}: ${err.statusText || JSON.stringify(err)}`);
    }

    const data = await resp.json();

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
      resumen: { detalles: data.data.userUrl || data.data.summary },
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

    // Esperar un mínimo de tiempo antes de consultar resultados
    const status = analysisStatus.get(testId);
    if (status) {
      const elapsedTime = Date.now() - status.timestamp;
      if (elapsedTime < 60000) { // Menos de 1 minuto
        log(`[info] Test aún muy reciente (${Math.floor(elapsedTime/1000)}s), esperando...`);
        return res.status(202).json({
          status: 'pending',
          message: 'El test está en proceso. Por favor, espere al menos 1 minuto.',
          elapsedTime: Math.floor(elapsedTime/1000)
        });
      }
    }

    // Función para intentar obtener resultados con reintentos
    const getResults = async (retryCount = 0) => {
      try {
        // Intentar primero con la API PRO
        try {
          log('[debug] Intentando con API PRO...');
          const proResponse = await fetch(
            `https://product.webpagetest.org/api/v1/result/${testId}`,
            {
              method: 'GET',
              headers: {
                'X-API-Key': process.env.WPT_API_KEY,
                'Accept': 'application/json'
              }
            }
          );

          if (proResponse.ok) {
            const data = await proResponse.json();
            log('[info] Respuesta exitosa de API PRO');
            return { data, isPro: true };
          }
        } catch (error) {
          log(`[debug] API PRO no disponible: ${error.message}`);
        }

        // Si la API PRO falla, intentar con la API gratuita
        log('[debug] Intentando con API gratuita...');
        const response = await fetch(
          `https://www.webpagetest.org/jsonResult.php?test=${testId}&f=json`,
          {
            headers: {
              'X-WPT-API-KEY': process.env.WPT_API_KEY,
              'Accept': 'application/json'
            }
          }
        );

        const contentType = response.headers.get('content-type');
        log(`[debug] Content-Type: ${contentType}`);

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const responseText = await response.text();
        
        // Verificar si la respuesta es HTML
        if (contentType?.includes('text/html') || responseText.includes('<!DOCTYPE html>')) {
          if (retryCount < 2) {
            log(`[warn] Recibida respuesta HTML, reintentando en 5 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return getResults(retryCount + 1);
          }
          throw new Error('Recibida respuesta HTML después de reintentos');
        }

        // Intentar parsear como JSON
        try {
          const data = JSON.parse(responseText);
          return { data, isPro: false };
        } catch (e) {
          log(`[error] Error parseando JSON: ${e.message}`);
          throw new Error('Respuesta no es JSON válido');
        }
      } catch (error) {
        if (retryCount < 2) {
          log(`[warn] Error en intento ${retryCount + 1}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          return getResults(retryCount + 1);
        }
        throw error;
      }
    };

    const { data, isPro } = await getResults();
    
    // Procesar resultados según el tipo de API
    if (isPro) {
      if (data.status === 'complete') {
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
      } else {
        return res.status(202).json({
          status: 'pending',
          message: 'El test sigue en proceso. Por favor, espere.',
          data: data
        });
      }
    } else {
      // API gratuita
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
      } else if (data.statusCode === 100) {
        return res.status(202).json({
          status: 'pending',
          message: 'El test sigue en proceso. Por favor, espere.',
          data: data
        });
      }
    }

    throw new Error(`Estado inesperado: ${data.statusText || data.statusCode}`);

  } catch (error) {
    log(`❌ Error obteniendo resultados: ${error.message}`, 'error');
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

    log(`[info] Consultando resultados Lighthouse para testId: ${testId}`);

    const response = await fetch(
      `https://product.webpagetest.org/api/v1/result/${testId}?lighthouse=1`,
      {
        headers: { 'X-API-Key': process.env.WPT_API_KEY }
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`WPT Pro error ${response.status}: ${err.statusText || JSON.stringify(err)}`);
    }

    const json = await response.json();
    log('[info] Lighthouse obtenido correctamente via API PRO');
    
    // json.data.lighthouse contiene el informe completo
    return res.json(json.data.lighthouse);

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