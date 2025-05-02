<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-4xl font-bold text-white pdf-text tracking-tight">🚀 Resultados de SEO</h1>
      <ExportButton 
        elementId="resultados-content" 
        :filename="`resultados-seo-${new Date().toISOString().split('T')[0]}.pdf`" 
      />
    </div>

    <p v-if="!resumen.loadTime" class="text-red-400 mb-4">
      No hay datos de SEO. Asegúrate de ejecutar un análisis primero.
    </p>

    <div id="resultados-content" class="p-8">
      <!-- Estado -->
      <div class="mb-8 flex items-center space-x-3 bg-gradient-to-r from-blue-900/30 to-transparent p-4 rounded-lg">
        <div class="flex items-center space-x-2">
          <span class="text-blue-400 text-xl animate-pulse">●</span>
          <p class="text-lg font-medium text-gray-200 pdf-text">{{ estado }}</p>
        </div>
        <span class="text-sm text-gray-400 pdf-text">
          {{ new Date().toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) }}
        </span>
      </div>

      <!-- Sección WebPageTest -->
      <section class="mb-8">
        <h2 class="text-2xl font-semibold mb-6 text-white pdf-text flex items-center">
          <span class="mr-3 text-blue-400">📊</span>
          Resumen WebPageTest
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Load Time</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(resumen.loadTime) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">TTFB</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(resumen.ttfb) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Total Size</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ resumen.totalSize ?? 'N/A' }} <span class="text-lg text-gray-400 pdf-text">bytes</span></p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Requests</p>
            <p class="text-3xl font-bold text-white pdf-text">
              {{ Array.isArray(resumenPlano.requests) ? resumenPlano.requests.length : (typeof resumenPlano.requests === 'number' ? resumenPlano.requests : 'N/A') }}
            </p>
          </div>
        </div>
        <div class="mt-6">
          <a
            :href="resumen.detalles || '#'"
            target="_blank"
            class="inline-flex items-center px-4 py-2 bg-blue-900/30 text-blue-300 rounded-lg hover:bg-blue-800/40 transition-colors"
          >
            <span class="mr-2">🔗</span>
            Ver detalles en WebPageTest
          </a>
        </div>
      </section>

      <!-- Sección Core Web Vitals -->
      <section class="mb-8">
        <h2 class="text-2xl font-semibold mb-6 text-white pdf-text flex items-center">
          <span class="mr-3 text-yellow-400">⚡</span>
          Core Web Vitals
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Time to First Byte (TTFB)</p>
            <p class="text-xs text-gray-400 mb-2">¿Qué tan rápido responde tu servidor? Un TTFB bajo mejora la experiencia y el SEO.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(resumen.ttfb) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Start Render</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuándo aparece el primer píxel? Un inicio rápido reduce el rebote.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(lighthouseAudits['render-start']?.numericValue) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">First Contentful Paint (FCP)</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuándo se muestra el primer contenido? Impacta la percepción de velocidad.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(resumen.fcp) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Speed Index</p>
            <p class="text-xs text-gray-400 mb-2">¿Qué tan rápido se ve la página completa? Un índice bajo mejora la satisfacción.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(resumen.si) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Largest Contentful Paint (LCP)</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuándo carga el elemento principal? Clave para la percepción de rapidez.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(resumen.lcp) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Cumulative Layout Shift (CLS)</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuánto se mueve el diseño al cargar? Un CLS bajo evita frustración y pérdida de ventas.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatCLS(resumen.cls) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Total Blocking Time (TBT)</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuánto tiempo la página no responde? Un TBT bajo mejora la interacción y conversión.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(resumen.tbt) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Page Weight</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuánto pesa la página? Un peso bajo acelera la carga y reduce el abandono.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ resumen.totalSize ? (resumen.totalSize / 1024).toFixed(0) + ' KB' : 'N/A' }}</p>
          </div>
        </div>
      </section>

      <!-- Sección Sitemap -->
      <section class="mb-8" v-if="sitemapData.totalUrls">
        <h2 class="text-2xl font-semibold mb-6 text-white pdf-text flex items-center">
          <span class="mr-3 text-green-400">🌐</span>
          Resultados Sitemap
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Total URLs</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ sitemapData.totalUrls ?? 'N/A' }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Errores 404</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ sitemapData.errors404 ?? 'N/A' }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Última modificación</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ sitemapData.lastModified ?? 'N/A' }}</p>
          </div>
        </div>
      </section>

      <!-- Sección Meta Analysis -->
      <section class="mb-8">
        <MetaAnalysis :url="resumen?.url || ''" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toRaw } from 'vue';
import ExportButton from '../components/ExportButton.vue';
import MetaAnalysis from '../components/MetaAnalysis.vue';
import ResultadosFCP from '../components/ResultadosFCP.vue';
import { useSeoAnalysis } from '../composables/useSeoAnalysis';

const router = useRouter();
const route = useRoute();

// Inicializar estado desde la ruta o el composable
const { resumen: safeResumen, estado: estadoComposable } = useSeoAnalysis();

// Estado local con valores por defecto
const estado = ref(route.state?.estado || estadoComposable.value || 'Cargando resultados...');
const resumen = ref(route.state?.resumen || safeResumen.value || {
  lcp: null,
  cls: null,
  tbt: null,
  fcp: null,
  si: null,
  ttfb: null,
  loadTime: null,
  webpagetestUrl: null
});

