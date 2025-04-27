import { analyzePerformance } from './services/performanceService.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function testPerformanceService() {
  try {
    console.log('🚀 Iniciando prueba del servicio de rendimiento...');

    // Verificar API key
    if (!process.env.PAGESPEED_API_KEY) {
      console.warn('⚠️  No se encontró API key. Las solicitudes pueden estar limitadas.');
      console.warn('   Crea un archivo .env con PAGESPEED_API_KEY=tu_clave_api');
    }
    
    // URL de prueba
    const testUrl = 'https://example.com';
    
    // Primera solicitud
    console.log(`\n📊 Analizando rendimiento de: ${testUrl}`);
    console.log('   (Esta solicitud puede tardar unos segundos...)');
    
    const results = await analyzePerformance(testUrl);
    
    // Mostrar resultados
    console.log('\n✅ Análisis completado con éxito');
    
    console.log('\n📈 Métricas:');
    const { metrics } = results;
    console.log(`   Performance: ${Math.round(metrics.performance)}%`);
    console.log(`   Accessibility: ${Math.round(metrics.accessibility)}%`);
    console.log(`   Best Practices: ${Math.round(metrics.bestPractices)}%`);
    console.log(`   SEO: ${Math.round(metrics.seo)}%`);
    
    console.log('\n🔍 Recomendaciones:');
    const { recommendations } = results;
    console.log(`   Críticas: ${recommendations.critical.length}`);
    console.log(`   Importantes: ${recommendations.important.length}`);
    console.log(`   Moderadas: ${recommendations.moderate.length}`);
    
    if (recommendations.critical.length > 0) {
      console.log('\n⚠️  Recomendaciones críticas:');
      recommendations.critical.forEach(rec => {
        console.log(`   - ${rec.title}`);
      });
    }
    
    console.log('\n📝 Resumen:');
    console.log(results.summary);

    // Segunda solicitud (debería usar caché)
    console.log('\n🔄 Realizando segunda solicitud (debería usar caché)...');
    const startTime = Date.now();
    const cachedResults = await analyzePerformance(testUrl);
    const endTime = Date.now();
    
    console.log(`✅ Segunda solicitud completada en ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    if (error.message.includes('API key')) {
      console.log('\n📝 Sugerencia: Verifica que tu API key esté correctamente configurada en el archivo .env');
    }
  }
}

// Ejecutar la prueba
testPerformanceService(); 