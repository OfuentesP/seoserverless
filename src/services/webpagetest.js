// WebPageTest API Service
const API_KEY = import.meta.env.VITE_WEBPAGETEST_API_KEY;
const BASE_URL = 'https://www.webpagetest.org';

/**
 * Inicia una prueba de rendimiento para una URL
 * @param {string} url - URL a analizar
 * @returns {Promise} - Promesa con el resultado de la API
 */
export const runTest = async (url) => {
  try {
    const response = await fetch(`${BASE_URL}/runtest.php`, {
      method: 'POST',
      headers: {
        'X-WPT-API-KEY': API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        url,
        runs: 1,
        fvonly: 1,
        video: 1,
        f: 'json',
        lighthouse: 1,
        wappalyzer: 1,
        axe: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en la API: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al ejecutar la prueba:', error);
    throw error;
  }
};

/**
 * Obtiene el estado de una prueba
 * @param {string} testId - ID de la prueba
 * @returns {Promise} - Promesa con el estado de la prueba
 */
export const getTestStatus = async (testId) => {
  try {
    const response = await fetch(`${BASE_URL}/testStatus.php?test=${testId}&f=json`, {
      headers: {
        'X-WPT-API-KEY': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener el estado: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al obtener el estado de la prueba:', error);
    throw error;
  }
};

/**
 * Obtiene los resultados de una prueba
 * @param {string} testId - ID de la prueba
 * @returns {Promise} - Promesa con los resultados de la prueba
 */
export const getTestResults = async (testId) => {
  try {
    const response = await fetch(`${BASE_URL}/jsonResult.php?test=${testId}`, {
      headers: {
        'X-WPT-API-KEY': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener los resultados: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al obtener los resultados de la prueba:', error);
    throw error;
  }
}; 