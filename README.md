# Cloudflare DNS Renewal Application

A Node.js application that detects public IP changes and automatically updates Cloudflare "A" type DNS records.

## Prerequisites

- Node.js (v14 or higher)
- npm
- Cloudflare account with:
  - API Key (or token with Zone:DNS Edit permission)
  - Account Email
  - Zone ID
  - DNS Record IDs (if known)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/cmudhar/cloudflareDNSRenew.git
cd cloudflareDNSRenew
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Application

```bash
npm run build
```

## Configuration

### Step 1: Create Your Config File

Create a local config file that will NOT be committed to git:

```bash
cp config.json config.local.json
```

### Step 2: Edit `config.local.json`

Replace the placeholders with your actual credentials:

```json
{
  "ipService": {
    "serviceUrl": "https://api.ipify.org?format=json",
    "name": "ipify"
  },
  "cloudflare": {
    "apiKey": "YOUR_API_KEY_HERE",
    "email": "your-email@example.com",
    "zoneId": "YOUR_ZONE_ID_HERE",
    "dnsRecords": [
      {
        "name": "example.com",
        "type": "A",
        "proxied": false,
        "ttl": 300,
        "id": null  // Cloudflare will fetch this automatically
      }
    ]
  },
  "lastKnownIp": null,
  "logLevel": "info"
}
```

### Finding Your Cloudflare Credentials

