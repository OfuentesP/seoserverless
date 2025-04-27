import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

export function useSeoAnalysis() {
  const router = useRouter();
  
  // Define all the reactive variables to store data
  const url = ref('');
  const estado = ref('');
  const resumen = ref({
    lcp: null,
    cls: null,
    tbt: null,
    fcp: null,
    si: null,
    ttfb: null,
    loadTime: null,
    webpagetestUrl: null
  });
  const lighthouse = ref(null);
  const lighthouseCategorias = ref([]);
  const sitemapResults = ref(null);

  // Progress tracking variables
  const isLoading = ref(false);
  const progress = ref(0);
  const currentStep = ref('');

  // Computed values for checking errors
  const hasError = computed(() => resumen.value.error !== null);
  const errorMessage = computed(() => resumen.value.error?.message || 'Error desconocido');

  let inicioTimestamp = null;

  // The function that handles the analysis of the SEO data
  async function analizar(inputUrl) {
    console.log(`[useSeoAnalysis] 🚀 Iniciando análisis para: ${inputUrl}`);
    inicioTimestamp = Date.now();
    console.log(`[useSeoAnalysis] ⏱️ Inicio análisis: ${new Date(inicioTimestamp).toISOString()}`);

    isLoading.value = true;
    progress.value = 0;
    currentStep.value = 'Iniciando análisis...';
    resumen.value.error = null;
    url.value = inputUrl;
    sitemapResults.value = null;
    lighthouse.value = null;
    estado.value = '';

    try {
      // Step 1: WebPageTest Analysis
      console.log(`[useSeoAnalysis] 📊 Ejecutando WebPageTest...`);
      const testResponse = await axios.post('/api/webpagetest/run', { url: inputUrl });
      const testId = testResponse.data.testId;
      console.log(`[useSeoAnalysis] ✅ WebPageTest iniciado. ID: ${testId}`);

      progress.value = 20;
      currentStep.value = 'Obteniendo resultados de WebPageTest...';

      const webpagetestResponse = await axios.get(`/api/webpagetest/results/${testId}`);
      const webpagetestResults = webpagetestResponse.data;
      console.log(`[useSeoAnalysis] ✅ WebPageTest resultados:`, webpagetestResults);

      progress.value = 40;
      currentStep.value = 'Obteniendo resultados de Lighthouse...';

      // Step 2: Lighthouse Results
      const lighthouseResponse = await axios.get(`/api/lighthouse/results/${testId}`);
      lighthouse.value = lighthouseResponse.data;
      console.log(`[useSeoAnalysis] ✅ Lighthouse resultados:`, lighthouse.value);

      const metrics = lighthouse.value?.audits || {};
      resumen.value = {
        url: webpagetestResults.url || webpagetestResults.testUrl || null,
        lcp: metrics['largest-contentful-paint']?.numericValue ?? null,
        cls: metrics['cumulative-layout-shift']?.numericValue ?? null,
        tbt: metrics['total-blocking-time']?.numericValue ?? null,
        fcp: metrics['first-contentful-paint']?.numericValue ?? null,
        si: metrics['speed-index']?.numericValue ?? null,
        ttfb: webpagetestResults.TTFB ?? null,
        loadTime: webpagetestResults.loadTime ?? null,
        webpagetestUrl: webpagetestResults.detalles ?? null,
        totalSize: webpagetestResults.totalSize ?? null,
        requests: webpagetestResults.requests ?? null
      };
      console.log(`[useSeoAnalysis] 📈 Core Web Vitals extraídos:`, resumen.value);

      estado.value = '✅ WebPageTest y Lighthouse OK';
      progress.value = 60;

      // Step 3: Sitemap Analysis
      console.log(`[useSeoAnalysis] 📊 Analizando Sitemap...`);
      try {
        const sitemapResponse = await axios.post('/api/sitemap/analyze', { url: inputUrl });
        sitemapResults.value = sitemapResponse.data;
        console.log(`[useSeoAnalysis] ✅ Sitemap resultados:`, sitemapResults.value);
      } catch (sitemapError) {
        console.error(`[useSeoAnalysis] ❌ Error analizando Sitemap:`, extractErrorDetails(sitemapError));
        sitemapResults.value = { error: sitemapError.message };
      }

      progress.value = 100;
      currentStep.value = 'Análisis completado';
      estado.value = '✅ Análisis completo';

      // Step 4: Navigation and passing data
      const finTimestamp = Date.now();
      console.log(`[useSeoAnalysis] 🕒 Fin análisis: ${new Date(finTimestamp).toISOString()}`);
      console.log(`[useSeoAnalysis] ⏱️ Tiempo total: ${((finTimestamp - inicioTimestamp) / 1000).toFixed(2)} segundos.`);

      await nextTick();

      // Deep clone the reactive objects to remove the Proxy
      const resumenPlano = JSON.parse(JSON.stringify(resumen.value));
      const lighthousePlano = JSON.parse(JSON.stringify(lighthouse.value));
      const sitemapResultsPlano = JSON.parse(JSON.stringify(sitemapResults.value));

      // Use the router.push() with the cloned data
      router.push({
        path: '/resultados',
        state: {
          resumen: resumenPlano,
          lighthouse: lighthousePlano,
          sitemapResults: sitemapResultsPlano,
          estado: estado.value
        }
      });

    } catch (error) {
      console.error(`[useSeoAnalysis] ❌ Error global:`, extractErrorDetails(error));
      resumen.value.error = {
        message: 'Error en el análisis: ' + error.message,
        details: error.stack
      };
      currentStep.value = 'Error en el análisis';
      progress.value = 0;
      estado.value = '❌ Error global en análisis';
    } finally {
      isLoading.value = false;
    }
  }

  // Function to extract error details for debugging
  function extractErrorDetails(error) {
    return {
      message: error.message,
      status: error.response?.status,
      response: error.response?.data,
      requestURL: error.config?.url
    };
  }

  return {
    url,
    estado,
    resumen,
    lighthouse,
    lighthouseCategorias,
    sitemapResults,
    isLoading,
    progress,
    currentStep,
    hasError,
    errorMessage,
    analizar
  };
}

export default useSeoAnalysis;