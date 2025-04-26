import axios from 'axios';

const API_KEY = import.meta.env.VITE_WEBPAGETEST_API_KEY || '';

if (!API_KEY) {
  console.error('WebPageTest API key is not set in environment variables');
} else {
  console.log('WebPageTest API key is configured');
}

/**
 * Run a WebPageTest test for a given URL
 * @param {string} url - The URL to test
 * @param {string} location - The location to run the test from (default: 'Dulles:Chrome')
 * @param {string} connectivity - The connectivity profile (default: 'Cable')
 * @param {boolean} lighthouse - Whether to include Lighthouse analysis (default: true)
 * @returns {Promise<Object>} - The test results
 */
export const runTest = async (url, location = 'Dulles:Chrome', connectivity = 'Cable', lighthouse = true) => {
  try {
    if (!API_KEY) {
      throw new Error('WebPageTest API key is not configured');
    }

    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Running WebPageTest with:', { url, location, connectivity, lighthouse });
    
    const response = await axios.get('/api/webpagetest/runtest', {
      params: {
        url,
        apiKey: API_KEY,
        location,
        connectivity,
        lighthouse: lighthouse ? 1 : 0
      }
    });
    
    if (response.data.statusCode === 200) {
      console.log('WebPageTest started successfully:', response.data);
      return response.data;
    } else {
      console.error('WebPageTest API error:', response.data);
      throw new Error(response.data.statusText || 'Error running WebPageTest');
    }
  } catch (error) {
    console.error('WebPageTest API error:', error.response?.data || error);
    throw new Error('Error running WebPageTest: ' + (error.response?.data?.error || error.message));
  }
};

/**
 * Get the status of a WebPageTest test
 * @param {string} testId - The ID of the test to check
 * @returns {Promise<Object>} - The test status
 */
export const getTestStatus = async (testId) => {
  try {
    // For simplicity, we'll just try to get the results directly
    // If the test is not complete, the API will return a status indicating it's still running
    const response = await axios.get('/api/webpagetest/results', {
      params: {
        testId,
        apiKey: API_KEY
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('WebPageTest API error:', error);
    throw new Error('Error checking test status: ' + (error.response?.data?.statusText || error.message));
  }
};

/**
 * Get the results of a WebPageTest test
 * @param {string} testId - The ID of the test to get results for
 * @returns {Promise<Object>} - The test results
 */
export const getTestResults = async (testId) => {
  try {
    if (!API_KEY) {
      throw new Error('WebPageTest API key is not configured');
    }

    if (!testId) {
      throw new Error('Test ID is required');
    }

    const response = await axios.get('/api/webpagetest/results', {
      params: {
        test: testId,
        apiKey: API_KEY
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting WebPageTest results:', error.response?.data || error);
    throw new Error('Error getting test results: ' + (error.response?.data?.error || error.message));
  }
};

/**
 * Poll for test results until they are ready
 * @param {string} testId - The ID of the test to poll for
 * @param {number} maxAttempts - Maximum number of polling attempts (default: 30)
 * @param {number} interval - Polling interval in milliseconds (default: 5000)
 * @returns {Promise<Object>} - The test results
 */
export const pollForResults = async (testId, maxAttempts = 30, interval = 5000) => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const results = await getTestResults(testId);
      
      if (results.statusCode === 200) {
        return results;
      } else if (results.statusCode === 100) {
        // Test is still running
        console.log(`Test ${testId} is still running. Attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } else {
        throw new Error(`Test ${testId} failed with status: ${results.statusCode}`);
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.statusCode === 100) {
        // Test is still running
        console.log(`Test ${testId} results not ready yet. Attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Test ${testId} timed out after ${maxAttempts} attempts`);
};

/**
 * Obtiene el balance restante de tests
 * @returns {Promise} - Promesa con el balance restante
 */
export const getTestBalance = async () => {
  try {
    const response = await axios.get('/api/webpagetest/testBalance', {
      params: {
        apiKey: API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener el balance de tests:', error);
    throw new Error('No se pudo obtener el balance de tests');
  }
};

/**
 * Obtiene las ubicaciones disponibles para los tests
 * @returns {Promise} - Promesa con las ubicaciones disponibles
 */
export const getLocations = async () => {
  try {
    const response = await axios.get('/api/webpagetest/getLocations', {
      params: {
        apiKey: API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener las ubicaciones:', error);
    throw new Error('No se pudo obtener las ubicaciones disponibles');
  }
};

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatMetric(value, unit = '') {
  if (!value) return 'N/A';
  return `${value}${unit}`;
} 