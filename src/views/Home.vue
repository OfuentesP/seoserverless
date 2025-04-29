<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-950">
    <h1 class="text-4xl font-bold mb-6 text-white tracking-tight">🔍 SEO20 WebPageTest</h1>
    <p class="text-gray-400 text-sm mb-6">v1.0.0</p>

    <UrlInput :url="url" :loading="cargando" @analizar="handleAnalizar" />
    <EstadoMensaje :estado="estado" />
    <WebPageTestSummary v-if="resumen" :resumen="resumen" />
    <LighthouseResults v-if="lighthouse" :lighthouse="lighthouse" :lighthouseCategorias="lighthouseCategorias" :getScoreClass="getScoreClass" />
  
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import UrlInput from '../components/UrlInput.vue';
import WebPageTestSummary from '../components/WebPageTestSummary.vue';
import LighthouseResults from '../components/LighthouseResults.vue';
import EstadoMensaje from '../components/EstadoMensaje.vue';
import useSeoAnalysis from '../composables/useSeoAnalysis';

const router = useRouter();
const {
  url,
  estado,
  resumen,
  lighthouse,
  cargando,
  lighthouseCategorias,
  getScoreClass,
  analizar
} = useSeoAnalysis();

function handleAnalizar(inputUrl) {
  router.push('/cargando');
  setTimeout(() => {
    analizar(inputUrl);
  }, 100);
}

watch(estado, (nuevoEstado) => {
  if (nuevoEstado === '✅ Análisis completado.') {
    router.push('/resultados');
  }
});
</script>

<style scoped>
</style> 