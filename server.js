import dotenv from 'dotenv';
dotenv.config(); // Primero cargar variables de entorno

import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import webPageTest from 'webpagetest';
import cors from 'cors';
import fs from 'fs';

// Importar servicios
import { analyzeSitemap } from './src/services/sitemap.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de WebPageTest
const wpt = webPageTest('www.webpagetest.org', process.env.WPT_API_KEY);

// Configuración de logs
const logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logStream = fs.createWriteStream(`${logDir}/app.log`, { flags: 'a' });
const errorStream = fs.createWriteStream(`${logDir}/error.log`, { flags: 'a' });

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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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

// ---------------- RUTA PARA INICIAR TEST ----------------
app.post('/api/webpagetest/run', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      log('No se proporcionó URL.', 'error');
      return res.status(400).json({ success: false, message: 'URL no proporcionada.' });
    }

    log(`URL recibida: ${url}`);

    const test = await new Promise((resolve, reject) => {
      wpt.runTest(url, {
        lighthouse: true,
        pollResults: 5,
        timeout: 600,
        mobile: 0,
        video: 1,
        location: 'ec2-us-east-1:Chrome.Cable', // Ubicación específica para evitar bloqueos
        runs: 1, // Limitar a 1 ejecución para reducir carga
      }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    if (!test || !test.data || !test.data.id) {
      log('No se pudo iniciar la prueba. Respuesta WPT: ' + JSON.stringify(test), 'error');
      return res.status(500).json({ success: false, message: 'No se pudo iniciar el test.' });
    }

    const testId = test.data.id;
    const resultUrl = test.data.summary;

    // Guardar timestamp para limpieza
    analysisStatus.set(testId, {
      timestamp: Date.now(),
      status: 'pending'
    });

    log(`Test iniciado. Test ID: ${testId}`);
    log(`URL resultados WebPageTest: ${resultUrl}`);

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
    log(`Error inesperado ejecutando test: ${error.message}`, 'error');
    res.status(500).json({ success: false, message: 'Error inesperado ejecutando test.' });
  }
});

// ---------------- RUTA PARA OBTENER RESULTADOS DE WEBPAGETEST ----------------
app.get('/api/webpagetest/results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      log('No se proporcionó testId.', 'error');
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    const resultUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}`;
    let response;
    let contentType;
    let resultData;
    let retries = 12;
    
    const testStartTime = Date.now();
    const minWaitTime = 60000;
    
    while (retries > 0) {
      const elapsedTime = Date.now() - testStartTime;
      if (elapsedTime < minWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      try {
        response = await fetch(resultUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("text/html")) {
          log(`Esperando verificación de seguridad (${Math.floor(elapsedTime/1000)}s)`);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
          continue;
        }
        
        if (contentType && contentType.includes("application/json")) {
          resultData = await response.json();
          
          if (resultData.statusCode === 100 || resultData.statusText?.includes("Testing is in progress")) {
            log(`Test en progreso (${Math.floor(elapsedTime/1000)}s)`);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
            continue;
          }
          
          break;
        }
      } catch (error) {
        log(`Error en intento ${13-retries}: ${error.message}`, 'error');
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }

    if (!contentType || !contentType.includes("application/json")) {
      return res.status(202).json({ 
        status: 'pending', 
        message: 'El test está en proceso. Por favor, espere unos minutos.',
        elapsedTime: Math.floor((Date.now() - testStartTime)/1000),
        retriesLeft: retries
      });
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
      
      // Actualizar estado en el Map
      analysisStatus.set(testId, {
        timestamp: Date.now(),
        status: 'complete',
        resumen
      });
      
      return res.status(200).json({ status: 'complete', resumen });
    } else if (resultData.statusCode === 100) {
      return res.status(200).json({ 
        status: 'pending', 
        message: 'El test sigue en proceso. Por favor, espere.',
        elapsedTime: Math.floor((Date.now() - testStartTime)/1000),
        retriesLeft: retries
      });
    } else {
      log(`Estado inesperado WebPageTest: ${resultData.statusText || resultData.statusCode}`, 'error');
      return res.status(500).json({ success: false, message: 'Error en los resultados del test.' });
    }
  } catch (error) {
    log(`Error inesperado trayendo resultados: ${error.message}`, 'error');
    res.status(500).json({ success: false, message: 'Error trayendo resultados.' });
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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