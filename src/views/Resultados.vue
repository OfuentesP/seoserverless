<script setup>
import { computed } from 'vue';
import { seoAnalysis } from '../composables/useSeoAnalysis';
import WebPageTestSummary from '../components/WebPageTestSummary.vue';
import CoreWebVitals from '../components/CoreWebVitals.vue';
import LighthouseResults from '../components/LighthouseResults.vue';
import GeminiInsights from '../components/GeminiInsights.vue';

const estado = computed(() => seoAnalysis.estado);
const hayError = computed(() => {
  return typeof estado.value === 'string' && estado.value.includes('Error');
});
</script>

<template>
  <div class="min-h-screen flex flex-col items-center p-8 bg-gray-50">
    <h1 class="text-3xl font-bold mb-6">📊 Resultados del Análisis</h1>
    
    <!-- Mensaje de error si existe -->
    <div v-if="hayError" class="w-full max-w-4xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
      <p class="font-bold">Error en el análisis</p>
      <p>{{ estado }}</p>
      <p class="mt-2 text-sm">El análisis se está ejecutando en segundo plano. Puedes recargar la página en unos minutos para ver los resultados.</p>
    </div>
    
    <!-- Componentes de resultados -->
    <template v-else>
      <WebPageTestSummary />
      <CoreWebVitals />
      <LighthouseResults />
      <GeminiInsights />
    </template>
  </div>
</template>

<style scoped>
</style>