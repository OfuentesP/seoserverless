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

// Importar servicios
import { analyzeSitemap } from './src/services/sitemap.js';

// Configuración de rutas y directorios
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de WebPageTest
const wpt = new WebPageTest('https://www.webpagetest.org', {
  headers: {
    'X-API-Key': process.env.WPT_API_KEY,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

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
// app.use(express.static(path.join(process.cwd(), 'dist')));

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
      TTFB: firstView?.TTFB || null,
      totalSize: firstView?.bytesIn || null,
      requests: firstView?.requests || null,
      lcp: firstView?.largestContentfulPaint || null,
      cls: firstView?.cumulativeLayoutShift || null,
      tbt: firstView?.totalBlockingTime || null,
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

    // Usar la biblioteca oficial de WebPageTest
    const testPromise = new Promise((resolve, reject) => {
      wpt.runTest(url, {
        connectivity: 'Cable',
        location: 'ec2-us-east-1:Chrome',
        runs: 1,
        video: true,
        mobile: false
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const data = await testPromise;
    
    // Log de la respuesta completa para debugging
    log(`[debug] Respuesta WebPageTest: ${JSON.stringify(data)}`, 'info');

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
      log('❌ No se proporcionó testId.', 'error');
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    const resultUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}`;
    const testStartTime = Date.now();
    const minWaitTime = 90000; // 90 segundos mínimo de espera
    const maxRetries = 18; // 18 intentos (3 minutos)
    let retries = maxRetries;
    
    while (retries > 0) {
      const elapsedTime = Date.now() - testStartTime;
      
      // Esperar el tiempo mínimo antes de empezar a consultar
      if (elapsedTime < minWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      try {
        const response = await fetch(resultUrl, {
          headers: {
            ...wpt.headers,
            'X-API-Key': process.env.WPT_API_KEY
          }
        });

        const result = await handleWebPageTestResponse(response, testId, testStartTime, retries);
        
        if (result.status === 200) {
          return res.status(result.status).json(result.body);
        }
        
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 15000));
        } else {
          return res.status(result.status).json(result.body);
        }
        
      } catch (error) {
        log(`Error en intento ${maxRetries-retries+1}: ${error.message}`, 'error');
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
      }
    }

    // Si llegamos aquí, se agotaron los intentos
    return res.status(202).json({
      status: 'pending',
      message: 'El test sigue en proceso pero se agotaron los intentos de consulta. Por favor, intente más tarde.',
      elapsedTime: Math.floor((Date.now() - testStartTime)/1000),
      retriesLeft: 0,
      testId: testId
    });

  } catch (error) {
    log(`❌ Error inesperado obteniendo resultados: ${error}`, 'error');
    return res.status(500).json({ 
      success: false, 
      message: 'Error inesperado obteniendo resultados.',
      error: error.message
    });
  }
});

// ---------------- RUTA PARA OBTENER RESULTADOS DE LIGHTHOUSE ----------------
app.get('/api/lighthouse/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      log('No se proporcionó testId.', 'error');
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    const lighthouseUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}&lighthouse=1`;
    log(`Consultando informe Lighthouse en: ${lighthouseUrl}`);
    
    let lighthouseRetries = 12;
    let lighthouseData = null;

    while (lighthouseRetries > 0) {
      try {
        const response = await fetch(lighthouseUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-WPT-API-KEY': process.env.WPT_API_KEY
          }
        });
        
        if (response.headers.get("content-type")?.includes("text/html")) {
          log('Recibida página HTML en lugar de JSON. Posible verificación de seguridad.', 'error');
          lighthouseRetries--;
          if (lighthouseRetries > 0) {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
          continue;
        }
        
        const data = await response.json();

        if (data?.data?.lighthouse) {
          lighthouseData = data.data.lighthouse;
          log('Lighthouse recibido correctamente.');
          break;
        } else if (data?.data?.runs?.['1']?.lighthouse) {
          lighthouseData = data.data.runs['1'].lighthouse;
          log('Lighthouse recibido correctamente (formato alternativo).');
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
      return res.status(500).json({ success: false, message: 'No se pudo obtener Lighthouse.' });
    }

    // Asegurarse de que la estructura de Lighthouse sea consistente
    if (!lighthouseData.categories && lighthouseData.audits) {
      const categories = {};
      const audits = lighthouseData.audits;
      
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
      log('Estructura de Lighthouse reorganizada.');
    }

    // Actualizar estado en el Map
    const status = analysisStatus.get(testId) || {};
    analysisStatus.set(testId, {
      ...status,
      timestamp: Date.now(),
      lighthouse: lighthouseData
    });
    
    res.json(lighthouseData);

  } catch (error) {
    log(`Error inesperado trayendo resultados de Lighthouse: ${error.message}`, 'error');
    res.status(500).json({ success: false, message: 'Error trayendo resultados de Lighthouse.' });
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

// ---------------- CATCH-ALL PARA FRONTEND ----------------
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

// ---------------- INICIAR SERVIDOR ----------------
app.listen(PORT, () => {
  log(`Servidor escuchando en http://localhost:${PORT}`);
});