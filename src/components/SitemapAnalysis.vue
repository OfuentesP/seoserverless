<template>
  <div class="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
    <h2 class="text-2xl font-bold text-white mb-4">Análisis del Sitemap</h2>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      <p class="text-gray-400 mt-4">Analizando el sitemap...</p>
    </div>

    <div v-else-if="error" class="bg-red-500/10 text-red-400 p-4 rounded-lg">
      {{ error }}
    </div>

    <div v-else-if="sitemapResults" class="space-y-6">
      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white/10 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-400">Total URLs</h3>
          <p class="text-2xl font-bold text-white">{{ sitemapResults.stats.total }}</p>
          <p class="text-xs text-gray-400 mt-1">
            {{ sitemapResults.stats.skipped }} URLs no validadas
          </p>
        </div>
        <div class="bg-white/10 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-400">URLs Válidas</h3>
          <p class="text-2xl font-bold text-green-400">{{ sitemapResults.stats.valid }}</p>
          <p class="text-xs text-gray-400 mt-1">
            {{ ((sitemapResults.stats.valid / sitemapResults.stats.validated) * 100).toFixed(1) }}% de las URLs validadas
          </p>
        </div>
        <div class="bg-white/10 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-400">URLs con Problemas</h3>
          <p class="text-2xl font-bold text-red-400">{{ sitemapResults.stats.invalid }}</p>
          <p class="text-xs text-gray-400 mt-1">
            {{ ((sitemapResults.stats.invalid / sitemapResults.stats.validated) * 100).toFixed(1) }}% de las URLs validadas
          </p>
        </div>
        <div class="bg-white/10 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-400">Última Modificación</h3>
          <p class="text-2xl font-bold text-white">{{ formatDate(sitemapResults.lastmod) }}</p>
          <p class="text-xs text-gray-400 mt-1">
            {{ sitemapResults.type }}
          </p>
        </div>
      </div>

      <!-- Media Stats -->
      <div v-if="hasMediaContent" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-if="sitemapResults.images.total > 0" class="bg-white/10 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-400">Imágenes</h3>
          <p class="text-2xl font-bold text-white">{{ sitemapResults.images.total }}</p>
          <p class="text-xs text-gray-400 mt-1">
            En {{ sitemapResults.images.urlsWithImages }} URLs
          </p>
        </div>
        <div v-if="sitemapResults.videos.total > 0" class="bg-white/10 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-400">Videos</h3>
          <p class="text-2xl font-bold text-white">{{ sitemapResults.videos.total }}</p>
          <p class="text-xs text-gray-400 mt-1">
            En {{ sitemapResults.videos.urlsWithVideos }} URLs
          </p>
        </div>
        <div v-if="sitemapResults.localization.hasAlternates" class="bg-white/10 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-400">Idiomas</h3>
          <p class="text-2xl font-bold text-white">{{ Object.keys(sitemapResults.localization.languages).length }}</p>
          <p class="text-xs text-gray-400 mt-1">
            {{ sitemapResults.localization.urlsWithAlternates }} URLs con alternativas
          </p>
        </div>
      </div>

      <!-- URL List -->
      <div v-if="sitemapResults.urls && sitemapResults.urls.length">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-semibold text-white">Lista de URLs</h3>
          <div class="text-sm text-gray-400">
            Mostrando {{ sitemapResults.urls.length }} de {{ sitemapResults.stats.total }} URLs
          </div>
        </div>
        <div class="bg-white/10 rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">URL</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Prioridad</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Frecuencia</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Última Mod.</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                <tr v-for="(url, index) in sitemapResults.urls" :key="index">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <a :href="url.loc" target="_blank" class="hover:text-blue-400">{{ url.loc }}</a>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="getStatusClass(url.status)">
                      {{ url.status || 'OK' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {{ url.priority || 'N/A' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {{ url.changefreq || 'N/A' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {{ formatDate(url.lastmod) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Issues -->
      <div v-if="sitemapResults.problems && sitemapResults.problems.length">
        <h3 class="text-lg font-semibold text-white mb-2">Problemas Detectados</h3>
        <div class="space-y-2">
          <div
            v-for="(issue, index) in sitemapResults.problems"
            :key="index"
            class="bg-white/10 p-4 rounded-lg flex items-start"
          >
            <span class="text-red-400 mr-2">⚠</span>
            <div>
              <p class="text-white font-medium">{{ issue.title }}</p>
              <p class="text-gray-400 text-sm">{{ issue.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-400">No hay resultados de análisis de sitemap disponibles</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SitemapAnalysis',
  props: {
    sitemapResults: {
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
  computed: {
    hasMediaContent() {
      return this.sitemapResults && (
        this.sitemapResults.images?.total > 0 ||
        this.sitemapResults.videos?.total > 0 ||
        this.sitemapResults.localization?.hasAlternates
      );
    }
  },
  methods: {
    getStatusClass(status) {
      switch (status?.toLowerCase()) {
        case 'ok':
        case '200':
          return 'text-green-400';
        case 'redirect':
        case '301':
        case '302':
          return 'text-yellow-400';
        default:
          return 'text-red-400';
      }
    },
    formatDate(date) {
      if (!date) return 'N/A';
      try {
        return new Date(date).toLocaleDateString();
      } catch (e) {
        return 'Fecha inválida';
      }
    }
  }
};
</script> 