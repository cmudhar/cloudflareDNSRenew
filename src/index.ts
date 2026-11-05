import { DnsRenewalApp } from './app.js';

async function run() {
  const app = new DnsRenewalApp();
  
  try {
    await app.checkAndUpdate();
  } catch (error) {
    console.error('Application failed:', error);
    process.exit(1);
  }
}

run();
