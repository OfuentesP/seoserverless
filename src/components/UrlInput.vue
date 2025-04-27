<template>
  <div class="w-full max-w-md">
    <input
      v-model="inputUrl"
      type="text"
      placeholder="https://www.ejemplo.cl"
      class="w-full p-3 mb-4 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      @keyup.enter="emitAnalizar"
    />
    <button
      @click="emitAnalizar"
      :disabled="loading"
      class="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
    >
      {{ loading ? 'Analizando...' : 'Analizar Sitio' }}
    </button>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue';
const props = defineProps({
  url: String,
  loading: Boolean
});
const emit = defineEmits(['analizar']);
const inputUrl = ref(props.url || '');
watch(() => props.url, val => { inputUrl.value = val; });
function emitAnalizar() {
  if (!inputUrl.value) {
    console.warn('[UrlInput] URL vacía, no se puede analizar');
    return;
  }
  console.log('[UrlInput] Analizando URL:', inputUrl.value);
  emit('analizar', inputUrl.value);
}
</script> 