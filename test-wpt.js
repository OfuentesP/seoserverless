// test-wpt.js
import { config } from 'dotenv';
import WebPageTest from 'webpagetest';

config();

const wpt = new WebPageTest('https://www.webpagetest.org/', process.env.WPT_API_KEY);

const testUrl = 'https://www.example.com';

wpt.runTest(testUrl, {
  location: 'Dulles:Chrome',
  runs: 1,
  firstViewOnly: true,
  f: 'json'
}, (err, data) => {
  if (err) {
    console.error('❌ Error al iniciar la prueba:', err);
  } else {
    console.log('✅ Prueba iniciada con éxito. ID de prueba:', data.data.testId);
    console.log('URL de resultados:', data.data.userUrl);
  }
});