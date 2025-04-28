import dotenv from 'dotenv';
dotenv.config(); // Primero cargar variables de entorno

import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import webPageTest from 'webpagetest';
import cors from 'cors';

// Importar servicios
import { analyzeSitemap } from './src/services/sitemap.js';

const app = express();
const PORT = process.env.PORT || 3000;

const wpt = webPageTest('www.webpagetest.org', process.env.WPT_API_KEY);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// app.use(express.static(path.join(process.cwd(), 'dist')));

// --- Almacenamiento temporal en memoria para resultados por testId ---
const analysisStatus = {};
 
// ---------------- RUTA PARA INICIAR TEST ----------------
app.post('/api/webpagetest/run', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      console.error('❌ No se proporcionó URL.');
      return res.status(400).json({ success: false, message: 'URL no proporcionada.' });
    }

    console.log('🌎 URL recibida:', url);

    const test = await new Promise((resolve, reject) => {
      wpt.runTest(url, {
        lighthouse: true,
        pollResults: 5,
        timeout: 600,
        mobile: 0,
        video: 1
      }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    if (!test || !test.data || !test.data.id) {
      console.error('❌ No se pudo iniciar la prueba. Respuesta WPT:', test);
      return res.status(500).json({ success: false, message: 'No se pudo iniciar el test.' });
    }

    const testId = test.data.id;
    const resultUrl = test.data.summary;

    console.log('✅ Test iniciado. Test ID:', testId);
    console.log('🔗 URL resultados WebPageTest:', resultUrl);

    res.json({
      success: true,
      testId: testId,
      resumen: {
        loadTime: null,
        SpeedIndex: null,
        TTFB: null,
        detalles: resultUrl,
      }
    });

  } catch (error) {
    console.error('❌ Error inesperado ejecutando test:', error);
    res.status(500).json({ success: false, message: 'Error inesperado ejecutando test.' });
  }
});

