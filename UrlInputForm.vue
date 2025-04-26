<template>
  <div class="w-full max-w-3xl">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- URL Input -->
      <div class="relative">
        <input
          type="url"
          v-model="inputUrl"
          :disabled="isAnalyzing"
          placeholder="Ingresa la URL de tu sitio web (ej: https://ejemplo.com)"
          class="w-full px-4 py-3 text-lg bg-white/10 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          required
        />
      </div>

      <!-- Submit Button -->
      <div class="flex justify-center">
        <button
          type="submit"
          :disabled="isAnalyzing"
          class="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span v-if="!isAnalyzing">Analizar Sitio</span>
          <div v-else class="flex items-center space-x-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Analizando...</span>
          </div>
        </button>
      </div>

      <!-- Progress Bar -->
      <div v-if="isAnalyzing && progress > 0" class="w-full">
        <div class="w-full bg-gray-700 rounded-full h-2">
          <div
            class="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <p class="text-gray-400 text-sm mt-2 text-center">{{ currentStage }}</p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="text-red-500 text-center bg-red-500/10 p-4 rounded-lg">
        {{ error }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
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
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const inputUrl = ref(props.modelValue)

const handleSubmit = () => {
  if (!inputUrl.value) return
  emit('update:modelValue', inputUrl.value)
  emit('submit', inputUrl.value)
}
</script> 