import axios from 'axios';

interface IpFetcherConfig {
  serviceUrl: string;
  name: string;
}

export interface Config {
  serviceUrl: string;
  name: string;
}

export class IpFetcher {
  private config: IpFetcherConfig;

  constructor(serviceUrl: string, serviceName: string) {
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
    } catch (error: any) {
      const err = axios.isAxiosError(error) ? error : new Error(String(error));
      throw new Error(`Failed to fetch IP: ${err.message}`);
    }
  }
}
