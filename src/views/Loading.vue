<script setup>
import useSeoAnalysis from '../composables/useSeoAnalysis';
import { useRouter } from 'vue-router';
import { watch, ref, computed } from 'vue';

// Enrutador para redirigir
const router = useRouter();

const {
  currentStep,
  progress,
  estado
} = useSeoAnalysis();

// Estados del proceso con sus porcentajes
const estados = [
  { id: 1, texto: 'Iniciando prueba de rendimiento', porcentaje: 25 },
  { id: 2, texto: 'Analizando métricas de WebPageTest', porcentaje: 50 },
  { id: 3, texto: 'Procesando resultados de Lighthouse', porcentaje: 75 },
  { id: 4, texto: 'Analizando estructura del sitio', porcentaje: 90 },
  { id: 5, texto: 'Generando reporte final', porcentaje: 100 }
];

// Estado actual basado en el progreso
const estadoActual = computed(() => {
  return estados.find(e => progress.value <= e.porcentaje) || estados[estados.length - 1];
});

// Watch que observa el estado del análisis
watch(() => estado.value, (nuevoEstado) => {
  if (nuevoEstado.includes('Análisis completado')) {
    console.log('[Loading.vue] Análisis completado. Redirigiendo a /resultados...');
    setTimeout(() => {
      router.push('/resultados');
    }, 500); // Pequeño delay para hacer más suave la transición
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-950">
    <div class="text-center max-w-xl">
      <h1 class="text-4xl font-bold mb-4 text-white tracking-tight">Procesando análisis...</h1>
      
      <!-- Estado actual y progreso -->
      <div class="mb-8 bg-gradient-to-r from-blue-900/30 to-transparent p-6 rounded-lg">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <span class="text-blue-400 text-xl animate-pulse">●</span>
          <p class="text-lg font-medium text-gray-200">{{ estadoActual.texto }}</p>
        </div>
        
        <!-- Barra de progreso -->
        <div class="w-full bg-gray-800 rounded-full h-2 mb-4">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <p class="text-gray-400 text-sm">{{ progress }}% completado</p>
      </div>

      <!-- Estados del proceso -->
      <div class="space-y-3 text-left bg-gray-900/50 p-6 rounded-lg">
        <div 
          v-for="estado in estados" 
          :key="estado.id"
          class="flex items-center space-x-3 transition-all duration-300"
          :class="{
            'text-gray-400': progress < estado.porcentaje,
            'text-blue-400': progress >= estado.porcentaje && estado.id !== estados.length,
            'text-green-400': progress >= estado.porcentaje && estado.id === estados.length
          }"
        >
          <span>{{ estado.id }}.</span>
          <span>{{ estado.texto }}</span>
          <span 
            v-if="progress >= estado.porcentaje" 
            class="ml-auto transform transition-transform duration-300"
            :class="{'scale-100': progress >= estado.porcentaje, 'scale-0': progress < estado.porcentaje}"
          >✓</span>
        </div>
      </div>

      <!-- Loader -->
      <div class="mt-8">
        <div class="loader ease-linear rounded-full border-8 border-t-8 border-gray-800 h-32 w-32 mb-4"></div>
        <p class="text-gray-400">Por favor espera un momento 🚀</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loader {
  border-top-color: #3b82f6;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.scale-0 {
  transform: scale(0);
}

.scale-100 {
  transform: scale(1);
}
</style>