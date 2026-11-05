import { Config, IpFetcher } from './ipFetcher.js';
import { CloudflareDnsUpdater, CloudflareConfig } from './cloudflare.js';
import * as fs from 'fs';

interface ApplicationConfig {
  ipService: Config;
  cloudflare: CloudflareConfig;
  lastKnownIp: string;
  logLevel: 'info' | 'error';
}

const CONFIG_PATH = './config.json';

export class DnsRenewalApp {
  private config: ApplicationConfig;
  private ipFetcher: IpFetcher;
  private dnsUpdater: CloudflareDnsUpdater;

  constructor() {
    this.config = this.loadConfig();
    this.ipFetcher = new IpFetcher(
      this.config.ipService.serviceUrl,
      this.config.ipService.name
    );
    this.dnsUpdater = new CloudflareDnsUpdater(this.config.cloudflare);

    if (this.config.logLevel === 'info') {
      console.log('DNS Renewal Application Initialized');
      console.log(`Using IP Service: ${this.config.ipService.name}`);
    }
  }

  private loadConfig(): ApplicationConfig {
    try {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data) as ApplicationConfig;
    } catch (error) {
      throw new Error(`Failed to load config from ${CONFIG_PATH}: ${error}`);
    }
  }

  private async saveLastKnownIp(ip: string): Promise<void> {
    try {
      this.config.lastKnownIp = ip;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error(`Failed to save last known IP: ${error}`);
    }
  }

  async checkAndUpdate(): Promise<void> {
    try {
      console.log('Checking for IP changes...');

      const currentIp = await this.ipFetcher.fetchPublicIp();
      console.log(`Current Public IP: ${currentIp}`);

      if (this.config.lastKnownIp === currentIp) {
        console.log('No IP change detected. DNS records remain unchanged.');
        return;
      }

      console.log(`IP changed from ${this.config.lastKnownIp || 'N/A'} to ${currentIp}`);

      const results = await this.dnsUpdater.updateAllARecords(currentIp);
      
      console.log(`\nUpdate Summary:`);
      console.log(`  Updated: ${results.updated} records`);
      console.log(`  Unchanged: ${results.unchanged} records`);
      if (results.errors > 0) {
        console.log(`  Errors: ${results.errors}`);
      }

      if (results.updated > 0 || results.unchanged > 0) {
        await this.saveLastKnownIp(currentIp);
        console.log('\nDNS update process completed.');
      } else {
        console.warn('No DNS records were updated or found.');
      }
    } catch (error) {
      console.error(`DNS check/update failed: ${error}`);
      throw error;
    }
  }

  async testWithRecord(): Promise<void> {
    try {
      console.log('Running end-to-end test with DNS record creation...');

      const currentIp = await this.ipFetcher.fetchPublicIp();
      console.log(`Current IP: ${currentIp}`);

      if (this.config.lastKnownIp === currentIp) {
        console.log('No IP change detected. Skipping test update.');
        return;
      }

      const testRecordName = 'test-dns-renewal-check.yourdomain.com';
      let testRecord: any = null;

      try {
        testRecord = await this.dnsUpdater.createTestRecord(
          testRecordName,
          currentIp
        );
        console.log(`Test record created with ID: ${testRecord.id}`);

        if (this.config.logLevel === 'info') {
          const records = await this.dnsUpdater.getDnsRecords();
          const found = records.find(r => r.name === testRecordName);
          if (found) {
            console.log(`Verified: ${testRecordName} -> ${found.content}`);
          }
        }

        console.log('Test record update verification complete.');
      } finally {
        await this.dnsUpdater.deleteDnsRecord(testRecord?.id!);
        console.log('Test record cleaned up successfully.');
      }

      await this.saveLastKnownIp(currentIp);
    } catch (error) {
      console.error(`Test failed: ${error}`);
      throw error;
    }
  }
}
