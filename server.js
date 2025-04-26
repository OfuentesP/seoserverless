import dotenv from 'dotenv';
dotenv.config(); // 🔥 PRIMERO que todo

import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import webPageTest from 'webpagetest';

const app = express();
const PORT = process.env.PORT || 3000;

const wpt = webPageTest('www.webpagetest.org', process.env.WPT_API_KEY);

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'dist')));

// --------------------- RUTA PARA INICIAR TEST ---------------------
app.post('/api/run-test', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      console.error('❌ No se proporcionó URL.');
      return res.status(400).json({ success: false, message: 'URL no proporcionada.' });
    }

    console.log('--------------------------------------');
    console.log('🌎 URL recibida en el servidor:', url);
    console.log('🔑 API Key cargada:', process.env.WPT_API_KEY ? '✅ OK' : '❌ Faltante');
    console.log('--------------------------------------');

    const test = await new Promise((resolve, reject) => {
      wpt.runTest(url, {
        lighthouse: true,
        pollResults: 5,
        timeout: 600
      }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    if (!test || !test.data || !test.data.id) {
      console.error('❌ No se pudo iniciar la prueba. Respuesta WPT:', test);
      return res.status(500).json({ success: false, message: 'No se pudo iniciar la prueba en WebPageTest.' });
    }


const testId = test.data.id;
 const resultUrl = test.data.summary; // 💡 Ya viene lista la URL resumen

    console.log('✅ Test iniciado. ID:', testId);
    console.log('🔗 URL resultados:', resultUrl);

    res.json({
      success: true,
      resumen: {
        loadTime: null,
        SpeedIndex: null,
        TTFB: null,
        detalles: resultUrl,
        testId: testId,
      }
    });

  } catch (error) {
    console.error('❌ Error inesperado ejecutando análisis:', error);
    res.status(500).json({ success: false, message: 'Error inesperado ejecutando análisis.' });
  }
});

// --------------------- RUTA PARA TRAER LIGHTHOUSE DESDE WPT ---------------------
app.get('/api/lighthouse/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      console.error('❌ No se proporcionó testId.');
      return res.status(400).json({ success: false, message: 'No se proporcionó testId.' });
    }

    const lighthouseUrl = `https://www.webpagetest.org/lighthouse.php?test=${testId}&run=1&f=json`;

    console.log('🌐 Consultando Lighthouse en:', lighthouseUrl);

    const response = await fetch(lighthouseUrl);

    if (!response.ok) {
      console.error('❌ Error HTTP consultando Lighthouse:', response.status, response.statusText);
      return res.status(500).json({ success: false, message: 'Error consultando Lighthouse.' });
    }

    const lighthouseData = await response.json();
    console.log('📦 Respuesta Lighthouse cruda:', JSON.stringify(lighthouseData, null, 2));

    if (lighthouseData?.lhr?.categories) {
      res.json({ lighthouse: lighthouseData.lhr });
    } else {
      console.warn('⚠️ Lighthouse no tiene categorías válidas:', lighthouseData);
      res.status(500).json({ success: false, message: 'Lighthouse sin datos válidos.' });
    }
  } catch (error) {
    console.error('❌ Error inesperado trayendo Lighthouse:', error);
    res.status(500).json({ success: false, message: 'Error inesperado trayendo Lighthouse.' });
  }
});

// --------------------- REDIRECCIÓN GENERAL ---------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

// --------------------- INICIAR SERVIDOR ---------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});