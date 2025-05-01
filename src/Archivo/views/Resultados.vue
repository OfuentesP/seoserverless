<script setup>
import { computed, toRaw } from 'vue';
import useSeoAnalysis from '../composables/useSeoAnalysis';
import CoreWebVitals from '../components/CoreWebVitals.vue';
import LighthouseResults from '../components/LighthouseResults.vue';
import SitemapAnalysis from '../components/SitemapAnalysis.vue';
import GeminiInsights from '../components/GeminiInsights.vue';

const {
  resumen,
  lighthouse,
  lighthouseCategorias,
  getScoreClass,
  geminiInsight,
  sitemapResults,
  estado,
  cargando
} = useSeoAnalysis();

const resumenPlano = computed(() => toRaw(resumen.value || resumen));
const lighthousePlano = computed(() => toRaw(lighthouse.value || lighthouse));
const sitemapPlano = computed(() => toRaw(sitemapResults.value || sitemapResults));

// Errores específicos por módulo
const errorWPT = computed(() => estado && typeof estado === 'string' && estado.includes('WebPageTest') ? estado : null);
const errorLighthouse = computed(() => estado && typeof estado === 'string' && estado.includes('Lighthouse') ? estado : null);
const errorSitemap = computed(() => estado && typeof estado === 'string' && estado.includes('Sitemap') ? estado : null);
const errorGemini = computed(() => estado && typeof estado === 'string' && estado.includes('Gemini') ? estado : null);

const sitemapLoading = computed(() => Boolean(cargando));

function formatBytes(bytes) {
  if (!bytes) return '0 bytes';
  const sizes = ['bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
</script>

<template>
  <div class="min-h-screen p-8 bg-dark-50">
    <div class="max-w-7xl mx-auto space-y-8">
      <h1 class="text-3xl font-bold mb-6">🔍 Resultados del Análisis SEO</h1>

      <!-- WebPageTestSummary (integrado aquí) -->
      <div v-if="resumenPlano && Object.keys(resumenPlano).length > 0">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-dark-200 p-4 rounded">
            <p class="text-gray-400 text-sm">Load Time</p>
            <p class="text-xl font-semibold">{{ resumenPlano.loadTime }}S</p>
          </div>
          <div class="bg-dark-200 p-4 rounded">
            <p class="text-gray-400 text-sm">TTFB</p>
            <p class="text-xl font-semibold">{{ resumenPlano.ttfb }}S</p>
          </div>
          <div class="bg-dark-200 p-4 rounded">
            <p class="text-gray-400 text-sm">Total Size</p>
            <p class="text-xl font-semibold">{{ formatBytes(resumenPlano.bytesIn) }}</p>
          </div>
          <div class="bg-dark-200 p-4 rounded">
            <p class="text-gray-400 text-sm">Requests</p>
            <ul class="text-sm text-gray-300 space-y-1 max-h-48 overflow-auto">
              <li v-for="(req, index) in resumenPlano.requests?.slice(0, 5)" :key="index">
                🔗 {{ req.full_url || 'N/A' }}<br />
                🧠 IP: {{ req.ip_addr || 'N/A' }}
              </li>
              <li v-if="(resumenPlano.requests?.length || 0) > 5" class="text-blue-400 italic">...y más</li>
            </ul>
          </div>
        </div>
      </div>
      <div v-else-if="errorWPT" class="bg-red-100 p-6 rounded text-center text-red-600">
        No se pudo obtener resultados de WebPageTest.<br />
        <span class="text-xs">{{ errorWPT }}</span>
      </div>
      <div v-else class="bg-gray-100 p-6 rounded text-center text-gray-400">Cargando WebPageTest...</div>

      <!-- CoreWebVitals -->
      <div>
        <CoreWebVitals
          v-if="resumenPlano && resumenPlano.webVitalsStats"
          :resumen="resumenPlano"
        />
        <div v-else-if="errorWPT" class="bg-red-100 p-6 rounded text-center text-red-600">
          No se pudo obtener Core Web Vitals.<br />
          <span class="text-xs">{{ errorWPT }}</span>
        </div>
        <div v-else class="bg-gray-100 p-6 rounded text-center text-gray-400">Cargando Core Web Vitals...</div>
      </div>

      <!-- LighthouseResults -->
      <div>
        <LighthouseResults
          v-if="lighthousePlano && Object.keys(lighthousePlano).length > 0"
          :lighthouse="lighthousePlano"
          :lighthouseCategorias="lighthouseCategorias"
          :getScoreClass="getScoreClass"
        />
        <div v-else-if="errorLighthouse" class="bg-red-100 p-6 rounded text-center text-red-600">
          No se pudo obtener resultados de Lighthouse.<br />
          <span class="text-xs">{{ errorLighthouse }}</span>
        </div>
        <div v-else class="bg-gray-100 p-6 rounded text-center text-gray-400">Cargando Lighthouse...</div>
      </div>

      <!-- SitemapAnalysis -->
      <div>
        <SitemapAnalysis
          v-if="sitemapPlano && Object.keys(sitemapPlano).length > 0"
          :sitemapResults="sitemapPlano"
          :loading="sitemapLoading"
          :error="errorSitemap"
        />
        <div v-else-if="errorSitemap" class="bg-red-100 p-6 rounded text-center text-red-600">
          No se pudo obtener resultados del Sitemap.<br />
          <span class="text-xs">{{ errorSitemap }}</span>
        </div>
        <div v-else class="bg-gray-100 p-6 rounded text-center text-gray-400">Cargando Sitemap...</div>
      </div>

      <!-- GeminiInsights -->
      <div>
        <GeminiInsights v-if="geminiInsight" :geminiInsight="geminiInsight" />
        <div v-else-if="errorGemini" class="bg-red-100 p-6 rounded text-center text-red-600">
          No se pudo obtener insights de IA.<br />
          <span class="text-xs">{{ errorGemini }}</span>
        </div>
        <div v-else class="bg-gray-100 p-6 rounded text-center text-gray-400">Cargando Insights IA...</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style> 