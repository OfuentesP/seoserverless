<script setup>
import { ref, reactive } from 'vue'
import { runTest, getTestStatus, getTestResults } from './services/webpagetest'
import html2pdf from 'html2pdf.js'
import { analyzeMetadata } from './services/metadata';
import { analyzeMetadataWithGemini } from './services/gemini';
import { analyzeWithGemini, analyzeSitemapWithGemini } from './services/gemini'
import { analyzeSitemap } from './services/sitemap'
import UrlInputForm from './components/UrlInputForm.vue';
import MetadataAnalysis from './components/MetadataAnalysis.vue';
import AIAnalysis from './components/AIAnalysis.vue';
import SitemapAnalysis from './components/SitemapAnalysis.vue';

const url = ref('')
const loading = ref(false)
const error = ref(null)
const testId = ref(null)
const testStatus = reactive({
  statusCode: null,
  statusText: '',
  data: null
})
const progress = ref(0)
const resultsRef = ref(null)
const metadataResults = ref(null);
const metadataAnalysis = ref(null);
const isAnalyzingMetadata = ref(false);
const geminiAnalysis = ref('')
const sitemapAnalysis = ref('')
const webPageTestResults = ref(null)
const sitemapResults = ref(null)
const isAnalyzing = ref(false);
const currentStage = ref('');

const handleSubmit = async (submittedUrl) => {
  if (!submittedUrl || isAnalyzing.value) return;
  
  try {
    url.value = submittedUrl;
    isAnalyzing.value = true;
    loading.value = true;
    error.value = null;
    progress.value = 0;
    currentStage.value = 'Iniciando análisis...';
    geminiAnalysis.value = ''
    sitemapAnalysis.value = ''
    webPageTestResults.value = null
    sitemapResults.value = null
    metadataResults.value = null
    metadataAnalysis.value = null
    
    // Iniciar la prueba
    const result = await runTest(url.value)
    
    if (result.statusCode === 200) {
      testId.value = result.data.testId
      progress.value = 25
      
      // Iniciar el polling para verificar el estado
      await checkTestStatus()
    } else {
      error.value = `Error: ${result.statusText}`
    }
  } catch (err) {
    error.value = `Error: ${err.message}`
  } finally {
    isAnalyzing.value = false;
    loading.value = false;
  }
}

const checkTestStatus = async () => {
  if (!testId.value) return
  
  try {
    const status = await getTestStatus(testId.value)
    
    // Actualizar el estado
    testStatus.statusCode = status.statusCode
    testStatus.statusText = status.statusText
    
    // Si la prueba está completa, obtener los resultados
    if (status.statusCode === 200) {
      progress.value = 100
      const results = await getTestResults(testId.value)
      testStatus.data = results.data
      
      // Iniciar el análisis con Gemini AI
      await analyzeWithGeminiAI()
    } 
    // Si la prueba está en progreso, seguir verificando
    else if (status.statusCode === 101) {
      progress.value = Math.min(progress.value + 5, 95)
      setTimeout(checkTestStatus, 5000) // Verificar cada 5 segundos
    }
  } catch (err) {
    error.value = `Error al verificar el estado: ${err.message}`
  }
}

const downloadPDF = () => {
  if (!resultsRef.value) return
  
  const element = resultsRef.value
  const options = {
    margin: 10,
    filename: `seo-analysis-${url.value.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }
  
  // Generar el PDF
  html2pdf().set(options).from(element).save()
}

const analyzeWithGeminiAI = async () => {
  if (!testStatus.data) return
  
  try {
    loading.value = true
    progress.value = 95
    
    // Obtener análisis de Gemini
    geminiAnalysis.value = await analyzeWithGemini(testStatus.data, url.value)
    
    // Iniciar análisis de sitemap
    progress.value = 50
    currentStage.value = 'Analizando sitemap...';
    sitemapResults.value = await analyzeSitemap(url.value)
    
    // Generar análisis de sitemap con Gemini
    progress.value = 75
    currentStage.value = 'Generando análisis de sitemap con IA...';
    sitemapAnalysis.value = await analyzeSitemapWithGemini(sitemapResults.value)
    
    // Análisis de metadatos
    progress.value = 85
    currentStage.value = 'Analizando metadatos...';
    isAnalyzingMetadata.value = true
    metadataResults.value = await analyzeMetadata(url.value)
    metadataAnalysis.value = await analyzeMetadataWithGemini(metadataResults.value, url.value)
    
    progress.value = 100
    currentStage.value = 'Análisis completado';
  } catch (err) {
    error.value = `Error al analizar con IA: ${err.message}`
  } finally {
    loading.value = false
    isAnalyzingMetadata.value = false
  }
}
</script>

<template>
  <main class="flex-1 flex items-center justify-center min-h-screen bg-gradient-to-b from-black to-gray-900">
    <div class="container mx-auto px-4">
      <div class="max-w-5xl mx-auto">
        <div class="flex flex-col items-center justify-center space-y-8">
          <!-- Header Section -->
          <div class="text-center w-full">
            <h1 class="text-5xl font-bold text-white mb-3 tracking-tight">SEO Analyzer Pro</h1>
            <p class="text-gray-400 text-xl font-light">Análisis profesional de optimización para motores de búsqueda</p>
          </div>

          <!-- URL Input Form -->
          <UrlInputForm
            v-model="url"
            :is-analyzing="isAnalyzing"
            :progress="progress"
            :current-stage="currentStage"
            :error="error"
            @submit="handleSubmit"
          />

          <!-- Results Section -->
          <div v-if="metadataResults || metadataAnalysis || sitemapResults" ref="resultsRef" class="w-full space-y-8">
            <!-- Sitemap Analysis -->
            <SitemapAnalysis
              v-if="sitemapResults"
              :sitemap-results="sitemapResults"
              :sitemap-analysis="sitemapAnalysis"
            />

            <!-- Metadata Analysis -->
            <MetadataAnalysis
              v-if="metadataResults"
              :metadata-results="metadataResults"
            />

            <!-- AI Analysis -->
            <AIAnalysis
              v-if="metadataAnalysis"
              :analysis="metadataAnalysis"
            />

            <!-- Download PDF Button -->
            <div class="flex justify-end">
              <button 
                @click="downloadPDF" 
                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
