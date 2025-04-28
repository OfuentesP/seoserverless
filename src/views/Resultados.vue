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
            <p class="text-3xl font-bold text-white pdf-text">{{ resumen.requests ?? 'N/A' }}</p>
          </div>
        </div>
        <div class="mt-6">
          <a
            :href="resumen.webpagetestUrl || '#'"
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
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(lighthouse.audits['time-to-first-byte']?.numericValue ?? resumen.ttfb) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Start Render</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuándo aparece el primer píxel? Un inicio rápido reduce el rebote.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(lighthouse.audits['render-start']?.numericValue) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">First Contentful Paint (FCP)</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuándo se muestra el primer contenido? Impacta la percepción de velocidad.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(lighthouse.audits['first-contentful-paint']?.numericValue) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Speed Index</p>
            <p class="text-xs text-gray-400 mb-2">¿Qué tan rápido se ve la página completa? Un índice bajo mejora la satisfacción.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ formatSeconds(lighthouse.audits['speed-index']?.numericValue) }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Largest Contentful Paint (LCP)</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuándo carga el elemento principal? Clave para la percepción de rapidez.</p>
            <p :class="['text-3xl font-bold', getMetricColor(lighthouse.audits['largest-contentful-paint']?.numericValue, 'lcp')]">
              {{ formatSeconds(lighthouse.audits['largest-contentful-paint']?.numericValue) }}
            </p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Cumulative Layout Shift (CLS)</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuánto se mueve el diseño al cargar? Un CLS bajo evita frustración y pérdida de ventas.</p>
            <p :class="['text-3xl font-bold', getMetricColor(lighthouse.audits['cumulative-layout-shift']?.numericValue, 'cls')]">
              {{ formatCLS(lighthouse.audits['cumulative-layout-shift']?.numericValue) }}
            </p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Total Blocking Time (TBT)</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuánto tiempo la página no responde? Un TBT bajo mejora la interacción y conversión.</p>
            <p :class="['text-3xl font-bold', getMetricColor(lighthouse.audits['total-blocking-time']?.numericValue, 'tbt')]">
              {{ formatSeconds(lighthouse.audits['total-blocking-time']?.numericValue) }}
            </p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Page Weight</p>
            <p class="text-xs text-gray-400 mb-2">¿Cuánto pesa la página? Un peso bajo acelera la carga y reduce el abandono.</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ resumen.totalSize ? (resumen.totalSize / 1024).toFixed(0) + ' KB' : 'N/A' }}</p>
          </div>
        </div>
      </section>

      <!-- Sección Sitemap -->
      <section class="mb-8">
        <h2 class="text-2xl font-semibold mb-6 text-white pdf-text flex items-center">
          <span class="mr-3 text-green-400">🌐</span>
          Resultados Sitemap
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Total URLs</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ sitemapResults.totalUrls ?? 'N/A' }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Errores 404</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ sitemapResults.errors404 ?? 'N/A' }}</p>
          </div>
          <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-gray-300 mb-2 font-medium pdf-text">Última modificación</p>
            <p class="text-3xl font-bold text-white pdf-text">{{ sitemapResults.lastModified ?? 'N/A' }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ExportButton from '../components/ExportButton.vue';

// Obtenemos el estado enviado por router.push desde history.state
const state = window.history.state || {};

const estado = ref(state.estado || '❌ Sin estado');
const resumen = ref(state.resumen || {});
const lighthouse = ref(state.lighthouse || { audits: {} });
const sitemapResults = ref(state.sitemapResults || {});
const geminiInsight = ref(state.geminiInsight || {});

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
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return (value / 1000).toFixed(3).replace(/^0+/, '') + 'S';
};

const formatCLS = (value) => {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return Number(value).toFixed(2);
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
</style>
