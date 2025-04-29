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

    // Usar la API PRO v1 para iniciar el test
    const response = await fetch('https://product.webpagetest.org/api/v1/test', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.WPT_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url,
        runs: 1,
        location: 'ec2-us-east-1:Chrome.Cable',
        video: true,
        mobile: false,
        lighthouse: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log(`❌ Error de WebPageTest: ${response.status} - ${JSON.stringify(errorData)}`, 'error');
      throw new Error(`Error de WebPageTest: ${response.status}`);
    }

    const data = await response.json();
    const testId = data.testId;

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
        detalles: data.summary || data.userUrl 
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

    // Usar la API PRO v1 para obtener resultados
    const response = await fetch(`https://product.webpagetest.org/api/v1/result/${testId}`, {
      headers: {
        'X-API-Key': process.env.WPT_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log(`❌ Error obteniendo resultados: ${response.status} - ${JSON.stringify(errorData)}`, 'error');
      
      // Si el test aún no está completo, devolver estado pending
      if (response.status === 404 || response.status === 400) {
        return res.json({
          success: true,
          testId,
          status: 'pending',
          message: 'Test en proceso'
        });
      }
      
      throw new Error(`Error obteniendo resultados: ${response.status}`);
    }

    const data = await response.json();
    
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
        url: data.url,
        loadTime: data.loadTime,
        firstByte: data.firstByte,
        speedIndex: data.speedIndex,
        visualComplete: data.visualComplete,
        lighthouse: data.lighthouse || null
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

    // Primero verificar si el test principal está completo
    const statusResponse = await fetch(
      `https://www.webpagetest.org/jsonResult.php?test=${testId}`,
      {
        headers: {
          'X-WPT-API-KEY': process.env.WPT_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`Error verificando estado del test: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    
    // Si el test aún no está completo, informar al cliente
    if (statusData.statusCode === 100 || statusData.statusText?.includes("Testing")) {
      return res.status(202).json({
        success: false,
        status: 'pending',
        message: 'El test principal aún no ha terminado. Por favor, espere.'
      });
    }

    // Una vez que el test está completo, obtener Lighthouse
    const lighthouseResponse = await fetch(
      `https://www.webpagetest.org/jsonResult.php?test=${testId}&lighthouse=1`,
      {
        headers: {
          'X-WPT-API-KEY': process.env.WPT_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!lighthouseResponse.ok) {
      throw new Error(`Error obteniendo Lighthouse: ${lighthouseResponse.status}`);
    }

    const json = await lighthouseResponse.json();
    log(`[debug] Respuesta Lighthouse: ${JSON.stringify(json).substring(0, 200)}...`);

    // Buscar los datos de Lighthouse en diferentes ubicaciones posibles
    const lighthouse = json.data?.lighthouse || 
                      json.data?.runs?.['1']?.lighthouse ||
                      json.data?.runs?.['1']?.lighthouseResult;

    if (!lighthouse) {
      throw new Error('No se encontraron datos de Lighthouse en la respuesta');
    }

    log('[info] Lighthouse obtenido correctamente');
    return res.json({
      success: true,
      status: 'complete',
      lighthouse: lighthouse
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