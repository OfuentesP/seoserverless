export const config = {
  // Tiempo de caché en minutos
  CACHE_DURATION: 60,
  
  // Tiempo de espera entre solicitudes en ms
  REQUEST_DELAY: 2000,
  
  // URL base de la API
  API_BASE_URL: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
  
  // Configuración por defecto
  DEFAULT_STRATEGY: 'mobile',
  DEFAULT_CATEGORIES: ['performance', 'accessibility', 'best-practices', 'seo'],
  
  // Umbrales de puntuación para recomendaciones
  SCORE_THRESHOLDS: {
    CRITICAL: 0.5,
    IMPORTANT: 0.8
  }
}; 