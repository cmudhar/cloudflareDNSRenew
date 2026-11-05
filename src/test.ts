import { CloudflareDnsUpdater } from './cloudflare';
import axios from 'axios';

async function testRecord() {
  console.log('=== Testing DNS Record Creation ===\n');

  let rawConfig: any;
  try {
    rawConfig = require('../config.json');
  } catch (err) {
    console.error('❌ Error: Cannot load config.json. Please configure your Cloudflare credentials first.');
    process.exit(1);
  }

  console.log('RAW CONFIG:', JSON.stringify(rawConfig, null, 2));
  
  const cfConfig = rawConfig.cloudflare;
  if (!cfConfig) {
    console.error('❌ Error: cloudflare configuration not found in config.json');
    process.exit(1);
  }

  const updater = new CloudflareDnsUpdater(cfConfig);
  const timestamp = Date.now();
  const testRecordName = `test-${timestamp}`;

  let recordObj: any;
  let currentIp = '';
  
  try {
    const ipResp = await axios.get('https://api.ipify.org?format=json');
    currentIp = ipResp.data.ip;
    console.log(`Current Public IP: ${currentIp}`);
    console.log(`\n📝 Test record name will be: ${testRecordName}\n`);

    try {
      console.log('Creating test DNS record...');
      recordObj = await updater.createTestRecord(testRecordName, currentIp);
      
      console.log('✅ Test record created successfully!\n');
    } catch (err: any) {
      const data = err.response?.data;
      if (typeof data === 'object' && data !== null) {
        console.error('❌ Cloudflare API Error:', JSON.stringify(data, null, 2));
      } else {
        console.error('❌ Unhandled error:', err.message);
      }
      process.exit(1);
    }

    console.log('Verifying DNS record exists...');
    const records = await updater.getDnsRecords();
    const found = records.find((r: any) => r.name === testRecordName);
    if (found) {
      console.log('✅ Record verified in Cloudflare');
      console.log(`   Name: ${found.name}`);
      console.log(`   Type: ${found.type}`);
      console.log(`   Content: ${found.content}\n`);
    } else {
      console.log('⚠️  Warning: Could not find test record in list');
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (recordObj?.id) {
      try {
        await updater.deleteDnsRecord(recordObj.id);
        console.log('✓ Test record deleted');
      } catch (err: any) {
        console.log('- Note:', err.message);
      }
    }

    console.log('\n=== Test Complete ===');
    process.exit(0);
  }
}

testRecord();
