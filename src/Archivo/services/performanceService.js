import axios from 'axios';

const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/**
 * Analiza el rendimiento de una URL usando Google PageSpeed Insights
 * @param {string} url - URL a analizar
 * @returns {Promise<Object>} Resultados del análisis
 */
export const analyzePerformance = async (url) => {
  try {
    console.log('🚀 Iniciando análisis de rendimiento para:', url);

    const response = await axios.get(PAGESPEED_API_URL, {
      params: {
        url: url,
        strategy: 'mobile', // Analizar versión móvil
        category: ['performance', 'accessibility', 'best-practices', 'seo']
      }
    });

    console.log('✅ Análisis completado');

    // Procesar y simplificar los resultados
    const {
      lighthouseResult: {
        categories,
        audits,
        configSettings,
        timing: { total: analysisTime }
      }
    } = response.data;

    // Extraer métricas principales
    const metrics = {
      performance: categories.performance.score * 100,
      accessibility: categories.accessibility.score * 100,
      bestPractices: categories['best-practices'].score * 100,
      seo: categories.seo.score * 100,
      firstContentfulPaint: audits['first-contentful-paint'].numericValue,
      speedIndex: audits['speed-index'].numericValue,
      largestContentfulPaint: audits['largest-contentful-paint'].numericValue,
      timeToInteractive: audits['interactive'].numericValue,
      totalBlockingTime: audits['total-blocking-time'].numericValue,
      cumulativeLayoutShift: audits['cumulative-layout-shift'].numericValue
    };

    // Extraer oportunidades de mejora
    const opportunities = Object.values(audits)
      .filter(audit => audit.details?.type === 'opportunity')
      .map(audit => ({
        title: audit.title,
        description: audit.description,
        score: audit.score,
        savings: audit.numericValue
      }));

    // Extraer diagnósticos
    const diagnostics = Object.values(audits)
      .filter(audit => audit.details?.type === 'diagnostic')
      .map(audit => ({
        title: audit.title,
        description: audit.description,
        score: audit.score
      }));

    return {
      url,
      analysisTime,
      metrics,
      opportunities,
      diagnostics,
      deviceType: configSettings.emulatedFormFactor,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error en el análisis:', error);
    throw new Error('No se pudo completar el análisis de rendimiento');
  }
};

/**
 * Obtiene recomendaciones específicas basadas en los resultados
 * @param {Object} results - Resultados del análisis
 * @returns {Object} Recomendaciones organizadas
 */
export const getRecommendations = (results) => {
  const recommendations = {
    critical: [],
    important: [],
    moderate: []
  };

  // Procesar oportunidades de mejora
  results.opportunities.forEach(opp => {
    if (opp.score < 0.5) {
      recommendations.critical.push({
        title: opp.title,
        description: opp.description
      });
    } else if (opp.score < 0.8) {
      recommendations.important.push({
        title: opp.title,
        description: opp.description
      });
    } else {
      recommendations.moderate.push({
        title: opp.title,
        description: opp.description
      });
    }
  });

  // Agregar recomendaciones basadas en métricas
  if (results.metrics.performance < 90) {
    recommendations.critical.push({
      title: 'Rendimiento General Bajo',
      description: 'El rendimiento general del sitio necesita mejoras significativas.'
    });
  }

  if (results.metrics.cumulativeLayoutShift > 0.1) {
    recommendations.important.push({
      title: 'Inestabilidad Visual',
      description: 'El sitio presenta cambios de diseño que pueden afectar la experiencia del usuario.'
    });
  }

  return recommendations;
};

/**
 * Genera un resumen ejecutivo del análisis
 * @param {Object} results - Resultados del análisis
 * @returns {string} Resumen ejecutivo
 */
export const generateSummary = (results) => {
  const { metrics } = results;
  
  const performanceLevel = metrics.performance >= 90 ? 'excelente' :
    metrics.performance >= 50 ? 'necesita mejoras' : 'crítico';

  return `
El rendimiento general del sitio es ${performanceLevel} (${Math.round(metrics.performance)}/100).

Principales métricas:
- First Contentful Paint: ${(metrics.firstContentfulPaint / 1000).toFixed(2)}s
- Largest Contentful Paint: ${(metrics.largestContentfulPaint / 1000).toFixed(2)}s
- Time to Interactive: ${(metrics.timeToInteractive / 1000).toFixed(2)}s
- Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(3)}

Puntuaciones adicionales:
- Accesibilidad: ${Math.round(metrics.accessibility)}/100
- Mejores Prácticas: ${Math.round(metrics.bestPractices)}/100
- SEO: ${Math.round(metrics.seo)}/100
  `.trim();
}; 