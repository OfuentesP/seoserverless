<script setup>
import { computed, toRaw } from 'vue';
import useSeoAnalysis from '../composables/useSeoAnalysis';

const { resumen } = useSeoAnalysis();
const rawResumen = computed(() => toRaw(resumen));
const datosDisponibles = computed(() => rawResumen.value && Object.keys(rawResumen.value).length > 0);
</script>

<template>
  <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
    <h2 class="text-2xl font-semibold mb-4">Resumen de WebPageTest</h2>
    
    <div v-if="datosDisponibles" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-gray-100 p-4 rounded">
        <p class="font-medium">URL Analizada:</p>
        <p class="text-gray-700">{{ rawResumen.value?.url ?? 'N/A' }}</p>
      </div>
      <div class="bg-gray-100 p-4 rounded">
        <p class="font-medium">Tiempo de Carga:</p>
        <p class="text-gray-700">
          {{ rawResumen.value?.loadTime ? (rawResumen.value.loadTime / 1000).toFixed(2) + ' s' : 'N/A' }}
        </p>
      </div>
      <div class="bg-gray-100 p-4 rounded">
        <p class="font-medium">Tamaño Total:</p>
        <p class="text-gray-700">
          {{ rawResumen.value?.totalSize ? (rawResumen.value.totalSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A' }}
        </p>
      </div>
      <div class="bg-gray-100 p-4 rounded">
        <p class="font-medium">Número de Recursos:</p>
        <p class="text-gray-700">{{ rawResumen.value?.requests ?? 'N/A' }}</p>
      </div>
    </div>
    
    <div v-else class="bg-yellow-100 p-4 rounded text-center">
      <p class="text-yellow-700">Los datos de WebPageTest aún no están disponibles.</p>
      <p class="text-sm mt-2">El análisis puede tardar unos minutos en completarse.</p>
    </div>
    
    <a 
      v-if="rawResumen.value?.webpagetestUrl"
      :href="rawResumen.value.webpagetestUrl"
      target="_blank"
      class="text-blue-600 underline font-medium block mt-3"
    >
      🔗 Ver detalles del WebPageTest
    </a>
  </div>
</template> 