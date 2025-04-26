// runAndFetchWPT.js
import { config } from 'dotenv';
import WebPageTest from 'webpagetest';

config();

const wpt = new WebPageTest('https://www.webpagetest.org/', process.env.WPT_API_KEY);

async function analizarSitio(url) {
  console.log(`🚀 Iniciando prueba para: ${url}`);

  // 1. Iniciar la prueba
  const { data } = await wpt.runTest(url, {
    location: 'Dulles:Chrome',
    runs: 1,
    firstViewOnly: true,
    f: 'json'
  });

  console.log(`✅ Prueba iniciada. ID: ${data.testId}`);
  console.log(`🔗 Puedes seguirla aquí: ${data.userUrl}`);

  // 2. Esperar resultados
  console.log('⏳ Esperando resultados...');

  const resultado = await esperarResultados(data.testId);

  // 3. Mostrar resumen de resultados
  console.log('✅ Resultados listos:');
  console.log(`📈 Tiempo de carga total: ${resultado.data.average.firstView.loadTime} ms`);
  console.log(`📈 Speed Index: ${resultado.data.average.firstView.SpeedIndex} ms`);
  console.log(`📉 TTFB (Time To First Byte): ${resultado.data.average.firstView.TTFB} ms`);
}

async function esperarResultados(testId, intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    const { statusCode, statusText, data } = await wpt.getTestStatus(testId);

    if (statusCode === 200) {
      console.log('✅ Prueba completada.');
      const resultados = await wpt.getTestResults(testId);
      return resultados;
    } else if (statusCode === 100) {
      console.log(`⏳ En cola o ejecutándose... (${i + 1}/${intentos})`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // esperar 5 segundos
    } else {
      throw new Error(`❌ Estado inesperado: ${statusCode} ${statusText}`);
    }
  }
  throw new Error('⏰ Timeout esperando resultados de WebPageTest');
}

// Puedes cambiar la URL aquí o recibirla como parámetro
const url = 'https://www.example.com';
analizarSitio(url);