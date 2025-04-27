<template>
  <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
    <h2 class="text-2xl font-semibold mb-4">Resultados de Lighthouse</h2>
    
    <div v-if="datosDisponibles" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-green-100 p-4 rounded text-center">
        <p class="font-medium">Performance:</p>
        <p class="text-green-700 font-bold">
          {{ lighthouse?.categories?.performance?.score !== undefined ? Math.round(lighthouse.categories.performance.score * 100) + '%' : 'N/A' }}
        </p>
        <p>{{ obtenerInsigniaTexto(lighthouse?.categories?.performance?.score) }}</p>
      </div>
      <div class="bg-blue-100 p-4 rounded text-center">
        <p class="font-medium">Accessibility:</p>
        <p class="text-blue-700 font-bold">
          {{ lighthouse?.categories?.accessibility?.score !== undefined ? Math.round(lighthouse.categories.accessibility.score * 100) + '%' : 'N/A' }}
        </p>
        <p>{{ obtenerInsigniaTexto(lighthouse?.categories?.accessibility?.score) }}</p>
      </div>
      <div class="bg-yellow-100 p-4 rounded text-center">
        <p class="font-medium">Best Practices:</p>
        <p class="text-yellow-700 font-bold">
          {{ lighthouse?.categories?.['best-practices']?.score !== undefined ? Math.round(lighthouse.categories['best-practices'].score * 100) + '%' : 'N/A' }}
        </p>
        <p>{{ obtenerInsigniaTexto(lighthouse?.categories?.['best-practices']?.score) }}</p>
      </div>
    </div>
    
    <div v-else class="bg-yellow-100 p-4 rounded text-center">
      <p class="text-yellow-700">Los datos de Lighthouse aún no están disponibles.</p>
      <p class="text-sm mt-2">El análisis puede tardar unos minutos en completarse.</p>
      <p class="text-xs mt-2 text-gray-500">Estado actual: {{ estado }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import useSeoAnalysis from '../composables/useSeoAnalysis';

const {
  getScoreClass,
  lighthouse,
  estado
} = useSeoAnalysis();

const datosDisponibles = computed(() => {
  const hasData = lighthouse && 
         lighthouse.categories && 
         Object.keys(lighthouse.categories).length > 0;
  console.log('Datos disponibles:', hasData, lighthouse);
  return hasData;
});

// Función para generar el texto motivacional según el score
function obtenerInsigniaTexto(score) {
  const porcentaje = Math.round((score ?? 0) * 100);
  if (porcentaje >= 90) return '🏅 Excelente';
  if (porcentaje >= 75) return '✅ Bueno';
  if (porcentaje >= 50) return '⚠️ Regular';
  return '❌ Crítico';
}

onMounted(() => {
  console.log('LighthouseResults montado, datos disponibles:', datosDisponibles.value);
  console.log('Lighthouse completo:', lighthouse);
});
</script> 