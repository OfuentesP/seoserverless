import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/fcp/:testId', async (req, res) => {
  const { testId } = req.params;
  
  try {
    // Ruta donde se guardan los resultados
    const rutaArchivo = path.join(__dirname, '../../../resultados', testId, 'resumen.json');
    
    try {
      const rawData = await fs.readFile(rutaArchivo, 'utf-8');
      const resumen = JSON.parse(rawData);
      
      const fcp = resumen?.fcp ?? null;
      const coreWebVitalsReady = fcp !== null;
      
      console.log('[DEBUG] FCP data:', { coreWebVitalsReady, fcp });
      
      res.json({
        coreWebVitalsReady,
        fcp
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // El archivo aún no existe, el test está en progreso
        res.json({
          coreWebVitalsReady: false,
          fcp: null
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('Error leyendo resumen:', error);
    res.status(500).json({ 
      coreWebVitalsReady: false, 
      fcp: null,
      error: error.message 
    });
  }
});

export default router; 