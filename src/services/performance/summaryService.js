export const generatePerformanceSummary = (metrics) => {
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