// Computed property para verificar si tenemos datos
const hasData = computed(() => {
  try {
    const hasResumen = resumen.value && Object.keys(resumen.value).length > 0;
    const hasWebPageTestData = resumen.value?.loadTime !== null || 
                              resumen.value?.totalSize !== null || 
                              resumen.value?.fcp !== null;
    
    console.log('🔍 [Resultados] Verificación de datos:', {
      hasResumen,
      hasWebPageTestData,
      resumen: resumen.value
    });
    
    return hasResumen && hasWebPageTestData;
  } catch (error) {
    console.error('❌ [Resultados] Error verificando datos:', error);
    return false;
  }
});

// Computed property para los resultados de WebPageTest
const webpagetestResults = computed(() => {
  try {
    const results = {
      ...resumen.value,
      fcp: resumen.value?.fcp,
      loadTime: resumen.value?.loadTime,
      ttfb: resumen.value?.ttfb,
      totalSize: resumen.value?.totalSize,
      requests: resumen.value?.requests
    };
    console.log('🔍 [Resultados] WebPageTest results procesados:', results);
    return results;
  } catch (error) {
    console.error('❌ [Resultados] Error procesando WebPageTest results:', error);
    return {};
  }
});

const lighthouseAudits = computed(() => route.state?.lighthouse?.audits || {});
const sitemapData = computed(() => route.state?.sitemapResults || {});

const getMetricColor = (value, type) => {
  if (!value) return 'text-gray-400';
  
  switch(type) {
    case 'lcp':
      return value <= 2500 ? 'text-green-400' : value <= 4000 ? 'text-yellow-400' : 'text-red-400';
    case 'cls':
      return value <= 0.1 ? 'text-green-400' : value <= 0.25 ? 'text-yellow-400' : 'text-red-400';
    case 'tbt':
      return value <= 300 ? 'text-green-400' : value <= 600 ? 'text-yellow-400' : 'text-red-400';
    default:
      return 'text-white';
  }
};

const formatSeconds = (value) => {
  console.log('[DEBUG] formatSeconds input:', value);
  console.log('[DEBUG] formatSeconds type:', typeof value);
  console.log('[DEBUG] Estado actual:', estado.value);
  
  // Si estamos en estado de error o el test está iniciando
  if (estado.value.includes('❌') || estado.value.includes('Iniciando')) {
    return '⏳ Analizando...';
  }
  
  // Si el valor es undefined/null
  if (value === undefined || value === null) {
    return estado.value.includes('Esperando') ? '⏳ Cargando...' : 'N/A';
  }
  
  // Si el valor no es un número
  if (isNaN(value)) {
    console.log('[DEBUG] formatSeconds: valor NaN');
    return 'N/A';
  }
  
  // Convertir a número y formatear
  const numValue = Number(value);
  if (numValue < 1000) {
    // Si es menor a 1 segundo, mostrar en milisegundos
    const result = numValue.toFixed(0) + 'ms';
    console.log('[DEBUG] formatSeconds result (ms):', result);
    return result;
  } else {
    // Si es mayor o igual a 1 segundo, mostrar en segundos
    const result = (numValue / 1000).toFixed(3) + 's';
    console.log('[DEBUG] formatSeconds result (s):', result);
    return result;
  }
};

const formatCLS = (value) => {
  console.log('[DEBUG] formatCLS input:', value);
  console.log('[DEBUG] formatCLS type:', typeof value);
  
  if (value === undefined || value === null) {
    console.log('[DEBUG] formatCLS: valor undefined/null');
    return 'N/A';
  }
  
  if (isNaN(value)) {
    console.log('[DEBUG] formatCLS: valor NaN');
    return 'N/A';
  }
  
  // Asegurarnos de que el valor sea un número
  const numValue = Number(value);
  
  // Si el valor es muy pequeño (menor que 0.0001), mostrar 0.0001
  if (numValue < 0.0001 && numValue > 0) {
    console.log('[DEBUG] formatCLS: valor muy pequeño, usando 0.0001');
    return '0.0001';
  }
  
  // Formatear a 4 decimales
  const result = numValue.toFixed(4);
  console.log('[DEBUG] formatCLS result:', result);
  return result;
};
</script>

<style scoped>
h1, h2 {
  color: #f8fafc;
}

a {
  transition: color 0.2s;
}

a:hover {
  color: #93c5fd;
}

#resultados-content {
  page-break-inside: avoid;
  background: transparent;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

@media print {
  #resultados-content {
    box-shadow: none;
    padding: 0;
  }
  #resultados-content, #resultados-content * {
    color: #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Selector aún más específico para títulos y text-white, usando selector de atributo */
  #resultados-content h1,
  #resultados-content h2,
  #resultados-content h3,
  #resultados-content h4,
  #resultados-content h5,
  #resultados-content h6,
  #resultados-content [class*='text-white'] {
    color: #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .text-green-400, .text-yellow-400, .text-red-400, .text-blue-400 {
    color: inherit !important;
  }
  .bg-gray-900\/50, .bg-blue-900\/30 {
    background-color: #fff !important;
    border-color: #e5e7eb !important;
  }
  a {
    color: #000 !important;
    text-decoration: underline;
  }
}

/* Corregir el error de -webkit-text-size-adjust */
.pdf-text {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
</style>