1. **API Key**: 
   - Go to [my.cloudflare.com](https://my.cloudflare.com)
   - Click your profile → My Profile → API Keys
   - Create a new API key or use an existing one (Zone:DNS Edit permission required)

2. **Email**: Your Cloudflare account email

3. **Zone ID**:
   - Go to [cloudflare.com](https://dash.cloudflare.com)
   - Select your domain
   - The Zone ID is shown in the page URL or under Settings → General

4. **DNS Records**: You can add record names; the app will automatically find their IDs

## Running the Application

### Manual Execution

```bash
# Run from source (TypeScript compiled on-the-fly)
npm start

# Or run the built version directly
node dist/index.js --config config.local.json
```

### Production Deployment to Windows

1. Copy all files to your production folder:
   ```bash
   xcopy /E /I . C:\apps\cloudflareDNSRenew
   ```

2. Navigate to production folder and install:
   ```bash
   cd C:\apps\cloudflareDNSRenew
   npm install --production
   npm run build
   ```

3. Run the application:
   ```bash
   node dist/index.js --config config.local.json
   ```

## Scheduling Daily Execution (Windows)

**Option A: Using Batch File (Easiest)**

1. Copy `daily-renewal.cmd` to `C:\apps\cloudflareDNSRenew\`

2. Press `Win` key → type "Task Scheduler" → Right-click → **Run as administrator**

3. In Action panel, click **Create Task...**

4. **General Tab:**
   - Name: `Cloudflare DNS Renewal`
   - Check "Run with highest privileges"
   - Configure for: Windows 10/11

5. **Triggers Tab** → New:
   - Begin the task: On a schedule
   - Daily, start time: `09:00`

6. **Actions Tab** → New:
   - Action: Start a program
   - Program/script: `C:\apps\cloudflareDNSRenew\daily-renewal.cmd`

7. Click **OK**, enter your administrator password if prompted

8. Verify the task was created:
   ```powershell
   Get-ScheduledTask | Where-Object {$_.TaskName -eq "Cloudflare DNS Renewal"} | Select TaskName, State
   ```

**Option B: Direct Node.js Execution**

Follow steps 1-3 above, then in **Actions Tab**:
   - Program/script: `C:\Program Files\nodejs\node.exe`
   - Add arguments: `"C:\apps\cloudflareDNSRenew\dist\index.js" "--config" "C:\apps\cloudflareDNSRenew\config.local.json"`

**Expected Behavior:**

The task will run daily at 9 AM and:
- Check current public IP
- If changed from last-known IP, update Cloudflare DNS records
- Log results to console (viewable in Task Scheduler history)

## Testing Before Deployment

### 1. Test Cloudflare Connection

```bash
npm run test:cloudflare -- --config config.local.json
```

What it does:
- Validates API key and email
- Lists all DNS records in your zone
- Shows which records match your configured names

Expected output:
```
Testing Cloudflare API...
Zone ID: d1e5b835dd534eac2a0017600246d533
Found 5 DNS records:
  - www.example.com (A) - ID: abc123
  - example.com (A) - ID: def456
Cloudflare API test PASSED
```

### 2. Test IP Service

```bash
npm run test:ip
```

Verifies the IP fetch service responds correctly. Expected output:
```
Test IP Service
Current Public IP: 76.114.17.164
Service: ipify
```

### 3. Full Application Test (Dry Run)

Create a `test-config.json` with `"logLevel": "debug"` and run:

```bash
node dist/index.js --config test-config.json
```

What to look for in output:
- ✅ "Current Public IP" shown
- ✅ "Last Known IP" from config file
- ✅ If IPs differ: "IP changed! Updating DNS records..."
- ✅ If IPs same: "No IP change detected. DNS records remain unchanged."
- ✅ "DNS Renewal completed successfully" at end

### 4. Test DNS Update Flow

To test actual DNS updates safely:

1. **Backup current config**: 
   ```bash
   copy config.local.json test-config.json.backup
   ````

2. **Intentionally corrupt `lastKnownIp`** in a test copy:
   ```json
   "lastKnownIp": "0.0.0.0"
   ```

3. **Run the application**:
   ```bash
   node dist/index.js --config test-config.json
   ```

4. **Verify in Cloudflare Dashboard**:
   - Wait 60 seconds for DNS propagation
   - Check your domain resolves to new IP
   - Or use: `ping your-domain.com`

5. **Restore original config** after test:
   ```bash
   copy test-config.json.backup config.local.json
   del test-config.json.test-config.json.backup
   ```

### 5. Quick Smoke Test (No Changes)

Just verify the app runs correctly without making changes:

```bash
node dist/index.js --config config.local.json 2>&1 | more
```

Should see output like:
```
DNS Renewal Application Initialized
Using IP Service: ipify
Checking for IP changes...
Current Public IP: 76.114.17.164
Last Known IP: 76.114.17.164
No IP change detected. DNS records remain unchanged.
DNS Renewal completed successfully.
```

## Test Scripts Available

| Command | Description |
|---------|-------------|
| `npm run test:cloudflare` | Validate Cloudflare API credentials and list records |
| `npm run test:ip` | Test IP fetch service connectivity |
| `npm start` | Run full application with default config |
| `node dist/index.js --help` | Show all available command-line options |

## Validation Checklist

Before deploying to production, verify:

- [ ] Cloudflare API test passes (returns 200 OK)
- [ ] IP service responds with valid IP address
- [ ] Domain resolves to expected current IP
- [ ] Config file has correct Zone ID and record names
- [ ] Test-config.json shows "No IP change" before making intentional changes
- [ ] After intentional IP mismatch test, DNS updates correctly
- [ ] Restore config after testing completes

## Application Behavior

1. **First Run**: Stores current public IP as `lastKnownIp` in config
2. **Subsequent Runs**: 
   - Fetches current public IP
   - Compares with stored IP
   - If different, updates all matching Cloudflare "A" records
   - Saves new IP to config for next comparison

## Notes

- Only "A" type records are updated (type validation on line 176 of `src/cloudflare.ts`)
- API credentials in `config.json` contain placeholders and are NOT committed to git
- Your actual credentials go in `config.local.json` which is ignored by git
- Logs to console with configurable verbosity via `logLevel` setting

## Troubleshooting

### "Invalid API Key" Error
- Verify your API key has **Zone:DNS Edit** permissions
- Ensure email matches your Cloudflare account
- Check for extra spaces in config file

### DNS Records Not Updating
- Verify Zone ID is correct
- Confirm record names match exactly (case-sensitive)
- Check that records are "A" type only

### Application Won't Start
- Run `npm install --force` to rebuild dependencies
- Clear npm cache: `npm cache clean --force`
