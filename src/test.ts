const { CloudflareDnsUpdater } = require('./src/cloudflare.js');
const axios = require('axios');

async function testRecord() {
  console.log('=== Testing DNS Record Creation ===\n');

  let config;
  try {
    config = require('../config.json');
  } catch (err) {
    console.error('❌ Error: Cannot load config.json. Please configure your Cloudflare credentials first.');
    process.exit(1);
  }

  const updater = new CloudflareDnsUpdater(config.cloudflare);
  const timestamp = Date.now();
  const testRecordName = `test-${timestamp}`;

  let recordObj;
  try {
    const ipResp = await axios.get('https://api.ipify.org?format=json');
    const currentIp = ipResp.data.ip;
    console.log(`Current Public IP: ${currentIp}`);
    console.log(`\n📝 Test record name will be: ${testRecordName}\n`);

    console.log('Creating test DNS record...');
    recordObj = await updater.createTestRecord(testRecordName, currentIp);
    
    console.log('✅ Test record created successfully!');
    console.log(`   Record ID: ${recordObj.id}`);
    console.log(`   IP Address: ${recordObj.content}\n`);

    console.log('Verifying DNS record exists...');
    const records = await updater.getDnsRecords();
    const found = records.find(r => r.name === testRecordName);
    if (found) {
      console.log('✅ Record verified in Cloudflare');
      console.log(`   Name: ${found.name}`);
      console.log(`   Type: ${found.type}`);
      console.log(`   Content: ${found.content}\n`);
    } else {
      console.log('⚠️  Warning: Could not find test record in list');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    if (recordObj && recordObj.id) {
      try {
        await updater.deleteDnsRecord(recordObj.id);
        console.log('✓ Test record cleaned up successfully');
      } catch (err) {
        console.log('- Note: Could not clean up test record (may have already been deleted):', err.message);
      }
    }

    console.log('\n=== Test Complete ===');
    process.exit(0);
  }
}

testRecord();
