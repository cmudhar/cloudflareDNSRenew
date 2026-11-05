const axios = require('axios');

class IpFetcher {
  constructor(serviceUrl, serviceName) {
    this.config = { serviceUrl, name: serviceName };
  }

  async fetchPublicIp() {
    try {
      const response = await axios.get(this.config.serviceUrl, {
        timeout: 10000,
      });

      if (response.status === 200 && response.data.ip) {
        return response.data.ip;
      }

      throw new Error('Invalid response from IP service');
    } catch (err) {
      const error = axios.isAxiosError(err) ? err : new Error(String(err));
      throw new Error(`Failed to fetch IP: ${error.message}`);
    }
  }
}

module.exports = { IpFetcher };
