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

      <div v-if="estado" class="text-center mt-4 text-gray-700 font-medium">
        {{ estado }}
      </div>

      <div v-if="resumen" class="mt-8 p-6 bg-white rounded shadow-md">
        <h2 class="text-xl font-bold mb-4 text-blue-800">✅ Resultados:</h2>
        <p>⏱ <strong>Tiempo de carga:</strong> {{ resumen.loadTime }} ms</p>
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
      </div>

      <div v-if="resumen && resumen.lighthouse" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fadeIn">
        <div class="sm:col-span-2">
          <h2 class="text-2xl font-bold text-green-700 mb-6">📈 Resultados Lighthouse</h2>
        </div>
        <div class="bg-white p-6 rounded-lg shadow text-center">
          <p class="text-lg font-semibold text-gray-800">Performance</p>
          <p class="text-2xl font-bold text-blue-600">{{ (resumen.lighthouse.categories.performance.score * 100).toFixed(0) }} / 100</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow text-center">
          <p class="text-lg font-semibold text-gray-800">Accesibilidad</p>
          <p class="text-2xl font-bold text-blue-600">{{ (resumen.lighthouse.categories.accessibility.score * 100).toFixed(0) }} / 100</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow text-center">
          <p class="text-lg font-semibold text-gray-800">Best Practices</p>
          <p class="text-2xl font-bold text-blue-600">{{ (resumen.lighthouse.categories['best-practices'].score * 100).toFixed(0) }} / 100</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow text-center">
          <p class="text-lg font-semibold text-gray-800">SEO</p>
          <p class="text-2xl font-bold text-blue-600">{{ (resumen.lighthouse.categories.seo.score * 100).toFixed(0) }} / 100</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow text-center">
          <p class="text-lg font-semibold text-gray-800">PWA</p>
          <p class="text-2xl font-bold text-blue-600">{{ (resumen.lighthouse.categories.pwa.score * 100).toFixed(0) }} / 100</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const url = ref('');
const estado = ref('');
const resumen = ref(null);
const cargando = ref(false);

const analizar = async () => {
  if (!url.value) {
    estado.value = '❗ Debes ingresar una URL válida.';
    return;
  }

  cargando.value = true;
  estado.value = '🔎 Iniciando análisis...';

  resumen.value = null;

  try {
    const res = await fetch('/api/run-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.value })
    });

    const data = await res.json();
    console.log('👉 Resultado recibido del backend:', data);

    if (data.success) {
      resumen.value = data.summary;
      estado.value = '✅ Análisis completado.';
    } else {
      estado.value = '❌ No se pudo generar el informe.';
    }
  } catch (err) {
    console.error(err);
    estado.value = '❌ Error de conexión o servidor.';
  } finally {
    cargando.value = false;
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