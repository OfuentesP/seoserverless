<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8 bg-dark-50">
    <h1 class="text-3xl font-bold mb-6">🔍 SEO20 WebPageTest</h1>

    <UrlInput :url="url" :loading="cargando" @analizar="handleAnalizar" />
    <EstadoMensaje :estado="estado" />
    <WebPageTestResults v-if="resumen" :resumen="resumen" />
    <LighthouseResults v-if="lighthouse" :lighthouse="lighthouse" :lighthouseCategorias="lighthouseCategorias" :getScoreClass="getScoreClass" />
    <div v-else-if="resumen" class="mt-8 text-center text-red-600">
      ⚠️ No se pudo obtener el informe de Lighthouse.
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import UrlInput from '../components/UrlInput.vue';
import WebPageTestResults from '../components/WebPageTestResults.vue';
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