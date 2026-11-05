import axios from 'axios';

export interface CloudflareConfig {
  apiKey: string;
  email: string;
  zoneId: string;
  dnsRecords: DnsRecord[];
}

export interface DnsRecord {
  name: string;
  type: 'A' | 'AAAA' | 'CNAME';
  proxied: boolean;
  ttl: number;
  content?: string;
  id?: string;
}

export interface CloudflareApiResponse<T> {
  success: boolean;
  errors: any[];
  messages: any[];
  result: T;
}

export class CloudflareDnsUpdater {
  private config: CloudflareConfig;
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(config: CloudflareConfig) {
    this.config = config;
  }

  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'X-Email': this.config.email,
    };
  }

  async getZoneId(): Promise<string> {
    if (this.config.zoneId) {
      return this.config.zoneId;
    }

    try {
      const response = await axios.get<{ success: boolean; result?: { id: string }[]; errors?: any[]; messages?: any[] }>(
        `${this.baseUrl}/zones`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success && response.data.result && response.data.result.length > 0) {
        const firstZone = response.data.result[0];
        return firstZone?.id || '';
      }

      throw new Error('Zone ID not found');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch zone: ${error.message}`);
      }
      throw error;
    }
  }

  async getDnsRecords(): Promise<DnsRecord[]> {
    const zoneId = await this.getZoneId();

    try {
      const response = await axios.get<{ success: boolean; result?: DnsRecord[]; errors?: any[]; messages?: any[]; result_info?: { total_count: number } }>(
        `${this.baseUrl}/zones/${zoneId}/dns_records`,
        {
          headers: this.getAuthHeaders(),
          params: { per_page: 100 },
        }
      );

      if (response.data.success && response.data.result) {
        return response.data.result;
      }

      throw new Error('Failed to fetch DNS records');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get DNS records: ${error.message}`);
      }
      throw error;
    }
  }

  async updateDnsRecord(recordId: string, recordName: string, newIp: string): Promise<boolean> {
    const zoneId = await this.getZoneId();

    try {
      const response = await axios.patch<CloudflareApiResponse<DnsRecord>>(
        `${this.baseUrl}/zones/${zoneId}/dns_records/${recordId}`,
        {
          name: recordName,
          type: 'A',
          content: newIp,
          proxied: false,
          ttl: 300,
        },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        console.log(`Successfully updated DNS record ${recordId} to IP: ${newIp}`);
        return true;
      }

      throw new Error('Failed to update DNS record');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to update DNS record: ${error.message}`);
      }
      throw error;
    }
  }

  async createTestRecord(recordName: string, ip: string): Promise<DnsRecord | null> {
    const zoneId = await this.getZoneId();

    try {
      const response = await axios.post<CloudflareApiResponse<DnsRecord>>(
        `${this.baseUrl}/zones/${zoneId}/dns_records`,
        {
          name: recordName,
          type: 'A',
          content: ip,
          proxied: false,
          ttl: 300,
        },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success && response.data.result) {
        console.log(`Successfully created test DNS record: ${recordName}`);
        return response.data.result;
      }

      throw new Error('Failed to create DNS record');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create DNS record: ${error.message}`);
      }
      throw error;
    }
  }

  async updateAllARecords(newIp: string): Promise<{ updated: number; unchanged: number; errors: number }> {
    const zoneId = await this.getZoneId();

    try {
      const response = await axios.get<{ success: boolean; result?: DnsRecord[]; errors?: any[] }>(
        `${this.baseUrl}/zones/${zoneId}/dns_records`,
        {
          headers: this.getAuthHeaders(),
          params: { type: 'A', per_page: 100 },
        }
      );

      if (!response.data.success || !response.data.result) {
        throw new Error('Failed to fetch A records');
      }

      let updated = 0;
      let unchanged = 0;
      let errors = 0;
      const recordsProcessed = response.data.result.length;

      for (const record of response.data.result) {
        if (!record.content) continue;
        
        if (record.type !== 'A') {
          console.log(`Skipping non-A record: ${record.name} (${record.type})`);
          continue;
        }

        if (record.content === newIp) {
          unchanged++;
          continue;
        }

        try {
          const updateResponse = await axios.patch<CloudflareApiResponse<DnsRecord>>(
            `${this.baseUrl}/zones/${zoneId}/dns_records/${record.id}`,
            {
              name: record.name,
              type: 'A',
              content: newIp,
              proxied: record.proxied,
              ttl: record.ttl,
            },
            { headers: this.getAuthHeaders() }
          );

          if (updateResponse.data.success) {
            console.log(`Updated ${record.name} from ${record.content} to ${newIp}`);
            updated++;
          } else {
            errors++;
          }
        } catch (err: any) {
          console.error(`Failed to update ${record.name}: ${err.message}`);
          errors++;
        }
      }

      console.log(`Processed ${recordsProcessed} A DNS record(s). Only A records are updated.`);
      return { updated, unchanged, errors };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to update A records: ${error.message}`);
      }
      throw error;
    }
  }

  async deleteDnsRecord(recordId: string): Promise<boolean> {
    const zoneId = await this.getZoneId();

    try {
      const response = await axios.delete<CloudflareApiResponse<null>>(
        `${this.baseUrl}/zones/${zoneId}/dns_records/${recordId}`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        console.log(`Successfully deleted DNS record ${recordId}`);
        return true;
      }

      throw new Error('Failed to delete DNS record');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete DNS record: ${error.message}`);
      }
      throw error;
    }
  }
}
