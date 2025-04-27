<script setup>
import { computed, toRaw } from 'vue';
import useSeoAnalysis from '../composables/useSeoAnalysis';

const {
  resumen,
  estado
} = useSeoAnalysis();

const rawResumen = computed(() => toRaw(resumen));

const datosDisponibles = computed(() => {
  const r = rawResumen.value;
  const hasData = r && 
         (r.lcp !== null || 
          r.cls !== null || 
          r.tbt !== null);
  console.log('[CoreWebVitals] Estado de datos:', {
    hayResumen: !!r,
    webVitalsStatus: r?.webVitalsStatus,
    valores: {
      lcp: r?.lcp,
      cls: r?.cls,
      tbt: r?.tbt
    }
  });
  return hasData;
});

// Función para evaluar y aplicar clases tipo semáforo
function obtenerClaseVital(valor, tipo) {
  if (valor === null || valor === undefined) return 'text-gray-400';
  if (tipo === 'lcp') {
    if (valor <= 2500) return 'text-green-600 font-bold';
    if (valor <= 4000) return 'text-yellow-600 font-bold';
    return 'text-red-600 font-bold';
  }
  if (tipo === 'cls') {
    if (valor <= 0.1) return 'text-green-600 font-bold';
    if (valor <= 0.25) return 'text-yellow-600 font-bold';
    return 'text-red-600 font-bold';
  }
  if (tipo === 'tbt') {
    if (valor <= 200) return 'text-green-600 font-bold';
    if (valor <= 600) return 'text-yellow-600 font-bold';
    return 'text-red-600 font-bold';
  }
  return 'text-gray-400';
}

// Función para formatear valores
function formatearValor(valor, tipo) {
  if (valor === null || valor === undefined) return 'N/A';
  
  switch (tipo) {
    case 'lcp':
    case 'tbt':
      return (valor / 1000).toFixed(2) + ' s';
    case 'cls':
      return valor.toFixed(3);
    default:
      return valor.toString();
  }
}
</script>

<template>
  <section class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
    <h2 class="text-2xl font-semibold mb-4">⚡ Core Web Vitals</h2>
    
    <div v-if="datosDisponibles" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gray-100 p-4 rounded text-center">
        <p class="font-medium text-blue-700">LCP (Largest Contentful Paint)</p>
        <p :class="obtenerClaseVital(rawResumen.value.lcp, 'lcp')">
          {{ formatearValor(rawResumen.value.lcp, 'lcp') }}
        </p>
        <p class="text-xs mt-1 text-gray-500">Tiempo de carga del contenido principal</p>
      </div>
      <div class="bg-gray-100 p-4 rounded text-center">
        <p class="font-medium text-blue-700">CLS (Cumulative Layout Shift)</p>
        <p :class="obtenerClaseVital(rawResumen.value.cls, 'cls')">
          {{ formatearValor(rawResumen.value.cls, 'cls') }}
        </p>
        <p class="text-xs mt-1 text-gray-500">Estabilidad visual</p>
      </div>
      <div class="bg-gray-100 p-4 rounded text-center">
        <p class="font-medium text-blue-700">TBT (Total Blocking Time)</p>
        <p :class="obtenerClaseVital(rawResumen.value.tbt, 'tbt')">
          {{ formatearValor(rawResumen.value.tbt, 'tbt') }}
        </p>
        <p class="text-xs mt-1 text-gray-500">Tiempo de bloqueo total</p>
      </div>
    </div>
    
    <div v-else class="bg-yellow-100 p-4 rounded text-center">
      <template v-if="rawResumen.value?.webVitalsStatus === 'error'">
        <p class="text-yellow-700">❌ No se pudieron obtener los Core Web Vitals</p>
        <p class="text-sm mt-2">Esto puede ocurrir en sitios muy pesados o con problemas de conexión</p>
      </template>
      <template v-else>
        <p class="text-yellow-700">⏳ Los datos de Core Web Vitals están cargando...</p>
        <p class="text-sm mt-2">Este proceso puede tomar varios minutos en sitios pesados</p>
      </template>
      <p class="text-xs mt-2 text-gray-500">Estado actual: {{ estado }}</p>
    </div>
  </section>
</template> 