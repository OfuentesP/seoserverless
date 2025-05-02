import 'dotenv/config'; // <-- Esto permite que lea el .env

import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import WebPageTest from 'webpagetest';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pkg from 'uuid';
const { v4: uuidv4 } = pkg;
import bodyParser from 'body-parser';
import router from './src/server/routes/index.js';

// Importar servicios
import { analyzeSitemap } from './src/services/sitemap.js';

// Configuración de rutas y directorios
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de WebPageTest
const wpt = new WebPageTest('https://www.webpagetest.org', process.env.WPT_API_KEY);

// Configuración de logs
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logStream = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });
const errorStream = fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' });

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}\n`;
  
  console.log(logMessage);
  if (type === 'error') {
    errorStream.write(logMessage);
  } else {
    logStream.write(logMessage);
  }
}

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Usar el router para /api
app.use('/api', router);

// Servir archivos estáticos
app.use(express.static(path.join(process.cwd(), 'dist')));

// Almacenamiento temporal en memoria para resultados por testId
const analysisStatus = new Map();

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

// Función para manejar respuestas de WebPageTest
async function handleWebPageTestResponse(response, testId, testStartTime, retries) {
  const contentType = response.headers.get("content-type");
  const elapsedTime = Date.now() - testStartTime;

  if (!contentType || !contentType.includes("application/json")) {
    log(`Respuesta no-JSON recibida (${Math.floor(elapsedTime/1000)}s)`, 'warn');
    return {
      status: 202,
      body: {
        status: 'pending',
        message: 'El test está en proceso. Por favor, espere unos minutos.',
        elapsedTime: Math.floor(elapsedTime/1000),
        retriesLeft: retries,
        testId: testId
      }
    };
  }

  const resultData = await response.json();
  
  if (resultData.statusCode === 100 || resultData.statusText?.includes("Testing")) {
    log(`Test en progreso (${Math.floor(elapsedTime/1000)}s)`);
    return {
      status: 202,
      body: {
        status: 'pending',
        message: 'El test sigue en proceso. Por favor, espere.',
        elapsedTime: Math.floor(elapsedTime/1000),
        retriesLeft: retries,
        testId: testId
      }
    };
  }

  if (resultData.statusCode === 200 && resultData.data?.runs) {
    const firstView = resultData.data.runs['1'].firstView;
    const resumen = {
      url: resultData.data.testUrl || null,
      loadTime: firstView?.loadTime || null,
      SpeedIndex: firstView?.SpeedIndex || null,
      ttfb: firstView?.TTFB || null,
      totalSize: firstView?.bytesIn || null,
      requests: firstView?.requests || null,
      lcp: firstView?.largestContentfulPaint || null,
      cls: firstView?.cumulativeLayoutShift || null,
      tbt: firstView?.TotalBlockingTime || null,
      detalles: resultData.data.summary,
      testId: testId,
    };
    
    analysisStatus.set(testId, {
      timestamp: Date.now(),
      status: 'complete',
      resumen
    });
    
    return {
      status: 200,
      body: { status: 'complete', resumen }
    };
  }

  throw new Error(`Estado inesperado WebPageTest: ${resultData.statusText || resultData.statusCode}`);
}

// ---------------- RUTA PARA INICIAR TEST ----------------
app.post('/api/webpagetest/run', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      log('❌ No se proporcionó URL.', 'error');
      return res.status(400).json({ success: false, message: 'URL no proporcionada.' });
    }

    if (!process.env.WPT_API_KEY) {
      log('❌ API Key no configurada.', 'error');
      return res.status(500).json({ success: false, message: 'Error de configuración: API Key no encontrada.' });
    }

    log(`[info] Iniciando test para: ${url}`);
    log(`[debug] Usando API Key: ${process.env.WPT_API_KEY.substring(0, 4)}...`);

    // Usar la biblioteca oficial de WebPageTest
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
          log(`[debug] Respuesta WebPageTest: ${JSON.stringify(data)}`);
          resolve(data);
        }
      });
    });

    const data = await testPromise;
    
    if (!data || !data.data || !data.data.testId) {
      log(`❌ Respuesta inválida: ${JSON.stringify(data)}`, 'error');
      return res.status(500).json({ 
        success: false, 
        message: 'Respuesta inválida del servidor.',
        error: data 
      });
    }

    // Guardar estado inicial
    analysisStatus.set(data.data.testId, { 
      timestamp: Date.now(),
      status: 'pending', 
      resumen: null 
    });

    log(`[info] Test iniciado correctamente: ${data.data.testId}`);
    log(`[info] URL resultados WebPageTest: ${data.data.userUrl}`);

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

// ---------------- RUTA PARA OBTENER RESULTADOS DE WEBPAGETEST ----------------
app.get('/api/webpagetest/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      log('❌ Test ID faltante en la solicitud', 'error');
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    log(`🔍 Consultando resultados para testId: ${testId}`);
    const resultUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}`;
    
    try {
      const response = await fetch(resultUrl);
      const contentType = response.headers.get("content-type");
      
      log(`📊 Respuesta recibida - Status: ${response.status}, Content-Type: ${contentType}`);

      if (!response.ok) {
        const errorText = await response.text();
        log(`❌ Error en la respuesta de WebPageTest: ${errorText}`, 'error');
        throw new Error(`WebPageTest API error: ${response.status} ${response.statusText}`);
      }

      if (contentType && contentType.includes("application/json")) {
        const resultData = await response.json();
        log(`📊 Datos recibidos de WebPageTest: ${JSON.stringify(resultData, null, 2)}`);

        // Test iniciando o en progreso
        if (resultData.statusCode === 100 || resultData.statusCode === 101) {
          log(`⏳ Test en progreso. Estado: ${resultData.statusCode}`);
          return res.json({ 
            status: 'pending', 
            message: resultData.statusCode === 101 ? 'Iniciando test...' : 'Test en progreso...',
            statusCode: resultData.statusCode,
            testId: testId
          });
        }

        // Test completado
        if (resultData.statusCode === 200 && resultData.data?.runs) {
          const firstView = resultData.data.runs['1'].firstView;
          const resumen = {
            url: resultData.data.testUrl || null,
            loadTime: firstView?.loadTime || null,
            SpeedIndex: firstView?.SpeedIndex || null,
            ttfb: firstView?.TTFB || null,
            totalSize: firstView?.bytesIn || null,
            requests: firstView?.requests || null,
            lcp: firstView?.largestContentfulPaint || null,
            cls: firstView?.cumulativeLayoutShift || null,
            tbt: firstView?.TotalBlockingTime || null,
            detalles: resultData.data.summary,
            testId: testId,
          };
          
          log(`✅ Test completado exitosamente para: ${testId}`);
          return res.json({ 
            status: 'complete', 
            resumen 
          });
        }

        // Estado inesperado
        log(`⚠️ Estado inesperado de WebPageTest: ${resultData.statusCode}`, 'warn');
        return res.status(500).json({ 
          success: false, 
          message: 'Estado inesperado de WebPageTest',
          details: resultData
        });
      } else {
        const errorText = await response.text();
        log(`❌ Respuesta no-JSON recibida: ${errorText}`, 'error');
        return res.status(500).json({ 
          success: false, 
          message: 'Respuesta inválida de WebPageTest',
          details: errorText
        });
      }
    } catch (fetchError) {
      log(`❌ Error al consultar WebPageTest: ${fetchError.message}`, 'error');
      return res.status(500).json({ 
        success: false, 
        message: 'Error al consultar WebPageTest',
        error: fetchError.message
      });
    }
  } catch (error) {
    log(`❌ Error inesperado: ${error.message}`, 'error');
    return res.status(500).json({ 
      success: false, 
      message: 'Error inesperado',
      error: error.message
    });
  }
});

