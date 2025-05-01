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
    default: () => ({
      categories: {},
      audits: {}
    })
  }
});

// Agregar un watcher para depuración
watch(() => props.lighthouse, (newVal, oldVal) => {
  console.log('🔍 [LighthouseResults] Lighthouse prop changed:', {
    old: oldVal,
    new: newVal,
    hasAudits: !!newVal?.audits,
    auditsKeys: newVal?.audits ? Object.keys(newVal.audits) : []
  });
}, { immediate: true, deep: true });

// Función para validar la estructura de Lighthouse
const validateLighthouseStructure = (data) => {
  console.log('🔍 [LighthouseResults] Validating structure:', {
    data,
    isObject: typeof data === 'object',
    hasAudits: !!data?.audits,
    auditsType: data?.audits ? typeof data.audits : 'undefined'
  });
  
  if (!data) return false;
  if (typeof data !== 'object') return false;
  if (!data.audits || typeof data.audits !== 'object') return false;
  return true;
};

const coreWebVitals = computed(() => {
  console.log('🔍 [LighthouseResults] Computing coreWebVitals with lighthouse:', {
    lighthouse: props.lighthouse,
    hasAudits: !!props.lighthouse?.audits,
    auditsKeys: props.lighthouse?.audits ? Object.keys(props.lighthouse.audits) : []
  });
  
  if (!validateLighthouseStructure(props.lighthouse)) {
    console.warn('❌ [LighthouseResults] Invalid Lighthouse structure:', props.lighthouse);
    return [];
  }
  
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

  const result = metrics.map(metric => {
    const audit = props.lighthouse.audits[metric.id];
    console.log(`🔍 [LighthouseResults] Processing metric ${metric.id}:`, {
      audit,
      hasNumericValue: audit?.numericValue !== undefined,
      hasScore: audit?.score !== undefined
    });
    
    if (!audit || typeof audit !== 'object') {
      console.warn(`❌ [LighthouseResults] Invalid audit for metric ${metric.id}:`, audit);
      return null;
    }

    const value = audit.numericValue;
    const score = audit.score;

    if (value === undefined && score === undefined) {
      console.warn(`❌ [LighthouseResults] No valid data for metric ${metric.id}`);
      return null;
    }

    return {
      ...metric,
      value,
      score
    };
  }).filter(metric => metric !== null);

  console.log('✅ [LighthouseResults] Computed coreWebVitals:', result);
  return result;
});

const performanceOpportunities = computed(() => {
  console.log('🔍 [LighthouseResults] Computing performanceOpportunities with lighthouse:', {
    lighthouse: props.lighthouse,
    hasAudits: !!props.lighthouse?.audits,
    auditsKeys: props.lighthouse?.audits ? Object.keys(props.lighthouse.audits) : []
  });
  
  if (!validateLighthouseStructure(props.lighthouse)) {
    console.warn('❌ [LighthouseResults] Invalid Lighthouse structure:', props.lighthouse);
    return [];
  }
  
  const result = Object.entries(props.lighthouse.audits)
    .map(([id, audit]) => {
      console.log(`🔍 [LighthouseResults] Processing audit ${id}:`, {
        audit,
        hasScore: audit?.score !== undefined,
        hasDetails: !!audit?.details,
        detailsType: audit?.details?.type
      });
      
      if (!audit || typeof audit !== 'object') {
        console.warn(`❌ [LighthouseResults] Invalid audit found: ${id}`, audit);
        return null;
      }

      return {
        id,
        title: audit.title || id,
        description: audit.description || '',
        score: audit.score,
        details: audit.details
      };
    })
    .filter(audit => {
      const isValid = audit !== null && 
        audit.score !== undefined && 
        audit.score < 0.9 && 
        audit.details?.type === 'opportunity';
      
      if (!isValid) {
        console.log(`ℹ️ [LighthouseResults] Filtered out audit ${audit?.id}:`, {
          isNull: audit === null,
          hasScore: audit?.score !== undefined,
          scoreBelowThreshold: audit?.score < 0.9,
          isOpportunity: audit?.details?.type === 'opportunity'
        });
      }
      
      return isValid;
    })
    .sort((a, b) => a.score - b.score);

  console.log('✅ [LighthouseResults] Computed performanceOpportunities:', result);
  return result;
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