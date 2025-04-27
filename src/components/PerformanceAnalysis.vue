<template>
  <div class="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
    <h2 class="text-2xl font-bold text-white mb-4">Análisis de Rendimiento</h2>
    
    <div v-if="error" class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
      <p class="text-red-400">{{ error }}</p>
    </div>

    <div v-if="isLoading" class="flex flex-col items-center justify-center p-8 space-y-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      <span class="text-white">Analizando rendimiento...</span>
      <p class="text-sm text-gray-400 text-center">
        Este proceso puede tomar unos segundos
      </p>
    </div>

    <div v-if="results && !error" class="space-y-6">
      <!-- Resumen General -->
      <div class="bg-white/5 rounded p-4">
        <h3 class="text-lg font-semibold text-white mb-2">Resumen General</h3>
        <div class="prose prose-invert max-w-none">
          <p class="text-gray-300 whitespace-pre-line">{{ summary }}</p>
        </div>
      </div>

      <!-- Métricas Core Web Vitals -->
      <div class="bg-white/5 rounded p-4">
        <h3 class="text-lg font-semibold text-white mb-4">Core Web Vitals</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- LCP -->
          <div class="bg-white/5 rounded p-3">
            <p class="text-sm text-gray-400">Largest Contentful Paint</p>
            <p class="text-xl text-white">
              {{ (results.metrics.largestContentfulPaint / 1000).toFixed(2) }}s
            </p>
            <div class="mt-2 flex items-center">
              <div class="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  class="h-2 rounded-full"
                  :class="getLCPColor(results.metrics.largestContentfulPaint)"
                  :style="{ width: getLCPWidth(results.metrics.largestContentfulPaint) }"
                ></div>
              </div>
            </div>
          </div>

          <!-- FID/TBT -->
          <div class="bg-white/5 rounded p-3">
            <p class="text-sm text-gray-400">Total Blocking Time</p>
            <p class="text-xl text-white">
              {{ (results.metrics.totalBlockingTime / 1000).toFixed(2) }}s
            </p>
            <div class="mt-2 flex items-center">
              <div class="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  class="h-2 rounded-full"
                  :class="getTBTColor(results.metrics.totalBlockingTime)"
                  :style="{ width: getTBTWidth(results.metrics.totalBlockingTime) }"
                ></div>
              </div>
            </div>
          </div>

          <!-- CLS -->
          <div class="bg-white/5 rounded p-3">
            <p class="text-sm text-gray-400">Cumulative Layout Shift</p>
            <p class="text-xl text-white">
              {{ results.metrics.cumulativeLayoutShift.toFixed(3) }}
            </p>
            <div class="mt-2 flex items-center">
              <div class="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  class="h-2 rounded-full"
                  :class="getCLSColor(results.metrics.cumulativeLayoutShift)"
                  :style="{ width: getCLSWidth(results.metrics.cumulativeLayoutShift) }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recomendaciones -->
      <div v-if="recommendations" class="space-y-4">
        <!-- Críticas -->
        <div v-if="recommendations.critical.length" class="bg-red-500/10 rounded p-4">
          <h3 class="text-lg font-semibold text-red-400 mb-2">Problemas Críticos</h3>
          <ul class="space-y-2">
            <li v-for="(rec, index) in recommendations.critical" :key="index" class="text-gray-300">
              <p class="font-medium">{{ rec.title }}</p>
              <p class="text-sm text-gray-400">{{ rec.description }}</p>
            </li>
          </ul>
        </div>

        <!-- Importantes -->
        <div v-if="recommendations.important.length" class="bg-yellow-500/10 rounded p-4">
          <h3 class="text-lg font-semibold text-yellow-400 mb-2">Mejoras Importantes</h3>
          <ul class="space-y-2">
            <li v-for="(rec, index) in recommendations.important" :key="index" class="text-gray-300">
              <p class="font-medium">{{ rec.title }}</p>
              <p class="text-sm text-gray-400">{{ rec.description }}</p>
            </li>
          </ul>
        </div>

        <!-- Moderadas -->
        <div v-if="recommendations.moderate.length" class="bg-blue-500/10 rounded p-4">
          <h3 class="text-lg font-semibold text-blue-400 mb-2">Sugerencias de Mejora</h3>
          <ul class="space-y-2">
            <li v-for="(rec, index) in recommendations.moderate" :key="index" class="text-gray-300">
              <p class="font-medium">{{ rec.title }}</p>
              <p class="text-sm text-gray-400">{{ rec.description }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { analyzePerformance, getRecommendations, generateSummary } from '../services/performanceService';

export default {
  name: 'PerformanceAnalysis',
  props: {
    url: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const results = ref(null);
    const error = ref(null);
    const isLoading = ref(false);
    const recommendations = ref(null);
    const summary = ref('');

    const analyze = async () => {
      if (!props.url) return;
      
      try {
        isLoading.value = true;
        error.value = null;
        results.value = null;
        recommendations.value = null;
        summary.value = '';

        // Realizar análisis
        const analysisResults = await analyzePerformance(props.url);
        results.value = analysisResults;

        // Generar recomendaciones y resumen
        recommendations.value = getRecommendations(analysisResults);
        summary.value = generateSummary(analysisResults);

      } catch (err) {
        console.error('Error en el análisis:', err);
        error.value = err.message;
      } finally {
        isLoading.value = false;
      }
    };

    // Funciones auxiliares para los colores y anchos de las barras
    const getLCPColor = (value) => {
      if (value <= 2500) return 'bg-green-500';
      if (value <= 4000) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    const getTBTColor = (value) => {
      if (value <= 200) return 'bg-green-500';
      if (value <= 600) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    const getCLSColor = (value) => {
      if (value <= 0.1) return 'bg-green-500';
      if (value <= 0.25) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    const getLCPWidth = (value) => {
      const percent = (value / 4000) * 100;
      return `${Math.min(100, percent)}%`;
    };

    const getTBTWidth = (value) => {
      const percent = (value / 600) * 100;
      return `${Math.min(100, percent)}%`;
    };

    const getCLSWidth = (value) => {
      const percent = (value / 0.25) * 100;
      return `${Math.min(100, percent)}%`;
    };

    // Ejecutar análisis cuando cambia la URL
    watch(() => props.url, (newUrl) => {
      if (newUrl) {
        analyze();
      }
    });

    return {
      results,
      error,
      isLoading,
      recommendations,
      summary,
      getLCPColor,
      getTBTColor,
      getCLSColor,
      getLCPWidth,
      getTBTWidth,
      getCLSWidth
    };
  }
};
</script> 