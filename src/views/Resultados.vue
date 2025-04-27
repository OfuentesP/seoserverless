<template>
  <div class="p-6 max-w-3xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">🚀 Resultados de SEO</h1>
    <p v-if="!resumen.loadTime" class="text-red-500 mb-4">
      No hay datos de SEO. Asegúrate de ejecutar un análisis primero.
    </p>
    <div v-else>
      <!-- Estado -->
      <p class="mb-4 text-lg"><strong>Estado:</strong> {{ estado }}</p>

      <!-- Sección WebPageTest -->
      <section class="mb-8">
        <h2 class="text-2xl font-semibold mb-2">📊 Resumen WebPageTest</h2>
        <ul class="list-disc list-inside">
          <li><strong>Load Time:</strong> {{ resumen.loadTime }} ms</li>
          <li><strong>TTFB:</strong> {{ resumen.ttfb }} ms</li>
          <li><strong>Total Size:</strong> {{ resumen.totalSize ?? 'N/A' }} bytes</li>
          <li><strong>Requests:</strong> {{ resumen.requests ?? 'N/A' }}</li>
          <li>
            <strong>Detalles:</strong>
            <a
              :href="resumen.webpagetestUrl"
              target="_blank"
              class="text-blue-600 hover:underline"
            >
              Ver en WebPageTest
            </a>
          </li>
        </ul>
      </section>

      <!-- Sección Core Web Vitals -->
      <section class="mb-8">
        <h2 class="text-2xl font-semibold mb-2">⚡ Core Web Vitals (Lighthouse)</h2>
        <ul class="list-disc list-inside">
          <li><strong>LCP:</strong> {{ lighthouse.audits['largest-contentful-paint']?.numericValue ?? 'N/A' }} ms</li>
          <li><strong>FCP:</strong> {{ lighthouse.audits['first-contentful-paint']?.numericValue ?? 'N/A' }} ms</li>
          <li><strong>Speed Index:</strong> {{ lighthouse.audits['speed-index']?.numericValue ?? 'N/A' }}</li>
          <li><strong>Total Blocking Time:</strong> {{ lighthouse.audits['total-blocking-time']?.numericValue ?? 'N/A' }} ms</li>
          <li><strong>CLS:</strong> {{ lighthouse.audits['cumulative-layout-shift']?.numericValue ?? 'N/A' }}</li>
        </ul>
      </section>

      <!-- Sección Sitemap -->
      <section class="mb-8">
        <h2 class="text-2xl font-semibold mb-2">🌐 Resultados Sitemap</h2>
        <ul class="list-disc list-inside">
          <li><strong>Total URLs:</strong> {{ sitemapResults.totalUrls ?? 'N/A' }}</li>
          <li><strong>Errores 404:</strong> {{ sitemapResults.errors404 ?? 'N/A' }}</li>
          <li><strong>Última modificación:</strong> {{ sitemapResults.lastModified ?? 'N/A' }}</li>
        </ul>
      </section>

      <!-- Sección Insights IA -->
      <section class="mb-8">
        <h2 class="text-2xl font-semibold mb-2">🤖 Insights IA (Gemini)</h2>
        <p>{{ geminiInsight.summary ?? 'Sin insights.' }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
// Obtenemos el estado enviado por router.push desde history.state
const state = window.history.state || {};

const estado = ref(state.estado || '❌ Sin estado');
const resumen = ref(state.resumen || {});
const lighthouse = ref(state.lighthouse || { audits: {} });
const sitemapResults = ref(state.sitemapResults || {});
const geminiInsight = ref(state.geminiInsight || {});
</script>

<style scoped>
h1, h2 {
  color: #1a202c;
}

a {
  transition: color 0.2s;
}

a:hover {
  color: #2b6cb0;
}
</style>
