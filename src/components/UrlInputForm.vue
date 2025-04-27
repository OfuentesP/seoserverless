<template>
  <div class="w-full max-w-2xl">
    <div class="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-xl">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <input
            type="url"
            v-model="inputUrl"
            placeholder="Ingresa la URL del sitio web"
            required
            class="w-full px-4 py-3 rounded-lg bg-white/5 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        
        <button
          type="submit"
          :disabled="isAnalyzing"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <span v-if="!isAnalyzing">Analizar</span>
          <span v-else>Analizando...</span>
        </button>
      </form>

      <!-- Progress Bar -->
      <div v-if="isAnalyzing" class="mt-6 space-y-2">
        <div class="flex justify-between text-sm text-gray-300">
          <span>{{ currentStage || 'Analizando...' }}</span>
          <span>{{ progress }}%</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-500"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UrlInputForm',
  props: {
    isAnalyzing: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0
    },
    currentStage: {
      type: String,
      default: ''
    },
    error: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      inputUrl: ''
    }
  },
  methods: {
    handleSubmit() {
      if (!this.inputUrl) return
      this.$emit('submit', this.inputUrl)
    }
  }
}
</script> 