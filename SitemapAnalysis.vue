<template>
  <div class="bg-white rounded-lg shadow-lg p-6 space-y-6">
    <h2 class="text-2xl font-bold text-gray-800 mb-4">Análisis de Sitemap</h2>

    <!-- General Summary -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-700">Total URLs</h3>
        <p class="text-3xl font-bold text-blue-600">{{ sitemapResults.totalUrls }}</p>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-700">URLs Válidas</h3>
        <p class="text-3xl font-bold text-green-600">{{ sitemapResults.validUrls }}</p>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-700">URLs Inválidas</h3>
        <p class="text-3xl font-bold text-red-600">{{ sitemapResults.invalidUrls }}</p>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-700">Tipo de Sitemap</h3>
        <p class="text-xl font-bold text-purple-600">{{ sitemapResults.sitemapType }}</p>
      </div>
    </div>

    <!-- Content Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Imágenes</h3>
        <p class="text-2xl font-bold text-blue-600">{{ sitemapResults.totalImages }}</p>
        <p class="text-sm text-gray-600">URLs con imágenes: {{ sitemapResults.urlsWithImages }}</p>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Videos</h3>
        <p class="text-2xl font-bold text-blue-600">{{ sitemapResults.totalVideos }}</p>
        <p class="text-sm text-gray-600">URLs con videos: {{ sitemapResults.urlsWithVideos }}</p>
      </div>
    </div>

    <!-- Localization & Priority -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Localización</h3>
        <p class="text-2xl font-bold text-purple-600">{{ sitemapResults.urlsWithAlternatives }}</p>
        <p class="text-sm text-gray-600">URLs con alternativas</p>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Prioridades</h3>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">Alta:</span>
            <span class="font-semibold text-green-600">{{ sitemapResults.priorityCounts.high }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Media:</span>
            <span class="font-semibold text-yellow-600">{{ sitemapResults.priorityCounts.medium }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Baja:</span>
            <span class="font-semibold text-red-600">{{ sitemapResults.priorityCounts.low }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Change Frequency -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">Frecuencia de Cambios</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="(count, freq) in sitemapResults.changeFreqCounts" :key="freq" class="text-center">
          <p class="text-sm text-gray-600">{{ freq }}</p>
          <p class="text-xl font-bold text-blue-600">{{ count }}</p>
        </div>
      </div>
    </div>

    <!-- Error Detection -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">Errores Detectados</h3>
      <div class="space-y-2">
        <div v-for="(count, status) in sitemapResults.errorsByStatus" :key="status" class="flex justify-between">
          <span class="text-gray-600">Código {{ status }}:</span>
          <span class="font-semibold text-red-600">{{ count }}</span>
        </div>
      </div>
    </div>

    <!-- AI Analysis -->
    <div v-if="sitemapAnalysis" class="bg-gray-50 p-4 rounded-lg space-y-4">
      <h3 class="text-lg font-semibold text-gray-700">Análisis de IA</h3>
      
      <div class="space-y-4">
        <div>
          <h4 class="font-medium text-gray-700">Resumen</h4>
          <p class="text-gray-600">{{ sitemapAnalysis.summary }}</p>
        </div>

        <div>
          <h4 class="font-medium text-gray-700">Problemas Identificados</h4>
          <ul class="list-disc list-inside text-gray-600">
            <li v-for="(problem, index) in sitemapAnalysis.problems" :key="index">
              {{ problem }}
            </li>
          </ul>
        </div>

        <div>
          <h4 class="font-medium text-gray-700">Recomendaciones</h4>
          <ul class="list-disc list-inside text-gray-600">
            <li v-for="(recommendation, index) in sitemapAnalysis.recommendations" :key="index">
              {{ recommendation }}
            </li>
          </ul>
        </div>

        <div>
          <h4 class="font-medium text-gray-700">Acciones Prioritarias</h4>
          <ul class="list-disc list-inside text-gray-600">
            <li v-for="(action, index) in sitemapAnalysis.actionItems" :key="index">
              {{ action }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  sitemapResults: {
    type: Object,
    required: true
  },
  sitemapAnalysis: {
    type: Object,
    required: true
  }
});
</script> 