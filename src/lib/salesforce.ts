import jsforce from 'jsforce';
import { Connection } from 'jsforce';

// Singleton connection
let conn: Connection | null = null;
const { SALESFORCE_LOGIN_URL, SALESFORCE_USERNAME, SALESFORCE_PASSWORD, SALESFORCE_TOKEN } = process.env;

export const getSalesforceConnection = async () => {
    if (conn) return conn;

    const connection = new jsforce.Connection({
        loginUrl: SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    if (!SALESFORCE_USERNAME || !SALESFORCE_PASSWORD) {
        console.warn('Salesforce credentials missing');
        // Return connection anyway, calls will fail but app won't crash on load
        return connection;
    }

    try {
        await connection.login(SALESFORCE_USERNAME, SALESFORCE_PASSWORD + (SALESFORCE_TOKEN || ''));
        console.log('Connected to Salesforce');
        conn = connection;
    } catch (err) {
        console.error('Salesforce Login Failed', err);
        throw err;
    }

    return connection;
};

// Helper interface
export interface TimeEntryRecord {
    Id?: string;
    Name?: string; // Standard Name field
    Start_Time__c: string; // ISO
    End_Time__c: string; // ISO
    Duration_Hours__c: number;
    User_Email__c: string;
    Summary__c?: string;
}

const OBJECT_NAME = 'Timecard_Entry__c';

export const saveTimeEntryToSalesforce = async (entry: Partial<TimeEntryRecord>) => {
    const c = await getSalesforceConnection();
    // Assuming Custom Object exists
    return c.sobject(OBJECT_NAME).create(entry);
};

export const getTimeEntriesFromSalesforce = async (email: string) => {
    const c = await getSalesforceConnection();
    // Query
    const q = `SELECT Id, Start_Time__c, End_Time__c, Duration_Hours__c, User_Email__c, Summary__c 
               FROM ${OBJECT_NAME} 
               WHERE User_Email__c = '${email}' 
               ORDER BY Start_Time__c DESC LIMIT 100`;

    return c.query(q);
};

export const deleteTimeEntryFromSalesforce = async (id: string) => {
    const c = await getSalesforceConnection();
    return c.sobject(OBJECT_NAME).destroy(id);
};
