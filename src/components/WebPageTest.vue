<template>
  <div class="webpagetest-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Running WebPageTest analysis...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="results" class="results">
      <h3>WebPageTest Results</h3>
      
      <!-- Performance Metrics -->
      <div class="metrics-section">
        <h4>Core Web Vitals</h4>
        <div class="metrics-grid">
          <div class="metric-card" v-for="(value, metric) in coreWebVitals" :key="metric">
            <h5>{{ formatMetricName(metric) }}</h5>
            <p :class="getScoreClass(value)">{{ formatMetric(value, metric) }}</p>
          </div>
        </div>
      </div>

      <!-- Lighthouse Results -->
      <div v-if="lighthouseResults" class="lighthouse-section">
        <h4>Lighthouse Analysis</h4>
        <div class="metrics-grid">
          <div class="metric-card" v-for="(score, category) in lighthouseResults.categories" :key="category">
            <h5>{{ formatCategoryName(category) }}</h5>
            <p :class="getLighthouseScoreClass(score.score)">{{ Math.round(score.score * 100) }}</p>
          </div>
        </div>

        <!-- Performance Opportunities -->
        <div v-if="lighthouseResults.audits" class="opportunities">
          <h4>Performance Opportunities</h4>
          <div class="opportunity-list">
            <div v-for="audit in performanceOpportunities" :key="audit.id" class="opportunity-item">
              <h5>{{ audit.title }}</h5>
              <p>{{ audit.description }}</p>
              <div class="score-bar">
                <div :style="{ width: getScorePercentage(audit.score) + '%' }" 
                     :class="getLighthouseScoreClass(audit.score)">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { runTest, getTestResults, pollForResults } from '../services/webpagetest';

const props = defineProps({
  url: {
    type: String,
    required: true
  }
});

const loading = ref(false);
const error = ref(null);
const results = ref(null);
const lighthouseResults = ref(null);

const coreWebVitals = computed(() => {
  if (!results.value) return {};
  const data = results.value.data.median.firstView;
  return {
    FCP: data.firstContentfulPaint,
    LCP: data.largestContentfulPaint,
    TBT: data.totalBlockingTime,
    CLS: data.cumulativeLayoutShift,
    TTI: data.timeToInteractive,
    SpeedIndex: data.SpeedIndex
  };
});

const performanceOpportunities = computed(() => {
  if (!lighthouseResults.value?.audits) return [];
  return Object.values(lighthouseResults.value.audits)
    .filter(audit => audit.score < 1 && audit.details?.type === 'opportunity')
    .sort((a, b) => a.score - b.score);
});

const formatMetricName = (metric) => {
  const names = {
    FCP: 'First Contentful Paint',
    LCP: 'Largest Contentful Paint',
    TBT: 'Total Blocking Time',
    CLS: 'Cumulative Layout Shift',
    TTI: 'Time to Interactive',
    SpeedIndex: 'Speed Index'
  };
  return names[metric] || metric;
};

const formatMetric = (value, metric) => {
  if (metric === 'CLS') return value.toFixed(3);
  if (typeof value === 'number') {
    return value < 1000 ? `${value}ms` : `${(value/1000).toFixed(1)}s`;
  }
  return value;
};

const formatCategoryName = (category) => {
  return category.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const getScoreClass = (value) => {
  if (typeof value !== 'number') return '';
  if (value <= 1000) return 'score-good';
  if (value <= 2500) return 'score-moderate';
  return 'score-poor';
};

const getLighthouseScoreClass = (score) => {
  if (score >= 0.9) return 'score-good';
  if (score >= 0.5) return 'score-moderate';
  return 'score-poor';
};

const getScorePercentage = (score) => {
  return Math.round((score || 0) * 100);
};

const runAnalysis = async () => {
  if (!props.url) return;
  
  loading.value = true;
  error.value = null;
  results.value = null;
  lighthouseResults.value = null;

  try {
    const testData = await runTest(props.url);
    if (!testData.data.testId) {
      throw new Error('No test ID received from WebPageTest');
    }

    const finalResults = await pollForResults(testData.data.testId);
    results.value = finalResults;
    
    if (finalResults.data.lighthouse) {
      lighthouseResults.value = finalResults.data.lighthouse;
    }
  } catch (e) {
    error.value = e.message || 'Error running WebPageTest analysis';
    console.error('WebPageTest error:', e);
  } finally {
    loading.value = false;
  }
};

// Watch for URL changes and run analysis
watch(() => props.url, (newUrl) => {
  if (newUrl) runAnalysis();
});

// Run initial analysis if URL is provided
onMounted(() => {
  if (props.url) runAnalysis();
});
</script>

<style scoped>
.webpagetest-container {
  padding: 1rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.loading {
  text-align: center;
  padding: 2rem;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  color: #dc3545;
  padding: 1rem;
  border: 1px solid #dc3545;
  border-radius: 4px;
  margin: 1rem 0;
}

.metrics-section, .lighthouse-section {
  margin: 2rem 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.metric-card {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

.metric-card h5 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: #6c757d;
}

.metric-card p {
  margin: 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.score-good {
  color: #28a745;
}

.score-moderate {
  color: #ffc107;
}

.score-poor {
  color: #dc3545;
}

.opportunities {
  margin-top: 2rem;
}

.opportunity-item {
  margin: 1rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.opportunity-item h5 {
  margin: 0 0 0.5rem;
  color: #212529;
}

.opportunity-item p {
  margin: 0 0 1rem;
  color: #6c757d;
  font-size: 0.9rem;
}

.score-bar {
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.score-bar > div {
  height: 100%;
  transition: width 0.3s ease;
}
</style> 