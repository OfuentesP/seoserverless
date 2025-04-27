import axios from 'axios';

const API_KEY = import.meta.env.VITE_WEBPAGETEST_API_KEY || '';

if (!API_KEY) {
  console.error('WebPageTest API key is not set in environment variables');
}

/**
 * Lanza un test en WebPageTest
 */
export const runTest = async (url, location = 'Dulles:Chrome', connectivity = 'Cable', lighthouse = true) => {
  const response = await axios.get('/api/webpagetest/runtest', {
    params: { url, apiKey: API_KEY, location, connectivity, lighthouse: lighthouse ? 1 : 0 }
  });

  if (response.data.statusCode === 200) {
    return response.data;
  } else {
    throw new Error(response.data.statusText || 'Error running WebPageTest');
  }
};

/**
 * Obtiene resultados de WebPageTest
 */
export const getTestResults = async (testId) => {
  const response = await axios.get('/api/webpagetest/results', {
    params: { testId, apiKey: API_KEY }
  });

  if (!response.data.success) {
    throw new Error('Error fetching WebPageTest results');
  }

  return response.data.resumen; // <-- aquí ahora te entrega directamente el resumen con lcp, cls, tbt
};

/**
 * Poll para esperar el resultado completo
 */
export const pollForResults = async (testId, maxAttempts = 30, interval = 5000) => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const results = await getTestResults(testId);

      if (results && results.loadTime) {
        return results;
      } else {
        console.log(`Test ${testId} still running... attempt ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      }
    } catch (error) {
      console.error('Error polling results:', error);
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    }
  }

  throw new Error('Test polling timeout.');
};