// ---------------- RUTA PARA OBTENER RESULTADOS DE WEBPAGETEST ----------------
app.get('/api/webpagetest/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      console.error('❌ No se proporcionó testId.');
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    const resultUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}`;
    const response = await fetch(resultUrl);
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const resultData = await response.json();

      if (resultData.statusCode === 200 && resultData.data?.runs) {
        const firstView = resultData.data.runs['1'].firstView;
        const resumen = {
          url: resultData.data.testUrl || null,
          loadTime: firstView?.loadTime || null,
          SpeedIndex: firstView?.SpeedIndex || null,
          TTFB: firstView?.TTFB || null,
          totalSize: firstView?.bytesIn || null,
          requests: firstView?.requests || null,
          lcp: firstView?.largestContentfulPaint || null,
          cls: firstView?.cumulativeLayoutShift || null,
          tbt: firstView?.totalBlockingTime || null,
          detalles: resultData.data.summary,
          testId: testId,
        };
        if (!analysisStatus[testId]) analysisStatus[testId] = {};
        analysisStatus[testId].resumen = resumen;
        return res.status(200).json({ status: 'complete', resumen });
      } else if (resultData.statusCode === 100) {
        // El test sigue corriendo
        return res.status(200).json({ status: 'pending', message: 'El test sigue en proceso.' });
      } else {
        console.error('❌ Estado inesperado WebPageTest:', resultData.statusText || resultData.statusCode);
        return res.status(500).json({ success: false, message: 'Error en los resultados del test.' });
      }
    } else {
      const text = await response.text();
      console.error('❌ Respuesta inesperada (no JSON):', text.slice(0, 200));
      return res.status(202).json({ status: 'pending', message: 'Resultados aún no disponibles.' });
    }
  } catch (error) {
    console.error('❌ Error inesperado trayendo resultados:', error);
    res.status(500).json({ success: false, message: 'Error trayendo resultados.' });
  }
});

// ---------------- RUTA PARA OBTENER RESULTADOS DE LIGHTHOUSE ----------------
app.get('/api/lighthouse/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      console.error('❌ No se proporcionó testId.');
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    const lighthouseUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}&lighthouse=1`;

    // 🔄 Ahora intentamos obtener los datos de Lighthouse
    console.log('🌟 Consultando informe Lighthouse en:', lighthouseUrl);
    let lighthouseRetries = 12; // 1 minuto de intentos (12x5s)
    let lighthouseData = null;

    while (lighthouseRetries > 0) {
      const response = await fetch(lighthouseUrl);
      const data = await response.json();

      if (data?.data?.lighthouse) {
        lighthouseData = data.data.lighthouse;
        console.log('✅ Lighthouse recibido correctamente.');
        break;
      } else if (data?.data?.runs?.['1']?.lighthouse) {
        lighthouseData = data.data.runs['1'].lighthouse;
        console.log('✅ Lighthouse recibido correctamente (formato alternativo).');
        break;
      } else if (data?.data?.runs?.['1']?.lighthouseResult) {
        lighthouseData = data.data.runs['1'].lighthouseResult;
        console.log('✅ Lighthouse recibido correctamente (formato lighthouseResult).');
        break;
      } else {
        console.log(`⏳ Lighthouse aún no disponible. (${lighthouseRetries} intentos restantes)`);
        lighthouseRetries--;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
      }
    }

    if (!lighthouseData) {
      console.warn('⚠️ No se pudo obtener Lighthouse.');
      return res.status(500).json({ success: false, message: 'No se pudo obtener Lighthouse.' });
    } else {
      // Asegurarse de que la estructura de Lighthouse sea consistente
      if (!lighthouseData.categories && lighthouseData.audits) {
        // Reorganizar los datos si es necesario
        const categories = {};
        const audits = lighthouseData.audits;
        
        // Extraer categorías de los audits
        Object.keys(audits).forEach(key => {
          const audit = audits[key];
          if (audit.group) {
            if (!categories[audit.group]) {
              categories[audit.group] = {
                score: 0,
                title: audit.group
              };
            }
          }
        });
        
        lighthouseData.categories = categories;
        console.log('✅ Estructura de Lighthouse reorganizada.');
      }
    }

    // Guarda el resultado en analysisStatus
    if (!analysisStatus[testId]) analysisStatus[testId] = {};
    analysisStatus[testId].lighthouse = lighthouseData;
    res.json(lighthouseData);

  } catch (error) {
    console.error('❌ Error inesperado trayendo resultados de Lighthouse:', error);
    res.status(500).json({ success: false, message: 'Error trayendo resultados de Lighthouse.' });
  }
});

// ---------------- RUTA PARA ANALIZAR SITEMAP ----------------
app.post('/api/sitemap/analyze', async (req, res) => {
  try {
    const { url, testId } = req.body;
    if (!url) {
      console.error('❌ No se proporcionó URL.');
      return res.status(400).json({ success: false, message: 'URL no proporcionada.' });
    }
    console.log('🌎 Analizando sitemap para URL:', url, 'testId:', testId);
    const sitemapResults = await analyzeSitemap(url);
    console.log('✅ Análisis de sitemap completado');
    if (testId) {
      if (!analysisStatus[testId]) analysisStatus[testId] = {};
      analysisStatus[testId].sitemapResults = sitemapResults;
      console.log(`[server] Sitemap guardado en analysisStatus para testId: ${testId}`);
    } else {
      console.warn('[server] No se proporcionó testId al guardar sitemapResults');
    }
    res.json(sitemapResults);
  } catch (error) {
    console.error('❌ Error analizando sitemap:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error analizando sitemap.',
      error: error.message
    });
  }
});

// --- Endpoint para consultar el estado de análisis por testId ---
app.get('/api/seo/status/:testId', async (req, res) => {
  const { testId } = req.params;
  if (!testId) {
    return res.status(400).json({ success: false, message: 'Test ID faltante.' });
  }
  // Devuelve el estado y los datos si existen
  const status = analysisStatus[testId] || {
    resumen: null,
    lighthouse: null,
    sitemapResults: null,
  };
  res.json(status);
});

// ---------------- CATCH-ALL PARA FRONTEND ----------------
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

// ---------------- INICIAR SERVIDOR ----------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});