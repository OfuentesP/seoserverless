<template>
  <button 
    @click="exportToPDF" 
    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
    :disabled="loading"
  >
    <span v-if="loading" class="mr-2">
      <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    <span v-else class="mr-2">📄</span>
    {{ loading ? 'Exportando...' : 'Exportar a PDF' }}
  </button>
</template>

<script setup>
import { ref } from 'vue';
import html2pdf from 'html2pdf.js';

const props = defineProps({
  elementId: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    default: 'resultados-seo.pdf'
  }
});

const loading = ref(false);

const exportToPDF = async () => {
  loading.value = true;
  try {
    const element = document.getElementById(props.elementId);
    if (!element) {
      console.error('Elemento no encontrado');
      return;
    }

    const opt = {
      margin: 1,
      filename: props.filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };

    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('Error al exportar PDF:', error);
  } finally {
    loading.value = false;
  }
};
</script> 