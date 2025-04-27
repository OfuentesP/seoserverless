<template>
  <div v-if="resumen" class="mt-8 p-6 bg-white rounded shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-blue-800">📊 Resultados WebPageTest</h2>
    <div class="space-y-6">
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-xl font-semibold mb-4 text-gray-700">⚡ Métricas de Rendimiento</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white p-4 rounded shadow-sm">
            <h4 class="text-lg font-medium text-gray-600 mb-2">⏱ Tiempo de Carga</h4>
            <p class="text-2xl font-bold text-blue-600">{{ resumen.loadTime }} ms</p>
          </div>
          <div class="bg-white p-4 rounded shadow-sm">
            <h4 class="text-lg font-medium text-gray-600 mb-2">⚡ Índice de Velocidad</h4>
            <p class="text-2xl font-bold text-blue-600">{{ resumen.SpeedIndex }} ms</p>
          </div>
          <div class="bg-white p-4 rounded shadow-sm">
            <h4 class="text-lg font-medium text-gray-600 mb-2">📡 TTFB</h4>
            <p class="text-2xl font-bold text-blue-600">{{ resumen.TTFB }} ms</p>
          </div>
        </div>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-xl font-semibold mb-4 text-gray-700">🔗 Enlaces y Referencias</h3>
        <a 
          :href="resumen.detalles" 
          target="_blank" 
          class="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span class="mr-2">📋</span>
          Ver informe completo en WebPageTest
        </a>
      </div>
    </div>
  </div>
</template>
<script setup>
import { watch } from 'vue';
const props = defineProps({ resumen: Object });
watch(() => props.resumen, (val) => {
  if (val) console.log('[WebPageTestResults] Mostrando resumen:', val);
});
</script> 