// ---------------- RUTA PARA OBTENER RESULTADOS DE LIGHTHOUSE ----------------
app.get('/api/lighthouse/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    let lighthouseData = null;
    let lighthouseRetries = 12;
    const log = (message, type = 'info') => console.log(`[Lighthouse] ${message}`);

    while (lighthouseRetries > 0) {
      try {
        const response = await fetch(`${process.env.WEBPAGETEST_API_URL}/${testId}?f=json`);
        const data = await response.json();

        // Try to get Lighthouse data from different possible structures
        if (data?.data?.lighthouse) {
          lighthouseData = data.data.lighthouse;
          log('Lighthouse recibido correctamente (formato directo).');
          break;
        } else if (data?.data?.runs?.['1']?.lighthouse) {
          lighthouseData = data.data.runs['1'].lighthouse;
          log('Lighthouse recibido correctamente (formato runs).');
          break;
        } else if (data?.data?.runs?.['1']?.lighthouseResult) {
          lighthouseData = data.data.runs['1'].lighthouseResult;
          log('Lighthouse recibido correctamente (formato lighthouseResult).');
          break;
        } else {
          log(`Lighthouse aún no disponible. (${lighthouseRetries} intentos restantes)`);
          lighthouseRetries--;
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        log(`Error obteniendo Lighthouse: ${error.message}`, 'error');
        lighthouseRetries--;
        if (lighthouseRetries > 0) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    if (!lighthouseData) {
      log('No se pudo obtener Lighthouse.', 'error');
      return res.status(500).json({ 
        success: false, 
        message: 'No se pudo obtener Lighthouse.',
        error: 'LIGHTHOUSE_DATA_NOT_AVAILABLE'
      });
    }

    // Ensure the Lighthouse data has the expected structure
    const normalizedData = {
      categories: {},
      audits: {}
    };

    // Normalize categories if they exist
    if (lighthouseData.categories) {
      normalizedData.categories = lighthouseData.categories;
    } else if (lighthouseData.audits) {
      // Create categories from audits if needed
      const categoryMap = {
        'performance': ['first-contentful-paint', 'speed-index', 'largest-contentful-paint', 'interactive', 'total-blocking-time'],
        'accessibility': ['aria-*', 'color-contrast', 'heading-order'],
        'best-practices': ['https', 'doctype', 'charset'],
        'seo': ['viewport', 'robots-txt', 'canonical']
      };

      Object.entries(categoryMap).forEach(([category, auditTypes]) => {
        const relevantAudits = Object.values(lighthouseData.audits)
          .filter(audit => auditTypes.some(type => 
            audit.id?.includes(type) || audit.group?.includes(type)
          ));

        if (relevantAudits.length > 0) {
          const avgScore = relevantAudits.reduce((sum, audit) => 
            sum + (audit.score || 0), 0) / relevantAudits.length;

          normalizedData.categories[category] = {
            score: avgScore,
            title: category.charAt(0).toUpperCase() + category.slice(1)
          };
        }
      });
    }

    // Normalize audits
    if (lighthouseData.audits) {
      normalizedData.audits = Object.entries(lighthouseData.audits)
        .reduce((acc, [key, audit]) => {
          if (audit && typeof audit === 'object') {
            acc[key] = {
              id: audit.id || key,
              title: audit.title || key,
              description: audit.description || '',
              score: audit.score !== undefined ? audit.score : null,
              numericValue: audit.numericValue,
              displayValue: audit.displayValue,
              details: audit.details
            };
          }
          return acc;
        }, {});
    }

    log('Estructura de datos normalizada correctamente.');
    
    return res.json({ 
      success: true,
      lighthouse: normalizedData
    });

  } catch (error) {
    console.error('[Lighthouse] Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error procesando resultados de Lighthouse',
      error: error.message 
    });
  }
});

