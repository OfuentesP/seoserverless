import axios from 'axios';

export default async function handler(req, res) {
  const { testId, apiKey } = req.query;

  if (!testId || !apiKey) {
    return res.status(400).json({ success: false, error: 'Missing testId or apiKey' });
  }

  try {
    const response = await axios.get(`https://www.webpagetest.org/jsonResult.php?test=${testId}&k=${apiKey}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-WPT-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const data = response.data;

    if (!data || !data.data || !data.data.runs) {
      throw new Error('Invalid response from WebPageTest');
    }

    const firstView = data.data.runs["1"].firstView;

    const resumen = {
      url: data.data.testUrl || null,
      loadTime: firstView?.loadTime || null,
      totalSize: firstView?.bytesIn || null,
      requests: firstView?.requests || null,
      lcp: firstView?.largestContentfulPaint || null,
      cls: firstView?.cumulativeLayoutShift || null,
      tbt: firstView?.totalBlockingTime || null,
      detalles: `https://www.webpagetest.org/result/${testId}`,
      testId: testId
    };

    return res.status(200).json({ success: true, resumen });

  } catch (error) {
    console.error('[API /webpagetest/results] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Error fetching WebPageTest results' });
  }
}