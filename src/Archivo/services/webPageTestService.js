import axios from 'axios';

const WEBPAGETEST_API_URL = 'https://www.webpagetest.org/runtest.php';

export const webPageTestService = {
  async runTest(url) {
    try {
      const response = await axios.get(WEBPAGETEST_API_URL, {
        params: {
          url: url,
          f: 'json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error running WebPageTest:', error);
      throw error;
    }
  }
}; 