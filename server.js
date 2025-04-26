import dotenv from 'dotenv';
dotenv.config(); // Primero cargar variables de entorno

import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import webPageTest from 'webpagetest';

const app = express();
const PORT = process.env.PORT || 3000;

const wpt = webPageTest('www.webpagetest.org', process.env.WPT_API_KEY);

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'dist')));

// ---------------- RUTA PARA INICIAR TEST ----------------
app.post('/api/run-test', async (req, res) => {
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
      resumen: {
        loadTime: null,
        SpeedIndex: null,
        TTFB: null,
        detalles: resultUrl,
        testId: testId,
      }
    });

  } catch (error) {
    console.error('❌ Error inesperado ejecutando test:', error);
    res.status(500).json({ success: false, message: 'Error inesperado ejecutando test.' });
  }
});

// ---------------- RUTA PARA ESPERAR RESULTADOS Y LIGHTHOUSE ----------------
app.get('/api/lighthouse/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) {
      console.error('❌ No se proporcionó testId.');
      return res.status(400).json({ success: false, message: 'Test ID faltante.' });
    }

    const resultUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}`;
    const lighthouseUrl = `https://www.webpagetest.org/jsonResult.php?test=${testId}&lighthouse=1`;

    console.log('🌐 Verificando estado de test en:', resultUrl);

    let retries = 24; // Hasta 2 minutos
    let resultData;

    // 🔄 Primero esperar que el test WebPageTest esté listo
    while (retries > 0) {
      const response = await fetch(resultUrl);
      resultData = await response.json();

      if (resultData.statusCode === 200 && resultData.data?.runs) {
        console.log('✅ WebPageTest finalizado.');
        break;
      } else {
        console.log(`⏳ Test en progreso: ${resultData.statusText} (${retries} intentos restantes)`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
      }
    }

    if (!resultData || resultData.statusCode !== 200) {
      console.error('❌ Test no completado tras esperar.');
      return res.status(500).json({ success: false, message: 'El test no finalizó.' });
    }

    const firstView = resultData.data.runs['1'].firstView;

    const resumen = {
      loadTime: firstView.loadTime,
      SpeedIndex: firstView.SpeedIndex,
      TTFB: firstView.TTFB,
      detalles: resultData.data.summary,
      testId: testId,
    };

    console.log('📋 Resumen WebPageTest:', resumen);

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

    res.json({ resumen, lighthouse: lighthouseData });

  } catch (error) {
    console.error('❌ Error inesperado trayendo resultados:', error);
    res.status(500).json({ success: false, message: 'Error trayendo resultados.' });
  }
});

// ---------------- CATCH-ALL PARA FRONTEND ----------------
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

// ---------------- INICIAR SERVIDOR ----------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});