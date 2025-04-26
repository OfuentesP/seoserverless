require('dotenv').config();
const fetch = require('node-fetch');

const url = 'https://www.amoble.cl'; // o cualquier sitio que quieras probar
const apiKey = process.env.PAGESPEED_API_KEY;

if (!apiKey) {
  console.error('❌ No se encontró la API Key');
  process.exit(1);
}

const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile`;

fetch(endpoint)
  .then(res => res.json())
  .then(data => {
    if (data.lighthouseResult) {
      console.log('✅ API funcionando correctamente.');
      console.log('Puntaje SEO:', data.lighthouseResult.categories.seo?.score);
    } else {
      console.error('❌ La API respondió con un error:', data);
    }
  })
  .catch(err => {
    console.error('❌ Error de red o API:', err);
  });