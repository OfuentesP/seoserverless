<template>
  <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
    <h2 class="text-2xl font-semibold mb-6 text-white pdf-text flex items-center">
      <span class="mr-3 text-purple-400">🔍</span>
      Análisis de Metadatos
    </h2>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
      <p class="text-gray-400 mt-4">Analizando metadatos...</p>
    </div>

    <div v-else-if="error" class="bg-red-500/10 text-red-400 p-4 rounded-lg">
      {{ error }}
    </div>

    <div v-else-if="metaData?.metaData" class="space-y-6">
      <!-- Meta Title -->
      <div class="bg-gray-800/50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-white mb-2">Meta Title</h3>
        <div class="flex items-center space-x-2">
          <span class="text-gray-400">Longitud:</span>
          <span :class="getLengthClass(metaData.analysis.titleLength, 30, 60)">
            {{ metaData.analysis.titleLength }} caracteres
          </span>
        </div>
        <div class="mt-2 p-3 bg-gray-900/50 rounded">
          <p class="text-gray-300">{{ metaData.metaData.title || 'No definido' }}</p>
        </div>
        <div class="mt-2">
          <p :class="metaData.analysis.titleStatus === 'optimal' ? 'text-green-400' : 'text-yellow-400'" class="text-sm">
            {{ metaData.analysis.titleStatus === 'optimal' 
              ? '✅ La longitud del título es óptima' 
              : '⚠️ Se recomienda un título entre 30-60 caracteres' }}
          </p>
        </div>
      </div>

      <!-- Meta Description -->
      <div class="bg-gray-800/50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-white mb-2">Meta Description</h3>
        <div class="flex items-center space-x-2">
          <span class="text-gray-400">Longitud:</span>
          <span :class="getLengthClass(metaData.analysis.descriptionLength, 120, 160)">
            {{ metaData.analysis.descriptionLength }} caracteres
          </span>
        </div>
        <div class="mt-2 p-3 bg-gray-900/50 rounded">
          <p class="text-gray-300">{{ metaData.metaData.description || 'No definido' }}</p>
        </div>
        <div class="mt-2">
          <p :class="metaData.analysis.descriptionStatus === 'optimal' ? 'text-green-400' : 'text-yellow-400'" class="text-sm">
            {{ metaData.analysis.descriptionStatus === 'optimal'
              ? '✅ La longitud de la descripción es óptima'
              : '⚠️ Se recomienda una descripción entre 120-160 caracteres' }}
          </p>
        </div>
      </div>

      <!-- Social Media -->
      <div class="bg-gray-800/50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-white mb-2">Social Media</h3>
        <div class="space-y-2">
          <div v-if="metaData.metaData.ogTitle" class="flex items-center space-x-2">
            <span class="text-gray-400">Open Graph Title:</span>
            <span class="text-gray-300">{{ metaData.metaData.ogTitle }}</span>
          </div>
          <div v-if="metaData.metaData.ogDescription" class="flex items-center space-x-2">
            <span class="text-gray-400">Open Graph Description:</span>
            <span class="text-gray-300">{{ metaData.metaData.ogDescription }}</span>
          </div>
          <div v-if="metaData.metaData.ogImage" class="flex items-center space-x-2">
            <span class="text-gray-400">Open Graph Image:</span>
            <span class="text-gray-300">{{ metaData.metaData.ogImage }}</span>
          </div>
          <div v-if="metaData.metaData.twitterCard" class="flex items-center space-x-2">
            <span class="text-gray-400">Twitter Card:</span>
            <span class="text-gray-300">{{ metaData.metaData.twitterCard }}</span>
          </div>
        </div>
        <div class="mt-2">
          <p :class="metaData.analysis.hasSocialMeta ? 'text-green-400' : 'text-yellow-400'" class="text-sm">
            {{ metaData.analysis.hasSocialMeta
              ? '✅ Metadatos sociales configurados correctamente'
              : '⚠️ Se recomienda agregar metadatos para redes sociales' }}
          </p>
        </div>
      </div>

      <!-- Otros Metadatos -->
      <div class="bg-gray-800/50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-white mb-2">Otros Metadatos</h3>
        <div class="space-y-2">
          <!-- Robots -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-gray-400">Meta Robots:</span>
              <span class="text-gray-300">{{ metaData.metaData.robots || 'No definido' }}</span>
            </div>
            <span :class="metaData.metaData.robots ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.robots ? '✅' : '⚠️' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 ml-4">Indica si Google y otros pueden indexar y seguir enlaces. Si hay noindex o nofollow, es clave alertar.</p>

          <!-- Canonical -->
          <div class="flex items-center justify-between mt-4">
            <div class="flex items-center space-x-2">
              <span class="text-gray-400">Canonical URL:</span>
              <span class="text-gray-300">{{ metaData.metaData.canonical || 'No definido' }}</span>
            </div>
            <span :class="metaData.metaData.canonical ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.canonical ? '✅' : '⚠️' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 ml-4">Evita contenido duplicado. Debe estar presente y apuntar a la versión principal de la URL.</p>

          <!-- Charset -->
          <div class="flex items-center justify-between mt-4">
            <div class="flex items-center space-x-2">
              <span class="text-gray-400">Charset:</span>
              <span class="text-gray-300">{{ metaData.metaData.charset || 'No definido' }}</span>
            </div>
            <span :class="metaData.metaData.charset ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.charset ? '✅' : '⚠️' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 ml-4">Evita errores de codificación. Útil validarlo aunque no es un factor SEO directo.</p>

          <!-- Viewport -->
          <div class="flex items-center justify-between mt-4">
            <div class="flex items-center space-x-2">
              <span class="text-gray-400">Viewport:</span>
              <span class="text-gray-300">{{ metaData.metaData.viewport || 'No definido' }}</span>
            </div>
            <span :class="metaData.metaData.viewport ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.viewport ? '✅' : '⚠️' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 ml-4">Crucial para mobile-friendliness, lo cual sí impacta en SEO (Core Web Vitals).</p>
        </div>
      </div>

      <!-- Checklist SEO -->
      <div class="bg-gray-800/50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-white mb-4">📋 Checklist Metadatos SEO</h3>
        <div class="space-y-3">
          <div class="flex items-center space-x-2">
            <span :class="metaData.metaData.robots ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.robots ? '✅' : '⚠️' }}
            </span>
            <span class="text-gray-300">robots: {{ metaData.metaData.robots ? 'index, follow' : 'no definido' }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="metaData.metaData.canonical ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.canonical ? '✅' : '⚠️' }}
            </span>
            <span class="text-gray-300">canonical: {{ metaData.metaData.canonical ? 'presente' : 'no definido' }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="metaData.metaData.ogTitle ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.ogTitle ? '✅' : '⚠️' }}
            </span>
            <span class="text-gray-300">og:title: {{ metaData.metaData.ogTitle ? 'presente' : 'no definido' }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="metaData.metaData.twitterCard ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.twitterCard ? '✅' : '⚠️' }}
            </span>
            <span class="text-gray-300">twitter:card: {{ metaData.metaData.twitterCard ? 'presente' : 'no definido' }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="metaData.metaData.charset ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.charset ? '✅' : '⚠️' }}
            </span>
            <span class="text-gray-300">charset: {{ metaData.metaData.charset ? 'UTF-8' : 'no definido' }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="metaData.metaData.viewport ? 'text-green-400' : 'text-yellow-400'">
              {{ metaData.metaData.viewport ? '✅' : '⚠️' }}
            </span>
            <span class="text-gray-300">viewport: {{ metaData.metaData.viewport ? 'presente' : 'no definido' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  url: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref(null);
const metaData = ref(null);

const getLengthClass = (length, min, max) => {
  if (!length) return 'text-gray-400';
  if (length < min) return 'text-yellow-400';
  if (length > max) return 'text-yellow-400';
  return 'text-green-400';
};

const analyzeMetaData = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await axios.get(`/api/analyze-meta?url=${encodeURIComponent(props.url)}`);
    metaData.value = response.data;

  } catch (err) {
    console.error('Error analyzing meta data:', err);
    error.value = err.response?.data?.error || 'Error al analizar los metadatos. Por favor, intenta nuevamente.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (props.url) {
    analyzeMetaData();
  } else {
    error.value = 'URL no proporcionada';
    loading.value = false;
  }
});
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style> 