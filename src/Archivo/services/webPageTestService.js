import axios from 'axios';

const WEBPAGETEST_API_URL = 'https://www.webpagetest.org/runtest.php';

export const webPageTestService = {
  async runTest(url) {
    try {
      const response = await axios.get(WEBPAGETEST_API_URL, {
        params: {
          url: url,
          f: 'json',
          k: process.env.WPT_API_KEY
        },
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-WPT-API-Key': process.env.WPT_API_KEY,
          'Authorization': `Bearer ${process.env.WPT_API_KEY}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error running WebPageTest:', error);
      throw error;
    }
  }
}; 