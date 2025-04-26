# SEO Analyzer Pro

Una aplicación web moderna para analizar el rendimiento, SEO y metadatos de sitios web utilizando la API de WebPageTest y Gemini AI.

## Características

- Análisis de rendimiento web en tiempo real
- Métricas de velocidad y rendimiento
- Puntuaciones de Lighthouse
- Detección de tecnologías
- Análisis de sitemap
- Análisis de metadatos (título, descripción, palabras clave)
- Análisis de IA con Gemini
- Generación de informes en PDF
- Interfaz moderna y responsiva

## Requisitos

- Node.js 16.x o superior
- NPM 7.x o superior
- API Key de WebPageTest
- API Key de Gemini AI

## Instalación

1. Clona el repositorio:
```bash
git clone <repository-url>
cd seo202
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto y agrega tus API keys:
```
VITE_WEBPAGETEST_API_KEY=your_webpagetest_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## Uso

1. Abre tu navegador y ve a `http://localhost:5173`
2. Ingresa la URL del sitio web que deseas analizar
3. Haz clic en "Analizar"
4. Espera a que se complete el análisis
5. Revisa los resultados detallados:
   - Análisis de rendimiento
   - Análisis de sitemap
   - Análisis de metadatos
   - Análisis de IA
6. Descarga el informe en PDF

## Tecnologías Utilizadas

- Vue.js 3
- Tailwind CSS
- WebPageTest API
- Gemini AI API
- html2pdf.js
- sitemap
- Vite

## Estructura del Proyecto

- `src/components/`: Componentes Vue
  - `UrlInputForm.vue`: Formulario para ingresar la URL
  - `MetadataAnalysis.vue`: Visualización del análisis de metadatos
  - `SitemapAnalysis.vue`: Visualización del análisis de sitemap
  - `AIAnalysis.vue`: Visualización del análisis de IA
- `src/services/`: Servicios para interactuar con APIs
  - `webpagetest.js`: Servicio para WebPageTest API
  - `metadata.js`: Servicio para análisis de metadatos
  - `sitemap.js`: Servicio para análisis de sitemap
  - `gemini.js`: Servicio para Gemini AI

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue para discutir los cambios que te gustaría hacer.

## Licencia

MIT
