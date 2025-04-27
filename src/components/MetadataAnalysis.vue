<template>
  <div v-if="metadataResults" class="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
    <h2 class="text-2xl font-bold text-white mb-4">Análisis de Metadatos</h2>
    
    <!-- Title -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-white mb-2">Título</h3>
      <p class="text-gray-300">{{ metadataResults.title || 'No se encontró título' }}</p>
      <p class="text-sm text-gray-400 mt-1">
        Longitud: {{ metadataResults.title?.length || 0 }} caracteres
        <span v-if="metadataResults.title" :class="getTitleLengthClass(metadataResults.title.length)">
          ({{ getTitleLengthStatus(metadataResults.title.length) }})
        </span>
      </p>
    </div>

    <!-- Description -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-white mb-2">Meta Descripción</h3>
      <p class="text-gray-300">{{ metadataResults.description || 'No se encontró meta descripción' }}</p>
      <p class="text-sm text-gray-400 mt-1">
        Longitud: {{ metadataResults.description?.length || 0 }} caracteres
        <span v-if="metadataResults.description" :class="getDescriptionLengthClass(metadataResults.description.length)">
          ({{ getDescriptionLengthStatus(metadataResults.description.length) }})
        </span>
      </p>
    </div>

    <!-- Keywords -->
    <div class="mb-6" v-if="metadataResults.keywords">
      <h3 class="text-lg font-semibold text-white mb-2">Palabras Clave</h3>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="(keyword, index) in metadataResults.keywords.split(',')"
          :key="index"
          class="px-2 py-1 bg-white/10 rounded text-sm text-gray-300"
        >
          {{ keyword.trim() }}
        </span>
      </div>
    </div>

    <!-- Other Meta Tags -->
    <div v-if="metadataResults.otherMetaTags && metadataResults.otherMetaTags.length > 0">
      <h3 class="text-lg font-semibold text-white mb-2">Otras Etiquetas Meta</h3>
      <div class="space-y-2">
        <div
          v-for="(meta, index) in metadataResults.otherMetaTags"
          :key="index"
          class="bg-white/10 rounded p-2"
        >
          <p class="text-gray-300">
            <span class="text-gray-400">{{ meta.name || meta.property }}:</span>
            {{ meta.content }}
          </p>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="error" class="bg-white/5 rounded-lg p-6">
    <p class="text-red-400">{{ error }}</p>
  </div>
  <div v-else class="bg-white/5 rounded-lg p-6">
    <p class="text-gray-400">No hay datos de metadatos disponibles</p>
  </div>
</template>

<script>
export default {
  name: 'MetadataAnalysis',
  props: {
    metadataResults: {
      type: Object,
      default: null
    },
    error: {
      type: String,
      default: ''
    }
  },
  methods: {
    getTitleLengthStatus(length) {
      if (length < 30) return 'Demasiado corto';
      if (length > 60) return 'Demasiado largo';
      return 'Longitud óptima';
    },
    getTitleLengthClass(length) {
      if (length < 30 || length > 60) return 'text-yellow-400';
      return 'text-green-400';
    },
    getDescriptionLengthStatus(length) {
      if (length < 120) return 'Demasiado corta';
      if (length > 155) return 'Demasiado larga';
      return 'Longitud óptima';
    },
    getDescriptionLengthClass(length) {
      if (length < 120 || length > 155) return 'text-yellow-400';
      return 'text-green-400';
    }
  }
};
</script> 