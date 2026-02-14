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
const outputFile = path.resolve(process.cwd(), 'debug_est_output.txt');
const log = (msg: string) => {
    console.log(msg);
    fs.appendFileSync(outputFile, msg + '\n');
};

const { SALESFORCE_LOGIN_URL, SALESFORCE_USERNAME, SALESFORCE_PASSWORD, SALESFORCE_TOKEN } = process.env;

const getESTDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-CA', {
        timeZone: 'America/New_York'
    });
};

const getESTTime = (timestamp: number) => {
    // Force 24-hour format logic to be safe
    // en-GB usually does 24h, but let's see exactly what we get
    const timeStr = new Date(timestamp).toLocaleTimeString('en-GB', {
        timeZone: 'America/New_York',
        hour12: false
    });
    return timeStr + '.000Z'; // TRYING WITH Z
};

async function debugEST() {
    fs.writeFileSync(outputFile, '');
    log('Debugging EST Time Storage...');

    if (!SALESFORCE_USERNAME || !SALESFORCE_PASSWORD) {
        log('❌ Missing credentials');
        return;
    }

    const conn = new jsforce.Connection({
        loginUrl: SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    try {
        await conn.login(SALESFORCE_USERNAME, SALESFORCE_PASSWORD + (SALESFORCE_TOKEN || ''));
        log('✅ Login Successful');

        // Create a test payload
        const now = Date.now();
        const dateOnly = getESTDate(now);
        const timeIn = getESTTime(now);

        log(`\nLocal timestamp: ${now}`);
        log(`Computed Date__c: ${dateOnly}`);
        log(`Computed Time_in__c: ${timeIn}`);

        const record = {
            Date__c: dateOnly,
            Time_in__c: timeIn,
            Time_Out__c: timeIn, // Reuse for simplicity
            Duration_Hours__c: 0,
            User_Email__c: 'debug@test.com',
            Summary__c: 'EST Debug'
        };

        log(`Sending Payload: ${JSON.stringify(record, null, 2)}`);

        const res = await conn.sobject('Time_Sheet__c').create(record);
        if (res.success) {
            log(`✅ Created Record: ${res.id}`);

            // Read it back
            const q = `SELECT Id, Date__c, Time_in__c, Time_Out__c FROM Time_Sheet__c WHERE Id = '${res.id}'`;
            const result = await conn.query(q);
            const saved = result.records[0] as any;

            log('\n--- READ BACK FROM SALESFORCE ---');
            log(`ID: ${saved.Id}`);
            log(`Date__c: ${saved.Date__c}`);
            log(`Time_in__c: ${saved.Time_in__c}`);
            log(`Time_Out__c: ${saved.Time_Out__c}`);
            log('---------------------------------');

            if (saved.Time_in__c.includes(timeIn.substring(0, 5))) {
                log('✅ MATCH: Stored time matches sent time (roughly).');
            } else {
                log('❌ MISMATCH: Stored time is different.');
            }

            // Cleanup
            await conn.sobject('Time_Sheet__c').destroy(res.id);
            log('Cleanup complete.');

        } else {
            log(`Create failed: ${JSON.stringify(res.errors)}`);
        }

    } catch (err: any) {
        log(`❌ Error: ${err.message}`);
    }
}

debugEST();
