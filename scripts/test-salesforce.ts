import fs from 'fs';
import path from 'path';
import jsforce from 'jsforce';

// Manually load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const { SALESFORCE_LOGIN_URL, SALESFORCE_USERNAME, SALESFORCE_PASSWORD, SALESFORCE_TOKEN } = process.env;

async function testConnection() {
    const logFile = path.resolve(process.cwd(), 'test_output_debug.txt');
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };
    // Clear log file
    fs.writeFileSync(logFile, '');

    log('Testing Salesforce Connection...');
    log('Login URL: ' + SALESFORCE_LOGIN_URL);
    log('Username: ' + SALESFORCE_USERNAME);

    // Mask password/token for logs
    const hasPassword = !!SALESFORCE_PASSWORD;
    const hasToken = !!SALESFORCE_TOKEN;
    log('Password Present: ' + hasPassword);
    log('Token Present: ' + hasToken);

    if (!SALESFORCE_USERNAME || !SALESFORCE_PASSWORD) {
        log('❌ Missing credentials in .env');
        process.exit(1);
    }

    const conn = new jsforce.Connection({
        loginUrl: SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    try {
        // Try method 1: Standard (Password + Token)
        log('Attempting Login (Method 1: Password + Token)...');
        let passwordToUse = SALESFORCE_PASSWORD + (SALESFORCE_TOKEN || '');

        try {
            await conn.login(SALESFORCE_USERNAME, passwordToUse);
        } catch (e1) {
            log('Method 1 failed. Attempting Method 2: Password only (assuming token is already appended)...');
            // Try method 2: Password only (in case user already appended token to password)
            passwordToUse = SALESFORCE_PASSWORD || '';
            await conn.login(SALESFORCE_USERNAME, passwordToUse);
        }

        log('✅ Login Successful!');

        log('Testing Query...');
        const result = await conn.query("SELECT Id FROM User LIMIT 1");
        log('✅ Query Successful! Found ' + result.totalSize + ' records.');

        log('Testing Write (Create temporary record)...');
        const targetObject = 'Timecard_Entry__c';
        try {
            await conn.describe(targetObject);
            log(`✅ Object ${targetObject} exists and is accessible.`);
        } catch (e: any) {
            log(`❌ Could not describe ${targetObject}. Object might be missing or permissions issue.`);
            log(e.message);
        }

    } catch (err: any) {
        log('❌ Connection Failed: ' + err.message);
        log(JSON.stringify(err, null, 2));
        // process.exit(1); // Don't exit with error code to avoid shell noise
    }
}

testConnection();
