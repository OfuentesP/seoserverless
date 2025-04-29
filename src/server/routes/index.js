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

    console.log(`Iniciando test para URL: ${url}, lighthouse: ${lighthouse}`);

    const params = new URLSearchParams({
      url,
      runs: '1',
      location: 'ec2-us-east-1:Chrome.Cable',
      video: 'true',
      mobile: 'false',
      lighthouse: lighthouse ? '1' : '0'
    });

    const response = await fetch('https://product.webpagetest.org/api/v1/runtest', {
      method: 'POST',
      headers: {
        'X-WPT-API-KEY': process.env.WEBPAGETEST_API_KEY
      },
      body: params
    });

    const data = await response.json();

    if (data.statusCode === 200) {
      console.log('Test iniciado exitosamente:', data);
      return res.json({
        testId: data.data.testId,
        status: 'Test iniciado exitosamente'
      });
    } else {
      console.error('Error iniciando test:', data);
      return res.status(400).json({
        error: 'Error inesperado ejecutando test',
        details: data
      });
    }
  } catch (error) {
    console.error('Error ejecutando test:', error);
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

    console.log(`Obteniendo resultados para test ID: ${testId}`);

    const response = await fetch(`https://product.webpagetest.org/api/v1/result/${testId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WPT-API-KEY': process.env.WEBPAGETEST_API_KEY
      }
    });

    const data = await response.json();

    if (data.statusCode === 200) {
      console.log('Resultados obtenidos exitosamente');
      return res.json({
        status: 'success',
        data: data.data
      });
    } else if (data.statusCode === 100) {
      console.log('Test aún en progreso');
      return res.json({
        status: 'pending',
        message: 'Test still running'
      });
    } else {
      console.error('Error obteniendo resultados:', data);
      return res.status(400).json({
        error: 'Error obteniendo resultados',
        details: data
      });
    }
  } catch (error) {
    console.error('Error interno obteniendo resultados:', error);
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
    
    // Si el test principal aún está en proceso
    if (statusData.statusCode === 100 || statusData.statusText?.includes("Testing")) {
      return res.json({
        success: true,
        status: 'pending',
        message: 'Test en proceso'
      });
    }

    // Si el test principal está completo, obtener resultados de Lighthouse
    const lighthouseResponse = await fetch(`https://product.webpagetest.org/api/v1/result/${testId}/lighthouse`, {
      headers: {
        'X-API-Key': process.env.WPT_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!lighthouseResponse.ok) {
      throw new Error(`Error obteniendo resultados de Lighthouse: ${lighthouseResponse.status}`);
    }

    const lighthouseData = await lighthouseResponse.json();
    
    if (!lighthouseData || !lighthouseData.data) {
      return res.json({
        success: true,
        status: 'pending',
        message: 'Resultados de Lighthouse aún no disponibles'
      });
    }

    log(`[info] Resultados Lighthouse obtenidos correctamente para: ${testId}`);

    return res.json({
      success: true,
      status: 'completed',
      lighthouse: lighthouseData.data
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