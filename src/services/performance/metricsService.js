export const processMetrics = (metrics) => ({
  performance: metrics.performance,
  firstContentfulPaint: metrics.firstContentfulPaint,
  largestContentfulPaint: metrics.largestContentfulPaint,
  timeToInteractive: metrics.timeToInteractive,
  cumulativeLayoutShift: metrics.cumulativeLayoutShift,
  accessibility: metrics.accessibility,
  bestPractices: metrics.bestPractices,
  seo: metrics.seo
}); 