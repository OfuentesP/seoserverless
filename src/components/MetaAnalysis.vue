<template>
  <div v-if="url" class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
    <h2 class="text-2xl font-semibold mb-6 text-white pdf-text flex items-center">
      <span class="mr-3 text-purple-400">🔍</span>
      Meta Analysis
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
          <span :class="getLengthClass(metaData.metaData.title?.length || 0, 30, 60)">
            {{ metaData.metaData.title?.length || 0 }} caracteres
          </span>
        </div>
        <div class="mt-2 p-3 bg-gray-900/50 rounded">
          <p class="text-gray-300">{{ metaData.metaData.title || 'No definido' }}</p>
        </div>
        <div class="mt-2">
          <p :class="(metaData.metaData.title?.length >= 30 && metaData.metaData.title?.length <= 60) ? 'text-green-400' : 'text-yellow-400'" class="text-sm">
            {{ (metaData.metaData.title?.length >= 30 && metaData.metaData.title?.length <= 60)
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
          <span :class="getLengthClass(metaData.metaData.description?.length || 0, 120, 160)">
            {{ metaData.metaData.description?.length || 0 }} caracteres
          </span>
        </div>
        <div class="mt-2 p-3 bg-gray-900/50 rounded">
          <p class="text-gray-300">{{ metaData.metaData.description || 'No definido' }}</p>
        </div>
        <div class="mt-2">
          <p :class="(metaData.metaData.description?.length >= 120 && metaData.metaData.description?.length <= 160) ? 'text-green-400' : 'text-yellow-400'" class="text-sm">
            {{ (metaData.metaData.description?.length >= 120 && metaData.metaData.description?.length <= 160)
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
          <p :class="Boolean(metaData.metaData.ogTitle || metaData.metaData.twitterCard) ? 'text-green-400' : 'text-yellow-400'" class="text-sm">
            {{ Boolean(metaData.metaData.ogTitle || metaData.metaData.twitterCard)
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

      <!-- Análisis Técnico -->
      <div v-if="metaData.technicalAnalysis" class="bg-gray-800/50 p-4 rounded-lg mt-6">
        <h3 class="text-2xl font-semibold mb-6 text-white flex items-center">
          <span class="mr-3 text-blue-400">🔧</span>
          Análisis Técnico
        </h3>

        <!-- Mobile Friendly -->
        <div class="mb-6">
          <h4 class="text-lg font-medium text-white mb-3">📱 Compatibilidad Mobile</h4>
          <div class="bg-gray-900/50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Estado Mobile-Friendly:</span>
              <span :class="metaData.technicalAnalysis.mobile?.isOptimized ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.technicalAnalysis.mobile?.isOptimized ? '✅ Optimizado' : '⚠️ Necesita mejoras' }}
              </span>
            </div>
            <div v-if="metaData.technicalAnalysis.mobile?.recommendation" class="mt-2 text-yellow-400 text-sm">
              ⚠️ {{ metaData.technicalAnalysis.mobile.recommendation }}
            </div>
          </div>
        </div>

        <!-- Scripts -->
        <div class="mb-6">
          <h4 class="text-lg font-medium text-white mb-3">📜 Scripts y Recursos</h4>
          <div class="bg-gray-900/50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Total Scripts:</span>
              <span class="text-blue-400">{{ metaData.technicalAnalysis.scripts?.total || 0 }}</span>
            </div>
            <div class="flex items-center justify-between mt-2">
              <span class="text-gray-300">Scripts Bloqueantes:</span>
              <span :class="(metaData.technicalAnalysis.scripts?.blocking || 0) === 0 ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.technicalAnalysis.scripts?.blocking || 0 }}
              </span>
            </div>
            <div v-if="metaData.technicalAnalysis.scripts?.recommendation" class="mt-2 text-yellow-400 text-sm">
              ⚠️ {{ metaData.technicalAnalysis.scripts.recommendation }}
            </div>
          </div>
        </div>

        <!-- Fonts -->
        <div class="mb-6">
          <h4 class="text-lg font-medium text-white mb-3">🔤 Fuentes Web</h4>
          <div class="bg-gray-900/50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Google Fonts:</span>
              <span class="text-blue-400">{{ metaData.technicalAnalysis.fonts?.googleFonts || 0 }}</span>
            </div>
            <div class="flex items-center justify-between mt-2">
              <span class="text-gray-300">Preconnect:</span>
              <span :class="metaData.technicalAnalysis.fonts?.hasPreconnect ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.technicalAnalysis.fonts?.hasPreconnect ? '✅' : '⚠️' }}
              </span>
            </div>
            <div v-if="metaData.technicalAnalysis.fonts?.recommendation" class="mt-2 text-yellow-400 text-sm">
              ⚠️ {{ metaData.technicalAnalysis.fonts.recommendation }}
            </div>
          </div>
        </div>

        <!-- Images -->
        <div class="mb-6">
          <h4 class="text-lg font-medium text-white mb-3">🖼️ Imágenes</h4>
          <div class="bg-gray-900/50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Total Imágenes:</span>
              <span class="text-blue-400">{{ metaData.technicalAnalysis.images?.total || 0 }}</span>
            </div>
            <div class="flex items-center justify-between mt-2">
              <span class="text-gray-300">Sin atributo alt:</span>
              <span :class="(metaData.technicalAnalysis.images?.withoutAlt || 0) === 0 ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.technicalAnalysis.images?.withoutAlt || 0 }}
              </span>
            </div>
            <div v-if="metaData.technicalAnalysis.images?.recommendation" class="mt-2 text-yellow-400 text-sm">
              ⚠️ {{ metaData.technicalAnalysis.images.recommendation }}
            </div>
          </div>
        </div>

        <!-- Checklist Técnica SEO -->
        <div class="bg-gray-900/50 p-4 rounded-lg mt-6">
          <h4 class="text-lg font-medium text-white mb-4">✅ Checklist Técnica SEO</h4>
          <div class="space-y-2">
            <div class="flex items-center space-x-2">
              <span :class="metaData.metaData.title && metaData.metaData.description ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.metaData.title && metaData.metaData.description ? '✔️' : '⚠️' }}
              </span>
              <span class="text-gray-300">Título y descripción presentes</span>
            </div>
            <div class="flex items-center space-x-2">
              <span :class="metaData.metaData.canonical ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.metaData.canonical ? '✔️' : '⚠️' }}
              </span>
              <span class="text-gray-300">Canonical definido</span>
            </div>
            <div class="flex items-center space-x-2">
              <span :class="metaData.metaData.ogTitle && metaData.metaData.twitterCard ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.metaData.ogTitle && metaData.metaData.twitterCard ? '✔️' : '⚠️' }}
              </span>
              <span class="text-gray-300">OG y Twitter configurados</span>
            </div>
            <div class="flex items-center space-x-2">
              <span :class="metaData.technicalAnalysis.mobile?.hasViewport ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.technicalAnalysis.mobile?.hasViewport ? '✔️' : '⚠️' }}
              </span>
              <span class="text-gray-300">Viewport presente</span>
            </div>
            <div class="flex items-center space-x-2">
              <span :class="metaData.technicalAnalysis.security?.https ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.technicalAnalysis.security?.https ? '✔️' : '⚠️' }}
              </span>
              <span class="text-gray-300">HTTPS activo</span>
            </div>
            <div class="flex items-center space-x-2">
              <span :class="metaData.technicalAnalysis.favicon?.present ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.technicalAnalysis.favicon?.present ? '✔️' : '❓' }}
              </span>
              <span class="text-gray-300">Favicon {{ metaData.technicalAnalysis.favicon?.present ? 'detectado' : 'no detectado' }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span :class="metaData.metaData.language ? 'text-green-400' : 'text-yellow-400'">
                {{ metaData.metaData.language ? '✔️' : '❓' }}
              </span>
              <span class="text-gray-300">Idioma definido: {{ metaData.metaData.language || 'no definido' }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-yellow-400">❓</span>
              <span class="text-gray-300">{{ metaData.technicalAnalysis.images?.withoutAlt || 0 }} imágenes sin atributo alt</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-yellow-400">❓</span>
              <span class="text-gray-300">{{ metaData.technicalAnalysis.scripts?.blocking || 0 }} scripts bloqueantes detectados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
    <p class="text-gray-400">No hay URL disponible para el análisis</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  url: {
    type: String,
    required: true,
    default: ''
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

// Debug logs
console.log('🔍 [MetaAnalysis] URL recibida:', props.url);
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