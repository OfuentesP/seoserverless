import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

// Configuración de axios para este módulo
const axiosInstance = axios.create({
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para reintentos
axiosInstance.interceptors.response.use(null, async (error) => {
  const { config } = error;
  config.retryCount = config.retryCount || 0;
  
  if (config.retryCount < 3) {
    config.retryCount += 1;
    await new Promise(resolve => setTimeout(resolve, 1000 * config.retryCount));
    return axiosInstance(config);
  }
  
  return Promise.reject(error);
});

// Limitar el número de tests simultáneos
let activeTests = 0;
const MAX_CONCURRENT_TESTS = 2;
const POLLING_INTERVAL = 20000; // 20 segundos entre intentos

// Control de rate limiting
const requestTimestamps = [];
const MAX_REQUESTS_PER_HOUR = 30; // Limitar a 30 solicitudes por hora
const HOUR_IN_MS = 60 * 60 * 1000;

// Función para verificar si estamos siendo rate limited
const isRateLimited = () => {
  const now = Date.now();
  const oneHourAgo = now - HOUR_IN_MS;
  
  // Limpiar timestamps antiguos
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneHourAgo) {
    requestTimestamps.shift();
  }
  
  // Verificar si hemos excedido el límite
  return requestTimestamps.length >= MAX_REQUESTS_PER_HOUR;
};

// Función para registrar una solicitud
const recordRequest = () => {
  requestTimestamps.push(Date.now());
};

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
    webpagetestUrl: null,
    error: null
  });
  
  // Initialize lighthouse with safe default values
  const lighthouse = ref({
    audits: {},
    categories: {},
    fetchTime: null,
    finalUrl: null,
    error: null
  });
  
  const lighthouseCategorias = ref([]);
  const sitemapResults = ref(null);

  // Progress tracking variables
  const isLoading = ref(false);
  const progress = ref(0);
  const currentStep = ref('');
  const isBlocked = ref(false);
  const blockMessage = ref('');

  // Computed values for checking errors
  const hasError = computed(() => resumen.value.error !== null);
  const errorMessage = computed(() => resumen.value.error?.message || 'Error desconocido');

  // Add new computed properties for safe data access
  const lighthouseAudits = computed(() => lighthouse.value?.audits || {});
  const lighthouseCategories = computed(() => lighthouse.value?.categories || {});
  
  // Add validation helper
  const validateLighthouseData = (data) => {
    if (!data) {
      console.error('[useSeoAnalysis] ❌ Lighthouse data is null or undefined');
      return false;
    }
    
    if (!data.audits) {
      console.error('[useSeoAnalysis] ❌ Lighthouse audits are missing');
      return false;
    }
    
    if (!data.categories) {
      console.error('[useSeoAnalysis] ❌ Lighthouse categories are missing');
      return false;
    }
    
    return true;
  };

  let inicioTimestamp = null;

  // Función para esperar un tiempo determinado
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Función para verificar si estamos bloqueados
  const isBlockedByWebPageTest = (response) => {
    // Verificar si recibimos una página HTML en lugar de JSON
    const contentType = response.headers?.['content-type'];
    if (contentType && contentType.includes('text/html')) {
      return true;
    }
    
    // Verificar códigos de estado que indican bloqueo
    if (response.status === 429 || response.status === 403) {
      return true;
    }
    
    return false;
  };

  // Función para verificar resultados de WebPageTest con reintentos inteligentes
  const checkWebPageTestResults = async (testId) => {
    try {
      // Verificar rate limiting antes de hacer la solicitud
      if (isRateLimited()) {
        const waitTime = HOUR_IN_MS - (Date.now() - requestTimestamps[0]);
        console.log(`[useSeoAnalysis] ⚠️ Rate limit alcanzado. Esperando ${Math.ceil(waitTime/1000/60)} minutos...`);
        estado.value = `⏳ Límite de solicitudes alcanzado. Esperando ${Math.ceil(waitTime/1000/60)} minutos...`;
        await wait(Math.min(waitTime, 300000)); // Esperar máximo 5 minutos
        return { status: 'pending' };
      }
      
      recordRequest();
      console.log(`[useSeoAnalysis] 🔍 Consultando resultados para testId: ${testId}`);
      
      try {
        const response = await axios.get(`/api/webpagetest/results/${testId}`);
        
        // Verificar si estamos bloqueados
        if (isBlockedByWebPageTest(response)) {
          console.error(`[useSeoAnalysis] ❌ Bloqueado por WebPageTest. Código: ${response.status}`);
          isBlocked.value = true;
          blockMessage.value = 'WebPageTest ha bloqueado temporalmente las solicitudes. Por favor, intente más tarde.';
          return { status: 'error', message: 'Bloqueado por WebPageTest' };
        }
        
        if (response.status === 202 || response.data.status === 'pending') {
          console.log(`[useSeoAnalysis] ⏳ Test en progreso, esperando ${POLLING_INTERVAL/1000} segundos...`);
          estado.value = `⏳ Test en progreso (${Math.floor((Date.now() - inicioTimestamp)/1000)}s)`;
          await wait(POLLING_INTERVAL);
          return { status: 'pending' };
        }

        if (response.data.status === 'complete') {
          console.log(`[useSeoAnalysis] ✅ Test completado después de ${Math.floor((Date.now() - inicioTimestamp)/1000)}s`);
          return { status: 'complete', data: response.data.resumen };
        }

        // Manejar otros estados
        console.error(`[useSeoAnalysis] ❌ Estado inesperado: ${response.data.status || 'unknown'}`);
        return { 
          status: 'error', 
          message: `Estado inesperado: ${response.data.message || 'Error desconocido'}`
        };
      } catch (axiosError) {
        console.error('[useSeoAnalysis] ❌ Error en la solicitud:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        });
        
        // Verificar si el error es por bloqueo
        if (axiosError.response && (axiosError.response.status === 429 || axiosError.response.status === 403)) {
          isBlocked.value = true;
          blockMessage.value = 'WebPageTest ha bloqueado temporalmente las solicitudes. Por favor, intente más tarde.';
          return { status: 'error', message: 'Bloqueado por WebPageTest' };
        }
        
        // Si es un error 500, intentar reintentar después de un tiempo
        if (axiosError.response?.status === 500) {
          console.log('[useSeoAnalysis] ⚠️ Error 500, reintentando en 5 segundos...');
          await wait(5000);
          return { status: 'pending' };
        }
        
        return { 
          status: 'error', 
          message: axiosError.response?.data?.message || axiosError.message 
        };
      }
    } catch (error) {
      console.error('[useSeoAnalysis] ❌ Error inesperado:', error);
      return { 
        status: 'error', 
        message: error.message || 'Error desconocido'
      };
    }
  };

  // The function that handles the analysis of the SEO data
  async function analizar(inputUrl) {
    // Verificar si ya hay demasiados tests en progreso
    if (activeTests >= MAX_CONCURRENT_TESTS) {
      const error = new Error('Demasiados tests en progreso. Por favor, espere a que se complete uno.');
      console.error(`[useSeoAnalysis] ❌ ${error.message}`);
      resumen.value.error = error;
      return;
    }
    
    // Verificar si estamos bloqueados
    if (isBlocked.value) {
      const error = new Error(blockMessage.value || 'WebPageTest ha bloqueado temporalmente las solicitudes.');
      console.error(`[useSeoAnalysis] ❌ ${error.message}`);
      resumen.value.error = error;
      return;
    }

    console.log(`[useSeoAnalysis] 🚀 Iniciando análisis para: ${inputUrl}`);
    inicioTimestamp = Date.now();
    console.log(`[useSeoAnalysis] ⏱️ Inicio análisis: ${new Date(inicioTimestamp).toISOString()}`);

    isLoading.value = true;
    progress.value = 0;
    currentStep.value = 'Iniciando análisis...';
    resumen.value.error = null;
    url.value = inputUrl;
    sitemapResults.value = null;
    lighthouse.value = { audits: {}, categories: {}, fetchTime: null, finalUrl: null, error: null };
    estado.value = '';

    try {
      activeTests++;
      
      // Step 1: WebPageTest Analysis
      console.log(`[useSeoAnalysis] 📊 Ejecutando WebPageTest...`);
      
      // Verificar rate limiting antes de iniciar el test
      if (isRateLimited()) {
        const waitTime = HOUR_IN_MS - (Date.now() - requestTimestamps[0]);
        throw new Error(`Límite de solicitudes alcanzado. Por favor, intente en ${Math.ceil(waitTime/1000/60)} minutos.`);
      }
      
      recordRequest();
      
      try {
        const testResponse = await axiosInstance.post('/api/webpagetest/run', { 
          url: inputUrl 
        }, {
          timeout: 60000, // 60 segundos para esta llamada específica
          headers: {
            'Accept': 'application/json'
          }
        });
        
        // Verificar si estamos bloqueados
        if (isBlockedByWebPageTest(testResponse)) {
          throw new Error('WebPageTest ha bloqueado temporalmente las solicitudes. Por favor, intente más tarde.');
        }
        
        const testId = testResponse.data.testId;
        console.log(`[useSeoAnalysis] ✅ WebPageTest iniciado. ID: ${testId}`);

        progress.value = 20;
        currentStep.value = 'Obteniendo resultados de WebPageTest...';
        estado.value = '⏳ Esperando resultados de WebPageTest...';

        // Polling para resultados con reintentos inteligentes
        let webpagetestResults = null;
        let pollingAttempts = 0;
        const maxPollingAttempts = 30; // 10 minutos si el intervalo es 20s
        
        while (pollingAttempts < maxPollingAttempts) {
          const result = await checkWebPageTestResults(testId);
          
          if (result.status === 'complete') {
            webpagetestResults = result.data;
            break;
          } else if (result.status === 'error') {
            throw new Error(`Error en WebPageTest: ${result.message}`);
          }
          
          pollingAttempts++;
          progress.value = 20 + Math.min(20, (pollingAttempts / maxPollingAttempts) * 20);
        }
        
        if (!webpagetestResults) {
          throw new Error('Timeout esperando resultados de WebPageTest');
        }
        
        console.log('🔍 [WebPageTest] Resultados completos:', JSON.stringify(webpagetestResults, null, 2));
        console.log('🔍 [WebPageTest] Estructura de datos:', {
          data: webpagetestResults.data ? 'present' : 'missing',
          median: webpagetestResults.data?.median ? 'present' : 'missing',
          firstView: webpagetestResults.data?.median?.firstView ? 'present' : 'missing'
        });

        progress.value = 40;
        currentStep.value = 'Obteniendo resultados de Lighthouse...';

        // Step 2: Lighthouse Results - Esperar hasta que esté listo
        let lighthouseData = null;
        let lighthouseRetries = 12; // 1 minuto de intentos (12x5s)
        
        while (lighthouseRetries > 0) {
          const lighthouseResponse = await obtenerLighthouseDesdeBackend(testId);
          if (lighthouseResponse) {
            lighthouseData = lighthouse.value;
            break;
          }
          console.log(`[useSeoAnalysis] ⏳ Lighthouse aún no está listo (${lighthouseRetries} intentos restantes)`);
          lighthouseRetries--;
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
        }

        if (!lighthouseData) {
          console.log('[useSeoAnalysis] ⚠️ No se pudieron obtener resultados de Lighthouse');
        } else {
          console.log('[useSeoAnalysis] ✅ Lighthouse resultados obtenidos');
        }

        const metrics = lighthouseData?.audits || {};
        console.log('🔍 [Lighthouse] Métricas detalladas:', {
          lcp: {
            raw: metrics['largest-contentful-paint'],
            value: metrics['largest-contentful-paint']?.numericValue,
            displayValue: metrics['largest-contentful-paint']?.displayValue,
            exists: !!metrics['largest-contentful-paint']
          },
          cls: {
            raw: metrics['cumulative-layout-shift'],
            value: metrics['cumulative-layout-shift']?.numericValue,
            displayValue: metrics['cumulative-layout-shift']?.displayValue,
            exists: !!metrics['cumulative-layout-shift']
          },
          tbt: {
            raw: metrics['total-blocking-time'],
            value: metrics['total-blocking-time']?.numericValue,
            displayValue: metrics['total-blocking-time']?.displayValue,
            exists: !!metrics['total-blocking-time']
          }
        });

        const resumenTemp = {
          url: webpagetestResults.url || webpagetestResults.testUrl || null,
          lcp: webpagetestResults.lcp ?? webpagetestResults.data?.median?.firstView?.largestContentfulPaint ?? metrics['largest-contentful-paint']?.numericValue ?? null,
          cls: webpagetestResults.cls ?? webpagetestResults.data?.median?.firstView?.['chromeUserTiming.CumulativeLayoutShift'] ?? metrics['cumulative-layout-shift']?.numericValue ?? null,
          tbt: metrics['total-blocking-time']?.numericValue ?? null,
          fcp: webpagetestResults.fcp ?? null,
          si: webpagetestResults.SpeedIndex ?? null,
          ttfb: webpagetestResults.TTFB ?? null,
          loadTime: webpagetestResults.loadTime ?? null,
          webpagetestUrl: webpagetestResults.detalles ?? null,
          totalSize: webpagetestResults.totalSize ?? null,
          requests: webpagetestResults.requests ?? null
        };

        console.log('🔍 [WebPageTest] CLS detallado:', {
          raw: webpagetestResults.cls,
          firstView: webpagetestResults.data?.median?.firstView?.['chromeUserTiming.CumulativeLayoutShift'],
          lighthouse: metrics['cumulative-layout-shift']?.numericValue,
          final: resumenTemp.cls
        });

        console.log(`[useSeoAnalysis] 🔍 Resumen temporal completo:`, JSON.stringify(resumenTemp, null, 2));
        resumen.value = resumenTemp;
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

        // Debug logs
        console.log('[DEBUG] Resumen WebPageTest recibido:', resumen);
        console.log('[DEBUG] Estado que se va a guardar en la ruta:', {
          resumen,
          lighthouse,
          sitemapResults,
          estado: estado.value
        });

      } catch (error) {
        console.error('[useSeoAnalysis] ❌ Error iniciando test:', error);
        if (error.code === 'ECONNABORTED') {
          throw new Error('La solicitud ha tardado demasiado. Por favor, intente nuevamente.');
        }
        throw error;
      }

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
      activeTests--;
    }
  }

  async function obtenerLighthouseDesdeBackend(testId) {
    try {
      console.log(`[useSeoAnalysis] 🔍 Obteniendo datos de Lighthouse para testId: ${testId}`);
      const response = await axiosInstance.get(`/api/lighthouse/${testId}`);
      
      if (!response.data) {
        throw new Error('No se recibieron datos de Lighthouse');
      }

      // Validate the lighthouse data
      if (!validateLighthouseData(response.data)) {
        throw new Error('Datos de Lighthouse incompletos o inválidos');
      }

      // Safely update the lighthouse ref with validated data
      lighthouse.value = {
        audits: response.data.audits || {},
        categories: response.data.categories || {},
        fetchTime: response.data.fetchTime || null,
        finalUrl: response.data.finalUrl || url.value,
        error: null
      };

      // Update categories safely
      lighthouseCategorias.value = Object.entries(response.data.categories || {}).map(([key, value]) => ({
        id: key,
        title: value.title || 'Unknown',
        score: value.score || 0
      }));

      return true;
    } catch (error) {
      console.error('[useSeoAnalysis] ❌ Error obteniendo datos de Lighthouse:', error);
      
      // Set error state in lighthouse ref
      lighthouse.value = {
        audits: {},
        categories: {},
        fetchTime: null,
        finalUrl: null,
        error: extractErrorDetails(error)
      };
      
      return false;
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
    lighthouseAudits,
    lighthouseCategories,
    lighthouseCategorias,
    sitemapResults,
    isLoading,
    progress,
    currentStep,
    isBlocked,
    blockMessage,
    hasError,
    errorMessage,
    analizar
  };
}

export default useSeoAnalysis;