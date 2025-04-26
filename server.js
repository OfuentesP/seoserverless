// server.js
import express from 'express';
import { config } from 'dotenv';
import WebPageTest from 'webpagetest';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

config();

const app = express();
const PORT = process.env.PORT || 3000;

const wpt = new WebPageTest('https://www.webpagetest.org/', process.env.WPT_API_KEY);

// Promisify the callback-based methods
const runTestAsync = promisify(wpt.runTest.bind(wpt));
const getTestStatusAsync = promisify(wpt.getTestStatus.bind(wpt));
const getTestResultsAsync = promisify(wpt.getTestResults.bind(wpt));

// Necessary for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve your Vite build

// Main endpoint
app.post('/api/run-test', async (req, res) => {
  try {
    const { url } = req.body;

    // Logs for debugging
    console.log('--------------------------------------');
    console.log('URL received by server:', url);
    console.log('API Key loaded:', process.env.WPT_API_KEY ? '✅ OK' : '❌ NOT LOADED');
    console.log('--------------------------------------');

    if (!url) {
      return res.status(400).json({ error: 'URL not provided' });
    }

    console.log('🚀 Launching WebPageTest for:', url);

    const response = await runTestAsync(url, {
      location: 'Dulles:Chrome', // You can change location if desired
      runs: 1,
      firstViewOnly: true,
      f: 'json',
      lighthouse: true
    });

    if (!response || !response.data || !response.data.testId) {
      console.error('❌ Unexpected response from WebPageTest:', response);
      return res.status(500).json({ error: 'Error initiating test in WebPageTest' });
    }

    const { data } = response;
    const testId = data.testId;
    console.log(`✅ Test initiated successfully. ID: ${testId}`);

    // Wait for the test to complete
    const result = await waitForResults(testId);

    console.log('📊 Final result received from WebPageTest');

    res.json({
      success: true,
      resumen: {
        loadTime: result.data.average.firstView.loadTime,
        SpeedIndex: result.data.average.firstView.SpeedIndex,
        TTFB: result.data.average.firstView.TTFB,
        detalles: result.data.summary,
        lighthouse: result.data.lighthouse || null,
      }
    });
  } catch (error) {
    console.error('❌ Error processing test in WebPageTest:', error);
    res.status(500).json({ error: 'Error processing test in WebPageTest' });
  }
});

// Function to wait for results
async function waitForResults(testId, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    const { statusCode, statusText } = await getTestStatusAsync(testId);
    if (statusCode === 200) {
      console.log('✅ Test completed in WebPageTest');
      const results = await getTestResultsAsync(testId);
      return results;
    } else if (statusCode === 100) {
      console.log(`⏳ Test in progress or queued... Attempt ${i + 1}/${attempts}`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds
    } else {
      console.error(`❌ Unexpected status: ${statusCode} ${statusText}`);
      throw new Error(`Unexpected status from WebPageTest: ${statusCode} ${statusText}`);
    }
  }
  throw new Error('⏰ Timeout waiting for results from WebPageTest');
}

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Server listening on http://localhost:${PORT}`);
});