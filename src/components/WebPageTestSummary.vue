<script setup>
import { computed, toRaw } from 'vue';
import useSeoAnalysis from '../composables/useSeoAnalysis';

const { resumen } = useSeoAnalysis();
const rawResumen = computed(() => toRaw(resumen));
const datosDisponibles = computed(() => rawResumen.value && Object.keys(rawResumen.value).length > 0);

const getMetricColor = (value, type) => {
  if (!value) return 'text-gray-400';
  
  switch(type) {
    case 'lcp':
      return value <= 2500 ? 'text-green-600' : value <= 4000 ? 'text-yellow-600' : 'text-red-600';
    case 'cls':
      return value <= 0.1 ? 'text-green-600' : value <= 0.25 ? 'text-yellow-600' : 'text-red-600';
    case 'tbt':
      return value <= 300 ? 'text-green-600' : value <= 600 ? 'text-yellow-600' : 'text-red-600';
    default:
      return 'text-gray-800';
  }
};
</script>



<style scoped>
#resultados-content {
  background: transparent;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>

