<template>
  <div class="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-sm hover:shadow-md transition-shadow">
    <p class="text-gray-300 mb-2 font-medium pdf-text">First Contentful Paint (FCP)</p>
    <p class="text-xs text-gray-400 mb-2">¿Cuándo se muestra el primer contenido? Impacta la percepción de velocidad.</p>
    <p class="text-3xl font-bold text-white pdf-text">{{ formattedFCP }}</p>
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  fcp: { type: [Number, String], default: null },
  webpagetestResults: { type: Object, default: () => ({}) }
});

const route = useRoute();

// Computed para obtener el valor de FCP
const rawFCP = computed(() => {
  try {
    // Prioridad: prop fcp > webpagetestResults.fcp
    let val = props.fcp;
    if (val === null || val === undefined) {
      val = props.webpagetestResults?.fcp;
    }
    
    // Convertir a número si es string
    if (typeof val === 'string') {
      val = parseFloat(val);
    }
    
    // Validar que sea un número válido
    if (isNaN(val)) {
      console.warn('🔍 [FCP] Valor no numérico:', val);
      return null;
    }
    
    return val;
  } catch (error) {
    console.error('❌ [FCP] Error procesando FCP:', error);
    return null;
  }
});

const formattedFCP = computed(() => {
  try {
    const val = rawFCP.value;
    
    if (val === null || val === undefined) {
      return '⏳ Cargando...';
    }
    
    // Asegurarse de que el valor sea un número
    const numVal = Number(val);
    if (isNaN(numVal)) {
      console.warn('🔍 [FCP] Valor no numérico en formateo:', val);
      return 'N/A';
    }
    
    return (numVal / 1000).toFixed(3) + 's';
  } catch (error) {
    console.error('❌ [FCP] Error formateando FCP:', error);
    return 'Error';
  }
});

// LOGS DETALLADOS
function logEstadoFCP(context) {
  console.log(`🔍 [FCP][${context}] Props recibidos:`, JSON.parse(JSON.stringify(props)));
  console.log(`🔍 [FCP][${context}] route.state.resumen.fcp:`, route?.state?.resumen?.fcp);
  console.log(`🔍 [FCP][${context}] Valor crudo FCP:`, rawFCP.value, typeof rawFCP.value);
  console.log(`🔍 [FCP][${context}] Valor formateado FCP:`, formattedFCP.value);
  const el = document.querySelector('.fcp-value');
  if (el) {
    console.log(`🔍 [FCP][${context}] HTML actual:`, el.innerText);
  } else {
    console.log(`🔍 [FCP][${context}] No se encontró el elemento .fcp-value en el DOM`);
  }
}

onMounted(() => {
  logEstadoFCP('onMounted');
});

watch(() => props.fcp, () => {
  logEstadoFCP('watch:props.fcp');
});

watch(() => props.webpagetestResults, () => {
  logEstadoFCP('watch:props.webpagetestResults');
}, { deep: true });

watch(rawFCP, () => {
  logEstadoFCP('watch:rawFCP');
});

watch(formattedFCP, () => {
  logEstadoFCP('watch:formattedFCP');
});
</script> 