<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
    <h1 class="text-3xl font-bold mb-6">🔍 SEO20 WebPageTest</h1>

    <div class="w-full max-w-md">
      <input
        v-model="url"
        type="text"
        placeholder="https://www.ejemplo.cl"
        class="w-full p-3 mb-4 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        @click="analizar"
        :disabled="cargando"
        class="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {{ cargando ? 'Analizando...' : 'Analizar Sitio' }}
      </button>

      <div v-if="estado" class="text-center mt-4 text-gray-700 font-medium mt-4">
        {{ estado }}
      </div>

      <div v-if="resumen" class="mt-8 p-6 bg-white rounded shadow-md">
        <h2 class="text-xl font-bold mb-4 text-blue-800">✅ Resultados WebPageTest:</h2>
        <p>⏱ <strong>Load Time:</strong> {{ resumen.loadTime }} ms</p>
        <p>⚡ <strong>Speed Index:</strong> {{ resumen.SpeedIndex }} ms</p>
        <p>📡 <strong>TTFB:</strong> {{ resumen.TTFB }} ms</p>
        <a
          :href="resumen.detalles"
          target="_blank"
          class="block text-blue-600 mt-4 underline"
        >
          Ver informe completo en WebPageTest
        </a>
      </div>

      <div v-if="lighthouse" class="mt-8 p-6 bg-white rounded shadow-md">
        <h2 class="text-2xl font-bold text-green-700 mb-6">📊 Auditoría Lighthouse</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div v-for="(cat, key) in lighthouseCategorias" :key="key" class="bg-white p-6 rounded-lg shadow text-center">
            <p class="text-lg font-semibold text-gray-800">{{ cat.emoji }} {{ cat.nombre }}</p>
            <p v-if="lighthouse.categories && lighthouse.categories[key]" class="text-2xl font-bold text-blue-600">
              {{ (lighthouse.categories[key].score * 100).toFixed(0) }} / 100
            </p>
            <p v-else class="text-gray-400">No disponible</p>
          </div>
        </div>
        
        <div v-if="lighthouse.audits" class="mt-8">
          <h3 class="text-xl font-bold text-blue-800 mb-4">Detalles de la auditoría</h3>
          <div class="grid grid-cols-1 gap-4">
            <div v-for="(audit, key) in lighthouse.audits" :key="key" class="p-4 border rounded">
              <h4 class="font-bold">{{ audit.title }}</h4>
              <p class="text-sm text-gray-600">{{ audit.description }}</p>
              <p class="mt-2">
                <span class="font-semibold">Puntuación:</span> 
                <span :class="getScoreClass(audit.score)">
                  {{ (audit.score * 100).toFixed(0) }} / 100
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="resumen" class="mt-8 text-center text-red-600">
        ⚠️ No se pudo obtener el informe de Lighthouse.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const url = ref('');
const estado = ref('');
const resumen = ref(null);
const lighthouse = ref(null);
const cargando = ref(false);

const lighthouseCategorias = {
  performance: { nombre: 'Performance', emoji: '⚡' },
  accessibility: { nombre: 'Accesibilidad', emoji: '♿' },
  'best-practices': { nombre: 'Best Practices', emoji: '🔐' },
  seo: { nombre: 'SEO', emoji: '🔍' },
  pwa: { nombre: 'PWA', emoji: '📱' },
};

const getScoreClass = (score) => {
  if (score >= 0.9) return 'text-green-600 font-bold';
  if (score >= 0.5) return 'text-yellow-600 font-bold';
  return 'text-red-600 font-bold';
};

const analizar = async () => {
  if (!url.value) {
    estado.value = '❗ Debes ingresar una URL válida.';
    return;
  }

  cargando.value = true;
  estado.value = '🔎 Iniciando análisis...';
  resumen.value = null;
  lighthouse.value = null;

  try {
    const res = await fetch('/api/run-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.value })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Error en backend:', errorText);
      estado.value = `❌ Error backend: ${res.status} ${res.statusText}`;
      cargando.value = false;
      return;
    }

    const data = await res.json();
    console.log('👉 Resultado recibido del backend (resumen):', data);

    if (data.success && data.resumen?.testId) {
      resumen.value = data.resumen;
      await obtenerLighthouseDesdeBackend(data.resumen.testId);
      estado.value = '✅ Análisis completado.';
    } else {
      estado.value = '❌ No se pudo generar el informe.';
    }
  } catch (err) {
    console.error('❌ Error en análisis:', err);
    estado.value = '❌ Error de conexión o servidor.';
  } finally {
    cargando.value = false;
  }
};

const obtenerLighthouseDesdeBackend = async (testId) => {
  try {
    estado.value = '🔍 Obteniendo resultados de Lighthouse...';
    const res = await fetch(`/api/lighthouse/${testId}`);
    const data = await res.json();
    console.log('📦 Lighthouse recibido:', data);

    if (data.lighthouse) {
      lighthouse.value = data.lighthouse;
      console.log('✅ Lighthouse cargado correctamente:', lighthouse.value);
      estado.value = '✅ Análisis completado.';
    } else {
      console.warn('⚠️ Lighthouse no disponible en la respuesta:', data);
      estado.value = '⚠️ No se pudo obtener el informe de Lighthouse.';
    }
  } catch (err) {
    console.error('❌ Error trayendo Lighthouse:', err);
    estado.value = '❌ Error al obtener datos de Lighthouse.';
  }
};
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.8s ease-out;
}

body {
  font-family: 'Source Serif Pro', serif;
}
</style>