// ---------------- RUTA PARA ANALIZAR SITEMAP ----------------
app.post('/api/sitemap/analyze', async (req, res) => {
  try {
    const { url, testId } = req.body;
    if (!url) {
      log('No se proporcionó URL.', 'error');
      return res.status(400).json({ success: false, message: 'URL no proporcionada.' });
    }
    
    log(`Analizando sitemap para URL: ${url}, testId: ${testId}`);
    const sitemapResults = await analyzeSitemap(url);
    log('Análisis de sitemap completado');
    
    if (testId) {
      const status = analysisStatus.get(testId) || {};
      analysisStatus.set(testId, {
        ...status,
        timestamp: Date.now(),
        sitemapResults
      });
      log(`Sitemap guardado en analysisStatus para testId: ${testId}`);
    } else {
      log('No se proporcionó testId al guardar sitemapResults', 'warn');
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

// --- Endpoint para consultar el estado de análisis por testId ---
app.get('/api/seo/status/:testId', async (req, res) => {
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

// Catch-all para el frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  log(`Error no capturado: ${error.message}`, 'error');
  log(error.stack, 'error');
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Promesa rechazada no manejada: ${reason}`, 'error');
});

// Iniciar servidor
app.listen(PORT, () => {
  log(`Servidor escuchando en http://localhost:${PORT}`);
});