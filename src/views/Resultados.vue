<script setup>
import { seoAnalysis } from '../composables/useSeoAnalysis';
import { computed } from 'vue';

// Core Web Vitals y resumen reactivo
const resumen = computed(() => seoAnalysis.resumen);
const lighthouse = computed(() => seoAnalysis.lighthouse);
const estado = computed(() => seoAnalysis.estado);
const geminiInsight = computed(() => seoAnalysis.geminiInsight);

// Función para texto motivacional según score
function obtenerInsigniaTexto(score) {
  const porcentaje = Math.round((score ?? 0) * 100);
  if (porcentaje >= 90) return '🏅 Excelente';
  if (porcentaje >= 75) return '✅ Bueno';
  if (porcentaje >= 50) return '⚠️ Regular';
  return '❌ Crítico';
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center p-8 bg-gray-50">
    <h1 class="text-3xl font-bold mb-6">📊 Resultados del Análisis</h1>

    <!-- Resumen WebPageTest -->
    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-semibold mb-4">Resumen de WebPageTest</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-medium">URL Analizada:</p>
          <p class="text-gray-700">{{ resumen.value?.url ?? 'N/A' }}</p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-medium">Tiempo de Carga:</p>
          <p class="text-gray-700">
            {{ resumen.value?.loadTime ? (resumen.value.loadTime / 1000).toFixed(2) + ' s' : 'N/A' }}
          </p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-medium">Tamaño Total:</p>
          <p class="text-gray-700">
            {{ resumen.value?.totalSize ? (resumen.value.totalSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A' }}
          </p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-medium">Número de Recursos:</p>
          <p class="text-gray-700">{{ resumen.value?.requests ?? 'N/A' }}</p>
        </div>
      </div>
      <a 
        v-if="resumen.value?.detalles"
        :href="resumen.value.detalles"
        target="_blank"
        class="text-blue-600 underline font-medium block mt-3"
      >
        🔗 Ver detalles del WebPageTest
      </a>
    </div>

    <!-- Core Web Vitals -->
    <section v-if="resumen.value" class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-semibold mb-4">⚡ Core Web Vitals</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gray-100 p-4 rounded text-center">
          <p class="font-medium">LCP (Largest Contentful Paint)</p>
          <p class="text-gray-700">{{ resumen.value.lcp ? (resumen.value.lcp / 1000).toFixed(2) + ' s' : 'N/A' }}</p>
        </div>
        <div class="bg-gray-100 p-4 rounded text-center">
          <p class="font-medium">CLS (Cumulative Layout Shift)</p>
          <p class="text-gray-700">{{ resumen.value.cls !== null && resumen.value.cls !== undefined ? resumen.value.cls.toFixed(2) : 'N/A' }}</p>
        </div>
        <div class="bg-gray-100 p-4 rounded text-center">
          <p class="font-medium">TBT (Total Blocking Time)</p>
          <p class="text-gray-700">{{ resumen.value.tbt ? (resumen.value.tbt / 1000).toFixed(2) + ' s' : 'N/A' }}</p>
        </div>
      </div>
    </section>

    <!-- Resultados Lighthouse -->
    <div v-if="lighthouse.value" class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-semibold mb-4">Resultados de Lighthouse</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-green-100 p-4 rounded text-center">
          <p class="font-medium">Performance:</p>
          <p class="text-green-700 font-bold">
            {{ lighthouse.value.categories?.performance?.score !== undefined ? Math.round(lighthouse.value.categories.performance.score * 100) + '%' : 'N/A' }}
          </p>
          <p>{{ obtenerInsigniaTexto(lighthouse.value.categories?.performance?.score) }}</p>
        </div>
        <div class="bg-blue-100 p-4 rounded text-center">
          <p class="font-medium">Accessibility:</p>
          <p class="text-blue-700 font-bold">
            {{ lighthouse.value.categories?.accessibility?.score !== undefined ? Math.round(lighthouse.value.categories.accessibility.score * 100) + '%' : 'N/A' }}
          </p>
          <p>{{ obtenerInsigniaTexto(lighthouse.value.categories?.accessibility?.score) }}</p>
        </div>
        <div class="bg-yellow-100 p-4 rounded text-center">
          <p class="font-medium">Best Practices:</p>
          <p class="text-yellow-700 font-bold">
            {{ lighthouse.value.categories?.['best-practices']?.score !== undefined ? Math.round(lighthouse.value.categories['best-practices'].score * 100) + '%' : 'N/A' }}
          </p>
          <p>{{ obtenerInsigniaTexto(lighthouse.value.categories?.['best-practices']?.score) }}</p>
        </div>
      </div>
    </div>

    <!-- Insights de Gemini -->
    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold mb-4">Insights de Gemini</h2>
      <p class="text-gray-700">
        {{ geminiInsight.value ?? 'No hay insights disponibles.' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
</style>