<template>
  <div v-if="lighthouse" class="mt-12 mx-auto max-w-3xl p-8 bg-white rounded-2xl shadow-2xl animate-fadeIn">
    <h2 class="mt-5 pt-5 text-3xl font-extrabold text-green-700 mb-8 text-center tracking-tight flex items-center justify-center gap-2">
      <span>📊</span> Auditoría Lighthouse
    </h2>
    
    <!-- Categories Section -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <div v-for="(category, key) in lighthouse.categories" :key="key" 
           class="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow text-center border border-blue-100">
        <p class="text-lg font-semibold text-gray-800 flex items-center justify-center gap-2">
          {{ getCategoryEmoji(key) }} {{ formatCategoryName(key) }}
        </p>
        <p class="text-3xl font-extrabold mt-2" :class="getScoreColorClass(category.score)">
          {{ Math.round(category.score * 100) }}
        </p>
      </div>
    </div>

    <!-- Core Web Vitals Section -->
    <div v-if="coreWebVitals.length > 0" class="mb-10">
      <h3 class="text-2xl font-bold text-blue-800 mb-6 text-center flex items-center gap-2 justify-center">
        <span>⚡</span> Core Web Vitals
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div v-for="metric in coreWebVitals" :key="metric.id"
             class="p-5 border rounded-lg bg-gray-50 shadow-sm text-center">
          <h4 class="font-bold text-lg text-gray-800 mb-1">{{ metric.name }}</h4>
          <p class="text-sm text-gray-600 mb-2">{{ metric.description }}</p>
          <p class="text-2xl font-bold" :class="getMetricScoreClass(metric)">
            {{ formatMetricValue(metric) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Performance Opportunities Section -->
    <div v-if="performanceOpportunities.length > 0" class="mt-10">
      <h3 class="text-2xl font-bold text-blue-800 mb-6 text-center flex items-center gap-2 justify-center">
        <span>💡</span> Oportunidades de Mejora
      </h3>
      <div class="grid grid-cols-1 gap-4 max-h-[420px] overflow-y-auto pr-2">
        <div v-for="audit in performanceOpportunities" :key="audit.id"
             class="p-5 border rounded-lg bg-gray-50 shadow-sm">
          <h4 class="font-bold text-lg text-gray-800 mb-1">{{ audit.title }}</h4>
          <p class="text-sm text-gray-600 mb-2">{{ audit.description }}</p>
          <div class="flex items-center gap-2">
            <div class="flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
              <div :style="{ width: getScorePercentage(audit.score) + '%' }" 
                   :class="getScoreBarClass(audit.score)"
                   class="h-full transition-all duration-300"></div>
            </div>
            <span class="text-sm font-medium" :class="getScoreTextClass(audit.score)">
              {{ getScorePercentage(audit.score) }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';

const props = defineProps({
  lighthouse: {
    type: Object,
    required: true,
    default: () => {
      console.log('🔍 [LighthouseResults] Llamando al default prop');
      return {
        categories: {},
        audits: {}
      };
    }
  }
});

// Watcher para ver cuando cambia la prop
watch(() => props.lighthouse, (newVal) => {
  console.log('🔍 [LighthouseResults] Props.lighthouse cambió:', {
    value: newVal,
    type: typeof newVal,
    isProxy: !!newVal?.__v_isProxy,
    keys: newVal ? Object.keys(newVal) : [],
    hasAudits: !!newVal?.audits,
    auditsType: typeof newVal?.audits,
    raw: JSON.stringify(newVal)
  });
}, { immediate: true, deep: true });

// Computed para debuggear la prop lighthouse
const debugLighthouse = computed(() => {
  console.log('🔍 [LighthouseResults] Debugging lighthouse prop:', {
    prop: props.lighthouse,
    type: typeof props.lighthouse,
    isProxy: !!props.lighthouse?.__v_isProxy,
    hasAudits: !!props.lighthouse?.audits,
    auditsType: typeof props.lighthouse?.audits,
    keys: props.lighthouse ? Object.keys(props.lighthouse) : []
  });
  return props.lighthouse;
});

// Computed property para validar y obtener los datos de Lighthouse de forma segura
const lighthouseData = computed(() => {
  console.log('🔍 [LighthouseResults] Calculando lighthouseData:', {
    rawProp: props.lighthouse,
    debugValue: debugLighthouse.value,
    hasLighthouse: !!props.lighthouse,
    type: typeof props.lighthouse,
    isProxy: !!props.lighthouse?.__v_isProxy,
    hasAudits: !!props.lighthouse?.audits,
    auditsType: typeof props.lighthouse?.audits
  });

  // Si no hay datos, retornar estructura vacía
  if (!props.lighthouse || typeof props.lighthouse !== 'object') {
    console.warn('⚠️ [LighthouseResults] No hay datos de Lighthouse válidos:', {
      value: props.lighthouse,
      type: typeof props.lighthouse
    });
    return {
      categories: {},
      audits: {}
    };
  }

  // Asegurar que tenemos las propiedades necesarias
  const safeData = {
    categories: props.lighthouse.categories || {},
    audits: props.lighthouse.audits || {}
  };

  console.log('✅ [LighthouseResults] Datos normalizados:', {
    rawCategories: props.lighthouse.categories,
    rawAudits: props.lighthouse.audits,
    safeCategories: safeData.categories,
    safeAudits: safeData.audits,
    hasCategories: !!safeData.categories,
    hasAudits: !!safeData.audits,
    categoriesCount: Object.keys(safeData.categories).length,
    auditsCount: Object.keys(safeData.audits).length
  });

  return safeData;
});

const coreWebVitals = computed(() => {
  const data = lighthouseData.value;
  console.log('🔍 [LighthouseResults] Calculando Core Web Vitals con:', {
    hasAudits: !!data.audits,
    auditsCount: Object.keys(data.audits).length
  });

  const metrics = [
    {
      id: 'largest-contentful-paint',
      name: 'LCP',
      fullName: 'Largest Contentful Paint',
      description: 'Tiempo de carga del contenido principal',
      thresholds: { good: 2500, poor: 4000 }
    },
    {
      id: 'cumulative-layout-shift',
      name: 'CLS',
      fullName: 'Cumulative Layout Shift',
      description: 'Estabilidad visual',
      thresholds: { good: 0.1, poor: 0.25 }
    },
    {
      id: 'total-blocking-time',
      name: 'TBT',
      fullName: 'Total Blocking Time',
      description: 'Tiempo de bloqueo total',
      thresholds: { good: 200, poor: 600 }
    }
  ];

  return metrics.map(metric => {
    const audit = data.audits[metric.id] || {};
    console.log(`🔍 [LighthouseResults] Procesando métrica ${metric.id}:`, {
      hasAudit: !!audit,
      hasValue: audit.numericValue !== undefined,
      hasScore: audit.score !== undefined
    });

    return {
      ...metric,
      value: audit.numericValue || 0,
      score: audit.score || 0
    };
  });
});

const performanceOpportunities = computed(() => {
  const data = lighthouseData.value;
  console.log('🔍 [LighthouseResults] Calculando oportunidades con:', {
    hasAudits: !!data.audits,
    auditsCount: Object.keys(data.audits).length
  });

  return Object.entries(data.audits)
    .map(([id, audit]) => {
      if (!audit || typeof audit !== 'object') {
        console.log(`⚠️ [LighthouseResults] Audit inválido: ${id}`);
        return null;
      }

      return {
        id,
        title: audit.title || id,
        description: audit.description || '',
        score: audit.score || 0,
        details: audit.details || {}
      };
    })
    .filter(audit => {
      if (!audit) return false;
      const isValid = audit.score !== undefined && audit.score < 0.9 && audit.details?.type === 'opportunity';
      console.log(`🔍 [LighthouseResults] Filtrando audit ${audit.id}:`, { isValid });
      return isValid;
    })
    .sort((a, b) => (a.score || 0) - (b.score || 0));
});

const formatCategoryName = (category) => {
  return category.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getCategoryEmoji = (category) => {
  const emojis = {
    performance: '⚡',
    accessibility: '♿',
    'best-practices': '✨',
    seo: '🔍',
    pwa: '📱'
  };
  return emojis[category] || '📊';
};

const getScoreColorClass = (score) => {
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBarClass = (score) => {
  if (score >= 0.9) return 'bg-green-500';
  if (score >= 0.5) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getScoreTextClass = (score) => {
  if (score >= 0.9) return 'text-green-700';
  if (score >= 0.5) return 'text-yellow-700';
  return 'text-red-700';
};

const getMetricScoreClass = (metric) => {
  const value = metric.value;
  const { good, poor } = metric.thresholds;
  
  if (metric.id === 'cumulative-layout-shift') {
    if (value <= good) return 'text-green-600';
    if (value <= poor) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  if (value <= good) return 'text-green-600';
  if (value <= poor) return 'text-yellow-600';
  return 'text-red-600';
};

const formatMetricValue = (metric) => {
  const value = metric.value;
  
  if (metric.id === 'cumulative-layout-shift') {
    return value.toFixed(3);
  }
  
  return value < 1000 ? 
    `${Math.round(value)}ms` : 
    `${(value / 1000).toFixed(1)}s`;
};

const getScorePercentage = (score) => {
  return Math.round((score || 0) * 100);
};
</script>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style> 