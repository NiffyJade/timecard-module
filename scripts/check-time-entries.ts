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

async function checkEntries() {
    console.log('Connecting to Salesforce...');
    const conn = new jsforce.Connection({
        loginUrl: SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    try {
        const password = SALESFORCE_PASSWORD || '';
        const token = SALESFORCE_TOKEN || '';
        await conn.login(SALESFORCE_USERNAME || '', password + token);
        console.log('✅ Connected!');

        const query = "SELECT Id, Start_Time__c, End_Time__c, Duration_Hours__c, User_Email__c, Summary__c, CreatedDate FROM Timecard_Entry__c ORDER BY CreatedDate DESC LIMIT 10";
        console.log('\nQuerying recent Timecard Entries...');
        console.log(query);

        const result = await conn.query(query);
        console.log(`\nFound ${result.totalSize} records.`);

        if (result.records.length > 0) {
            console.log('\nRecent Entries:');
            result.records.forEach((record: any) => {
                console.log('------------------------------------------------');
                console.log(`ID: ${record.Id}`);
                console.log(`Email: ${record.User_Email__c}`);
                console.log(`Start: ${record.Start_Time__c}`);
                console.log(`End: ${record.End_Time__c}`);
                console.log(`Duration (Hours): ${record.Duration_Hours__c}`);
                console.log(`Summary: ${record.Summary__c}`);
                console.log(`Created: ${record.CreatedDate}`);
            });
            console.log('------------------------------------------------');
        } else {
            console.log('No entries found.');
        }

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

checkEntries();
