<template>
  <div v-if="metadataResults" class="bg-white rounded-lg shadow-lg p-6 mb-6">
    <h4 class="text-blue-600 font-medium mb-3 text-lg">Análisis de Metadatos</h4>
    
    <!-- Title Analysis -->
    <div class="mb-6">
      <h3 class="text-xl font-medium text-gray-800 mb-4">Título</h3>
      <div class="bg-gray-50 p-4 rounded-lg">
        <p class="text-gray-800 mb-2">{{ metadataResults.title }}</p>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Longitud: {{ metadataResults.titleAnalysis.length }} caracteres</span>
          <span
            :class="metadataResults.titleAnalysis.isOptimal ? 'text-green-600' : 'text-yellow-600'"
            class="text-sm font-medium"
          >
            {{ metadataResults.titleAnalysis.recommendation }}
          </span>
        </div>
      </div>
    </div>

    <!-- Description Analysis -->
    <div class="mb-6">
      <h3 class="text-xl font-medium text-gray-800 mb-4">Descripción</h3>
      <div class="bg-gray-50 p-4 rounded-lg">
        <p class="text-gray-800 mb-2">{{ metadataResults.description }}</p>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Longitud: {{ metadataResults.descriptionAnalysis.length }} caracteres</span>
          <span
            :class="metadataResults.descriptionAnalysis.isOptimal ? 'text-green-600' : 'text-yellow-600'"
            class="text-sm font-medium"
          >
            {{ metadataResults.descriptionAnalysis.recommendation }}
          </span>
        </div>
      </div>
    </div>

    <!-- Keywords Analysis -->
    <div class="mb-6">
      <h3 class="text-xl font-medium text-gray-800 mb-4">Palabras Clave</h3>
      <div class="bg-gray-50 p-4 rounded-lg">
        <p class="text-gray-800 mb-2">{{ metadataResults.keywords }}</p>
        <div class="space-y-2">
          <p class="text-sm text-gray-600">
            Total de palabras clave: {{ metadataResults.keywordAnalysis.totalKeywords }}
          </p>
          <p class="text-sm text-gray-600">
            Palabras clave en título: {{ metadataResults.keywordAnalysis.keywordsInTitle }}
          </p>
          <p class="text-sm text-gray-600">
            Palabras clave en descripción: {{ metadataResults.keywordAnalysis.keywordsInDescription }}
          </p>
          <p class="text-sm font-medium text-gray-700">
            {{ metadataResults.keywordAnalysis.recommendation }}
          </p>
        </div>
      </div>
    </div>

    <!-- Duplicate Analysis -->
    <div v-if="metadataResults.duplicateAnalysis.hasDuplicates" class="mb-6">
      <h3 class="text-xl font-medium text-gray-800 mb-4">Análisis de Duplicados</h3>
      <div class="bg-yellow-50 p-4 rounded-lg">
        <p class="text-yellow-800 mb-2">{{ metadataResults.duplicateAnalysis.recommendation }}</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="word in metadataResults.duplicateAnalysis.duplicateWords"
            :key="word"
            class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm"
          >
            {{ word }}
          </span>
        </div>
      </div>
    </div>

    <!-- Open Graph Tags -->
    <div v-if="Object.keys(metadataResults.ogTags).length > 0" class="mb-6">
      <h3 class="text-xl font-medium text-gray-800 mb-4">Open Graph Tags</h3>
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="space-y-2">
          <div v-for="(value, key) in metadataResults.ogTags" :key="key" class="flex gap-2">
            <span class="text-sm font-medium text-gray-600">{{ key }}:</span>
            <span class="text-sm text-gray-800">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Twitter Card Tags -->
    <div v-if="Object.keys(metadataResults.twitterTags).length > 0" class="mb-6">
      <h3 class="text-xl font-medium text-gray-800 mb-4">Twitter Card Tags</h3>
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="space-y-2">
          <div v-for="(value, key) in metadataResults.twitterTags" :key="key" class="flex gap-2">
            <span class="text-sm font-medium text-gray-600">{{ key }}:</span>
            <span class="text-sm text-gray-800">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Other Metadata -->
    <div class="space-y-4">
      <div v-if="metadataResults.robots" class="flex gap-2">
        <span class="text-sm font-medium text-gray-600">Robots:</span>
        <span class="text-sm text-gray-800">{{ metadataResults.robots }}</span>
      </div>
      <div v-if="metadataResults.canonical" class="flex gap-2">
        <span class="text-sm font-medium text-gray-600">Canonical URL:</span>
        <span class="text-sm text-gray-800">{{ metadataResults.canonical }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  metadataResults: {
    type: Object,
    required: true
  }
});
</script> 