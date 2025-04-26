<script setup>
import { seoAnalysis } from '../composables/useSeoAnalysis';

// Función para generar el texto motivacional según el score
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

    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-semibold mb-4">Resumen de WebPageTest</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-medium">URL Analizada:</p>
          <p class="text-gray-700">{{ seoAnalysis.resumen?.url ?? 'N/A' }}</p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-medium">Tiempo de Carga:</p>
          <p class="text-gray-700">{{ seoAnalysis.resumen?.loadTime ?? 'N/A' }}</p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-medium">Tamaño Total:</p>
          <p class="text-gray-700">{{ seoAnalysis.resumen?.totalSize ?? 'N/A' }}</p>
        </div>
        <div class="bg-gray-100 p-4 rounded">
          <p class="font-medium">Número de Recursos:</p>
          <p class="text-gray-700">{{ seoAnalysis.resumen?.resourceCount ?? 'N/A' }}</p>
        </div>
      </div>
      <a 
        v-if="seoAnalysis.resumen?.detalles"
        :href="seoAnalysis.resumen.detalles"
        target="_blank"
        class="text-blue-600 underline font-medium block mt-3"
      >
        🔗 Ver detalles del WebPageTest
      </a>
    </div>

    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-semibold mb-4">Resultados de Lighthouse</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-green-100 p-4 rounded">
          <p class="font-medium">Performance:</p>
          <p class="text-green-700">{{ seoAnalysis.lighthouse?.categories?.performance?.score ?? 'N/A' }}</p>
        </div>
        <div class="bg-blue-100 p-4 rounded">
          <p class="font-medium">Accessibility:</p>
          <p class="text-blue-700">{{ seoAnalysis.lighthouse?.categories?.accessibility?.score ?? 'N/A' }}</p>
        </div>
        <div class="bg-yellow-100 p-4 rounded">
          <p class="font-medium">Best Practices:</p>
          <p class="text-yellow-700">{{ seoAnalysis.lighthouse?.categories?.bestPractices?.score ?? 'N/A' }}</p>
        </div>
      </div>
    </div>

    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold mb-4">Insights de Gemini</h2>
      <p class="text-gray-700">
        {{ seoAnalysis.geminiInsight ?? 'No hay insights disponibles.' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
</style>