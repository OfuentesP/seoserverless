<script setup>
import WebPageTestSummary from '../components/WebPageTestSummary.vue';
import CoreWebVitals from '../components/CoreWebVitals.vue';
import LighthouseResults from '../components/LighthouseResults.vue';
import GeminiInsights from '../components/GeminiInsights.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col items-center p-8 bg-gray-50">
    <h1 class="text-3xl font-bold mb-6">📊 Resultados del Análisis</h1>
    
    <WebPageTestSummary />
    <CoreWebVitals />
    <LighthouseResults />
    <GeminiInsights />
  </div>
</template>

<style scoped>
</style>