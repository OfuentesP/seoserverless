<script setup>
import { computed } from 'vue';
import useSeoAnalysis from '../composables/useSeoAnalysis';

const {
  geminiInsight
} = useSeoAnalysis();

// Función para convertir markdown a HTML con estilos
function formatMarkdown(text) {
  if (!text) return '';
  
  // Convertir títulos con emojis
  text = text.replace(/^#\s*([✅⚠️💡🚀])\s*(.*)$/gm, '<h2 class="text-xl font-bold mt-6 mb-4 flex items-center gap-2"><span>$1</span> $2</h2>');
  
  // Convertir títulos normales
  text = text.replace(/^##\s*(.*)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-3">$1</h3>');
  
  // Convertir listas con asteriscos
  text = text.replace(/^\*\s*(.*)$/gm, '<li class="ml-4 mb-2">$1</li>');
  
  // Convertir negritas
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
  
  // Convertir cursivas
  text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  
  // Convertir enlaces
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>');
  
  // Convertir párrafos (excluyendo los que ya son elementos HTML)
  text = text.replace(/^(?!<[a-z])(.*)$/gm, '<p class="mb-4">$1</p>');
  
  // Limpiar párrafos vacíos
  text = text.replace(/<p class="mb-4"><\/p>/g, '');
  
  // Envolver todos los elementos li en ul, incluso si están separados por líneas en blanco
  // Primero, reemplazar líneas en blanco entre li con un marcador temporal
  text = text.replace(/<\/li>\s*\n\s*<li/g, '</li><li');
  
  // Luego, envolver todos los grupos de li en ul
  text = text.replace(/(<li>.*?<\/li>)+/gs, (match) => {
    return `<ul class="list-disc pl-4 mb-4">${match}</ul>`;
  });
  
  return text;
}
</script>

<template>
  <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-6">
    <h2 class="text-2xl font-semibold mb-4">🤖 Insights de Gemini</h2>
    <div v-if="geminiInsight" 
         class="prose prose-lg max-w-none text-gray-700"
         v-html="formatMarkdown(geminiInsight)">
    </div>
    <div v-else class="text-gray-500 italic">
      No hay insights disponibles.
    </div>
  </div>
</template>

<style>
.prose h2 {
  @apply text-xl font-bold mt-6 mb-4 flex items-center gap-2;
}

.prose h3 {
  @apply text-lg font-semibold mt-4 mb-3;
}

.prose p {
  @apply mb-4 leading-relaxed;
}

.prose ul {
  @apply list-disc pl-4 mb-4;
}

.prose li {
  @apply mb-2;
}

.prose strong {
  @apply font-bold;
}

.prose em {
  @apply italic;
}

.prose a {
  @apply text-blue-600 hover:underline;
}
</style> 