<template>
  <div class="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
    <h2 class="text-2xl font-bold text-white mb-4">Análisis de IA</h2>
    
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      <p class="text-gray-400 mt-4">Analizando el contenido...</p>
    </div>

    <div v-else-if="error" class="bg-red-500/10 text-red-400 p-4 rounded-lg">
      {{ error }}
    </div>

    <div v-else-if="aiResults" class="space-y-6">
      <!-- Content Quality -->
      <div v-if="aiResults.contentQuality">
        <h3 class="text-lg font-semibold text-white mb-2">Calidad del Contenido</h3>
        <div class="bg-white/10 rounded p-4">
          <div class="flex items-center mb-2">
            <div class="flex-1">
              <div class="h-2 bg-gray-700 rounded-full">
                <div
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getScoreColorClass(aiResults.contentQuality.score)"
                  :style="{ width: `${aiResults.contentQuality.score}%` }"
                ></div>
              </div>
            </div>
            <span class="ml-2 text-sm" :class="getScoreColorClass(aiResults.contentQuality.score)">
              {{ aiResults.contentQuality.score }}%
            </span>
          </div>
          <p class="text-gray-300 text-sm">{{ aiResults.contentQuality.analysis }}</p>
        </div>
      </div>

      <!-- SEO Recommendations -->
      <div v-if="aiResults.recommendations && aiResults.recommendations.length">
        <h3 class="text-lg font-semibold text-white mb-2">Recomendaciones SEO</h3>
        <ul class="space-y-2">
          <li
            v-for="(rec, index) in aiResults.recommendations"
            :key="index"
            class="bg-white/10 p-3 rounded flex items-start"
          >
            <span class="text-blue-400 mr-2">•</span>
            <span class="text-gray-300">{{ rec }}</span>
          </li>
        </ul>
      </div>

      <!-- Keyword Analysis -->
      <div v-if="aiResults.keywordAnalysis">
        <h3 class="text-lg font-semibold text-white mb-2">Análisis de Palabras Clave</h3>
        <div class="bg-white/10 rounded p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="(keyword, index) in aiResults.keywordAnalysis" :key="index">
              <p class="text-white font-medium mb-1">{{ keyword.term }}</p>
              <div class="flex items-center">
                <div class="flex-1">
                  <div class="h-2 bg-gray-700 rounded-full">
                    <div
                      class="h-2 rounded-full transition-all duration-300"
                      :class="getScoreColorClass(keyword.relevance)"
                      :style="{ width: `${keyword.relevance}%` }"
                    ></div>
                  </div>
                </div>
                <span class="ml-2 text-sm" :class="getScoreColorClass(keyword.relevance)">
                  {{ keyword.relevance }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-400">No hay resultados de análisis disponibles</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AIAnalysis',
  props: {
    aiResults: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    }
  },
  methods: {
    getScoreColorClass(score) {
      if (score >= 80) return 'text-green-400';
      if (score >= 60) return 'text-yellow-400';
      return 'text-red-400';
    }
  }
};
</script> 