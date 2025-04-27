import { fetchPageSpeedData } from './apiService.js';
import { processMetrics } from './metricsService.js';
import { categorizeRecommendations } from './recommendationsService.js';
import { generatePerformanceSummary } from './summaryService.js';

export const analyzePerformance = async (url) => {
  const pageSpeedData = await fetchPageSpeedData(url);
  const metrics = processMetrics(pageSpeedData.lighthouseResult.categories);
  const recommendations = categorizeRecommendations(pageSpeedData.lighthouseResult.audits);
  const summary = generatePerformanceSummary(metrics);

  return {
    metrics,
    recommendations,
    summary
  };
};

export {
  processMetrics,
  categorizeRecommendations,
  generatePerformanceSummary,
  fetchPageSpeedData
}; 