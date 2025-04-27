import axios from 'axios';
import { config } from './config.js';
import { cacheService } from './cacheService.js';

// Función para esperar un tiempo determinado
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchPageSpeedData = async (url, apiKey = process.env.PAGESPEED_API_KEY) => {
  try {
    // Verificar caché primero
    const cachedData = cacheService.get(url);
    if (cachedData) {
      console.log('📦 Usando datos en caché para:', url);
      return cachedData;
    }

    // Esperar antes de hacer la solicitud
    await sleep(config.REQUEST_DELAY);
    
    // Construir parámetros de la API
    const params = new URLSearchParams();
    params.append('url', url);
    params.append('strategy', config.DEFAULT_STRATEGY);

    // Agregar cada categoría como un parámetro separado
    config.DEFAULT_CATEGORIES.forEach(category => {
      params.append('category', category);
    });

    // Agregar API key si está disponible
    if (apiKey) {
      params.append('key', apiKey);
    }

    const apiUrl = `${config.API_BASE_URL}?${params.toString()}`;
    console.log('🔄 Solicitando datos de PageSpeed para:', url);
    
    const response = await axios.get(apiUrl);
    
    // Verificar si la respuesta contiene datos válidos
    if (!response.data || !response.data.lighthouseResult) {
      throw new Error('Respuesta de API inválida');
    }
    
    // Guardar en caché
    cacheService.set(url, response.data);
    console.log('✅ Datos obtenidos y guardados en caché');
    
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos de PageSpeed:', error);
    
    if (error.response) {
      switch (error.response.status) {
        case 429:
          throw new Error('Límite de solicitudes excedido. Por favor, intente más tarde.');
        case 400:
          throw new Error('URL inválida o mal formada.');
        case 403:
          throw new Error('API key inválida o faltante.');
        default:
          throw new Error(`Error del servidor (${error.response.status}). Por favor, intente más tarde.`);
      }
    }
    
    throw new Error('No se pudo analizar el rendimiento del sitio: ' + error.message);
  }
}; 