import { ref } from 'vue';
import { analyzeLighthouseWithGemini } from '../services/gemini';
import { runWebPageTest, getLighthouseResults } from '../services/seoApi';

export function useSeoAnalysis() {
  const url = ref('');
  const estado = ref('');
  const resumen = ref(null);
  const lighthouse = ref(null);
  const cargando = ref(false);
  const geminiInsight = ref('');

  const lighthouseCategorias = {
    performance: { nombre: 'Performance', emoji: '⚡' },
    accessibility: { nombre: 'Accesibilidad', emoji: '♿' },
    'best-practices': { nombre: 'Best Practices', emoji: '🔐' },
    seo: { nombre: 'SEO', emoji: '🔍' },
    pwa: { nombre: 'PWA', emoji: '📱' },
  };

  const getScoreClass = (score) => {
    if (score >= 0.9) return 'text-green-600 font-bold';
    if (score >= 0.5) return 'text-yellow-600 font-bold';
    return 'text-red-600 font-bold';
  };

  async function analizar(inputUrl) {
    console.log('[useSeoAnalysis] Iniciando análisis para:', inputUrl);
    if (!inputUrl) {
      estado.value = '❗ Debes ingresar una URL válida.';
      console.warn('[useSeoAnalysis] URL vacía');
      return;
    }
    url.value = inputUrl;
    cargando.value = true;
    estado.value = '🔎 Iniciando análisis...';
    resumen.value = null;
    lighthouse.value = null;

    try {
      const data = await runWebPageTest(url.value);
      console.log('[useSeoAnalysis] Resultado recibido del backend (resumen):', data);

      if (data.success && data.resumen?.testId) {
        resumen.value = data.resumen;

        // 🔥 Arreglo pro: asegurar campos básicos
        if (resumen.value) {
          resumen.value.url = resumen.value.url || url.value;
          resumen.value.loadTime = resumen.value.loadTime || 0;
          resumen.value.totalSize = resumen.value.totalSize || 0;
          resumen.value.requests = resumen.value.requests || 0;
        }

        console.log('%c[DEBUG] Resumen corregido:', 'color: green; font-weight: bold;', JSON.stringify(resumen.value, null, 2));
        await obtenerLighthouseDesdeBackend(data.resumen.testId);
        estado.value = '✅ Análisis completado.';
      } else {
        estado.value = '❌ No se pudo generar el informe.';
        console.warn('[useSeoAnalysis] No se pudo generar el informe:', data);
      }
    } catch (err) {
      console.error('[useSeoAnalysis] Error en análisis:', err);
      if (err instanceof TypeError && err.message.includes('NetworkError')) {
        estado.value = '❌ Error de red. Verifica tu conexión o intenta más tarde.';
      } else {
        estado.value = err.message || '❌ Error de conexión o servidor.';
      }
    } finally {
      cargando.value = false;
      console.log('[useSeoAnalysis] Análisis finalizado. Estado:', estado.value);
    }
  }

  async function obtenerLighthouseDesdeBackend(testId) {
    console.log('[useSeoAnalysis] Obteniendo resultados de Lighthouse para testId:', testId);
    try {
      estado.value = '🔍 Obteniendo resultados de Lighthouse...';
      const data = await getLighthouseResults(testId);
      console.log('[useSeoAnalysis] Lighthouse recibido:', data);

      if (data.lighthouse) {
        lighthouse.value = data.lighthouse;

        // Extraer Core Web Vitals
        if (data.lighthouse.audits) {
          const lcp = data.lighthouse.audits['largest-contentful-paint']?.numericValue;
          const cls = data.lighthouse.audits['cumulative-layout-shift']?.numericValue;
          const tbt = data.lighthouse.audits['total-blocking-time']?.numericValue;

          console.log('[useSeoAnalysis] Core Web Vitals extraídos:', { lcp, cls, tbt });

          // Asignar Core Web Vitals al resumen
          if (resumen.value) {
            resumen.value.lcp = lcp;
            resumen.value.cls = cls;
            resumen.value.tbt = tbt;

            // 🔥 Forzar actualización de Vue
            resumen.value = { ...resumen.value };
            console.log('[useSeoAnalysis] Core Web Vitals asignados al resumen:', resumen.value);
          } else {
            console.warn('[useSeoAnalysis] No se pudo asignar Core Web Vitals: resumen es null');
          }
        } else {
          console.warn('[useSeoAnalysis] No se encontraron audits en el informe de Lighthouse');
        }

        console.log('%c[DEBUG] Lighthouse completo:', 'color: blue; font-weight: bold;', JSON.stringify(lighthouse.value, null, 2));
        estado.value = '✅ Análisis completado.';
        
        // Generar Insight IA
        try {
          geminiInsight.value = '⏳ Analizando con IA...';
          const aiText = await analyzeLighthouseWithGemini(data.lighthouse, url.value);
          geminiInsight.value = aiText;
          console.log('[useSeoAnalysis] Insight IA generado.');
        } catch (e) {
          geminiInsight.value = 'No se pudo generar el insight con IA.';
          console.error('[useSeoAnalysis] Error generando insight IA:', e);
        }
      } else {
        console.warn('[useSeoAnalysis] Lighthouse no disponible en la respuesta:', data);
        estado.value = '⚠️ No se pudo obtener el informe de Lighthouse.';
      }
    } catch (err) {
      console.error('[useSeoAnalysis] Error trayendo Lighthouse:', err);
      estado.value = err.message || '❌ Error al obtener datos de Lighthouse.';
    }
  }

  return {
    url,
    estado,
    resumen,
    lighthouse,
    cargando,
    geminiInsight,
    lighthouseCategorias,
    getScoreClass,
    analizar
  };
}

export const seoAnalysis = useSeoAnalysis();