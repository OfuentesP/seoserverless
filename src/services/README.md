# Servicios de SEO Serverless

Este directorio contiene los servicios principales de la aplicación SEO Serverless.

## Estructura de Directorios

```
services/
├── performance/                # Servicio de análisis de rendimiento
│   ├── apiService.js          # Comunicación con Google PageSpeed API
│   ├── metricsService.js      # Procesamiento de métricas de rendimiento
│   ├── recommendationsService.js  # Generación de recomendaciones
│   ├── summaryService.js      # Generación de resúmenes ejecutivos
│   ├── cacheService.js        # Servicio de caché
│   ├── config.js              # Configuración del servicio
│   └── index.js               # Punto de entrada del servicio
└── performanceService.js      # Re-exportación del servicio principal
```

## Configuración

### API Key

El servicio requiere una clave de API de Google PageSpeed Insights. Para configurarla:

1. Obtén una clave de API en la [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un archivo `.env` en la raíz del proyecto
3. Agrega tu clave de API:
   ```
   PAGESPEED_API_KEY=tu_clave_api_aquí
   ```

### Caché

El servicio incluye un sistema de caché para optimizar las solicitudes:

- Duración del caché: 60 minutos (configurable)
- Almacenamiento en memoria
- Limpieza automática de entradas expiradas

## Uso

```javascript
import { analyzePerformance } from '../services/performanceService';

// Analizar el rendimiento de una URL
try {
  const results = await analyzePerformance('https://ejemplo.com');
  
  // Los resultados se almacenan en caché automáticamente
  // Las siguientes solicitudes a la misma URL usarán el caché
  
  console.log('Métricas:', results.metrics);
  console.log('Recomendaciones:', results.recommendations);
  console.log('Resumen:', results.summary);
} catch (error) {
  console.error('Error:', error.message);
}
```

## Componentes

### apiService.js
- Maneja la comunicación con la API de Google PageSpeed Insights
- Implementa límites de velocidad y caché
- Gestiona errores y reintentos

### cacheService.js
- Proporciona almacenamiento en caché de resultados
- Gestiona la expiración de datos
- Optimiza el rendimiento y reduce solicitudes

### config.js
- Centraliza la configuración del servicio
- Define constantes y umbrales
- Facilita la personalización

## Consideraciones

- El análisis se realiza desde la perspectiva móvil por defecto
- Se incluyen categorías de rendimiento, accesibilidad, mejores prácticas y SEO
- Las recomendaciones se basan en las mejores prácticas de Google
- El servicio implementa límites de velocidad y caché para optimizar el uso de la API
- Se requiere una clave de API para uso en producción 