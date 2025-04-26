<script setup>
import { seoAnalysis } from '../composables/useSeoAnalysis';
import { useRouter } from 'vue-router';
import { watch } from 'vue';

// Enrutador para redirigir
const router = useRouter();

// Watch que observa el estado del análisis
watch(() => seoAnalysis.estado.value, (nuevoEstado) => {
  if (nuevoEstado.includes('Análisis completado')) {
    console.log('[Loading.vue] Análisis completado. Redirigiendo a /resultados...');
    setTimeout(() => {
      router.push('/resultados');
    }, 500); // Pequeño delay para hacer más suave la transición
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <div class="text-center">
      <h1 class="text-3xl font-bold mb-4">Procesando análisis...</h1>
      <p class="text-lg mb-8">{{ seoAnalysis.estado }}</p>
      <div class="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32 mb-4"></div>
      <p class="text-gray-600">Por favor espera un momento 🚀</p>
    </div>
  </div>
</template>

<style scoped>
.loader {
  border-top-color: #3498db;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>