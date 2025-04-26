<template>
  <div v-if="analysis" class="bg-white rounded-lg shadow-lg p-6">
    <h2 class="text-2xl font-serif font-bold text-gray-900 mb-6">Análisis de IA</h2>
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-medium text-gray-900 mb-4">Resumen</h3>
        <p class="text-gray-700">{{ analysis.summary }}</p>
      </div>
      <div>
        <h3 class="text-xl font-medium text-gray-900 mb-4">Problemas Identificados</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li v-for="(problem, index) in analysis.problems" :key="index">
            {{ problem }}
          </li>
        </ul>
      </div>
      <div>
        <h3 class="text-xl font-medium text-gray-900 mb-4">Recomendaciones</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li v-for="(recommendation, index) in analysis.recommendations" :key="index">
            {{ recommendation }}
          </li>
        </ul>
      </div>
      <div>
        <h3 class="text-xl font-medium text-gray-900 mb-4">Acciones Prioritarias</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li v-for="(action, index) in analysis.actionItems" :key="index">
            {{ action }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  analysis: {
    type: Object,
    required: true
  }
});
</script> 