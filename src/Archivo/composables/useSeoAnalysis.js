import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

export function useSeoAnalysis() {
  const router = useRouter();
  
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
  const cargando = ref(false);
  const geminiInsight = ref(null);
  const lighthouseCategorias = ref([]);
  const sitemapResults = ref(null);
  
  const getScoreClass = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const isLoading = ref(false);
  const progress = ref(0);
  const currentStep = ref('');
  
  const hasError = computed(() => resumen.value.error !== null);
  const errorMessage = computed(() => resumen.value.error?.message || 'Error desconocido');
  
  async function analizar(inputUrl) {
    console.log(`[useSeoAnalysis] 🚀 Iniciando análisis para: ${inputUrl}`);
    isLoading.value = true;
    progress.value = 0;
    currentStep.value = 'Iniciando análisis...';
    resumen.value.error = null;
    url.value = inputUrl;
    geminiInsight.value = null;
    sitemapResults.value = null;
    lighthouse.value = null;
    estado.value = '';
    
    try {
      // Paso 1: Ejecutar WebPageTest
      console.log(`[useSeoAnalysis] 📊 Paso 1/4: Ejecutando WebPageTest...`);
      currentStep.value = 'Ejecutando prueba de rendimiento...';
      progress.value = 25;
      
      const testResponse = await axios.post('/api/webpagetest/run', { url: inputUrl });
      const testId = testResponse.data.testId;
      console.log(`[useSeoAnalysis] ✅ WebPageTest iniciado. ID: ${testId}`);
      
      // Paso 2: Obtener resultados de WebPageTest
      console.log(`[useSeoAnalysis] 📊 Paso 2/4: Obteniendo resultados de WebPageTest...`);
      currentStep.value = 'Obteniendo resultados de rendimiento...';
      progress.value = 50;
      
      const webpagetestResponse = await axios.get(`/api/webpagetest/results/${testId}`);
      const webpagetestResults = webpagetestResponse.data;
      console.log(`[useSeoAnalysis] ✅ Resultados WebPageTest obtenidos:`, webpagetestResults);
      
      // Paso 3: Obtener resultados de Lighthouse
      console.log(`[useSeoAnalysis] 📊 Paso 3/4: Obteniendo resultados de Lighthouse...`);
      currentStep.value = 'Obteniendo resultados de Lighthouse...';
      progress.value = 75;
      
      const lighthouseResponse = await axios.get(`/api/lighthouse/results/${testId}`);
      const lighthouseResults = lighthouseResponse.data;
      lighthouse.value = lighthouseResults;
      console.log(`[useSeoAnalysis] ✅ Resultados Lighthouse obtenidos:`, lighthouseResults);
      
      // Extraer Core Web Vitals
      console.log(`[useSeoAnalysis] 🔍 Extrayendo Core Web Vitals...`);
      const metrics = lighthouseResults?.audits || {};
      
      // Extraer métricas específicas
      const lcp = metrics['largest-contentful-paint']?.numericValue;
      const cls = metrics['cumulative-layout-shift']?.numericValue;
      const tbt = metrics['total-blocking-time']?.numericValue;
      const fcp = metrics['first-contentful-paint']?.numericValue;
      const si = metrics['speed-index']?.numericValue;
      
      console.log(`[useSeoAnalysis] 📊 Core Web Vitals extraídos:`, {
        lcp,
        cls,
        tbt,
        fcp,
        si
      });
      
      // Actualizar el resumen y el frontend inmediatamente
      resumen.value = {
        url: webpagetestResults.url || webpagetestResults.testUrl || null,
        lcp: lcp || null,
        cls: cls || null,
        tbt: tbt || null,
        fcp: fcp || null,
        si: si || null,
        ttfb: webpagetestResults.TTFB || null,
        loadTime: webpagetestResults.loadTime || null,
        webpagetestUrl: webpagetestResults.detalles || null,
        totalSize: webpagetestResults.totalSize || null,
        requests: webpagetestResults.requests || null
      };
      console.log('[useSeoAnalysis] 📝 Resumen enviado al frontend:', resumen.value);
      estado.value = '✅ Datos de WebPageTest y Lighthouse listos.';
      
      // Paso 4: Analizar sitemap (en paralelo, no bloquea el frontend)
      (async () => {
        try {
          console.log(`[useSeoAnalysis] 📊 Paso 4/4: Analizando sitemap...`);
          currentStep.value = 'Analizando estructura del sitio...';
          progress.value = 90;
          const sitemapResponse = await axios.post('/api/sitemap/analyze', { url: inputUrl });
          sitemapResults.value = sitemapResponse.data;
          console.log(`[useSeoAnalysis] ✅ Resultados del sitemap obtenidos:`, sitemapResults.value);
        } catch (sitemapError) {
          console.error(`[useSeoAnalysis] ⚠️ Error al analizar sitemap: ${sitemapError.message}`);
          sitemapResults.value = {
            type: 'error',
            error: sitemapError.message
          };
        }
      })();
      
      // Paso 5: Generar insights con Gemini (solo si hay datos previos)
      if (webpagetestResults && lighthouseResults) {
        try {
          console.log(`[useSeoAnalysis] 🤖 Generando insights con Gemini...`);
          currentStep.value = 'Generando análisis con IA...';
          progress.value = 95;
          const insightsResponse = await axios.post('/api/gemini/analyze', {
            url: inputUrl,
            webpagetest: webpagetestResults,
            lighthouse: lighthouseResults,
            sitemap: sitemapResults.value
          });
          geminiInsight.value = insightsResponse.data;
          console.log(`[useSeoAnalysis] ✅ Insights generados:`, geminiInsight.value);
        } catch (geminiError) {
          console.error(`[useSeoAnalysis] ⚠️ Error al generar insights: ${geminiError.message}`);
          geminiInsight.value = {
            summary: "No se pudo generar el análisis con IA debido a un error.",
            problems: [],
            recommendations: [],
            actionItems: []
          };
        }
      }
      
      // Análisis completado
      console.log(`[useSeoAnalysis] ✅ Análisis completado con éxito`);
      currentStep.value = 'Análisis completado';
      progress.value = 100;
      estado.value = '✅ Análisis completado.';
      router.push('/resultados');
    } catch (error) {
      console.error(`[useSeoAnalysis] ❌ Error en análisis: ${error.message}`);
      console.error(`[useSeoAnalysis] 🔍 Stack trace: ${error.stack}`);
      
      // Determinar el tipo de error
      let errorMessage = 'Error desconocido';
      if (error.message.includes('NetworkError') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Error de red. Verifica tu conexión o intenta más tarde.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Tiempo de espera agotado. El servidor está tardando demasiado en responder.';
      } else if (error.message.includes('404')) {
        errorMessage = 'No se pudo acceder al sitio. Verifica que la URL sea correcta.';
      } else if (error.message.includes('403')) {
        errorMessage = 'Acceso denegado. El sitio no permite el análisis.';
      }
      
      resumen.value.error = {
        message: errorMessage,
        details: error.message
      };
      
      currentStep.value = 'Error en el análisis';
      progress.value = 0;
      estado.value = errorMessage;
    } finally {
      isLoading.value = false;
    }
  }
  
  return {
    url,
    estado,
    resumen,
    lighthouse,
    cargando,
    geminiInsight,
    lighthouseCategorias,
    getScoreClass,
    sitemapResults,
    isLoading,
    progress,
    currentStep,
    hasError,
    errorMessage,
    analizar
  };
}

// Exportar la función directamente
export default useSeoAnalysis;