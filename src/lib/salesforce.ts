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
    Date__c: string; // YYYY-MM-DD
    Time_in__c: string; // HH:mm:ss.SSSZ
    Time_Out__c: string; // HH:mm:ss.SSSZ
    Duration_Hours__c: number;
    User_Email__c: string;
    Summary__c?: string;
    Contact__c?: string; // Lookup ID
    Account__c?: string; // Lookup ID (Department)
    Day_of_the_week__c?: string; // Picklist/String
}

const OBJECT_NAME = 'Time_Sheet__c';

export const saveTimeEntryToSalesforce = async (entry: Partial<TimeEntryRecord>) => {
    const c = await getSalesforceConnection();
    // Assuming Custom Object exists
    return c.sobject(OBJECT_NAME).create(entry);
};

export const getTimeEntriesFromSalesforce = async (email: string) => {
    const c = await getSalesforceConnection();
    // Query
    const q = `SELECT Id, Date__c, Time_in__c, Time_Out__c, Duration_Hours__c, User_Email__c, Summary__c 
               FROM ${OBJECT_NAME} 
               WHERE User_Email__c = '${email}' 
               ORDER BY Date__c DESC, Time_in__c DESC LIMIT 100`;

    return c.query(q);
};

export const deleteTimeEntryFromSalesforce = async (id: string) => {
    const c = await getSalesforceConnection();
    return c.sobject(OBJECT_NAME).destroy(id);
};

export const getContactByEmail = async (email: string) => {
    const c = await getSalesforceConnection();
    // Query Contact by Email
    // Return Id and AccountId
    const q = `SELECT Id, AccountId FROM Contact WHERE Email = '${email}' LIMIT 1`;
    const res = await c.query(q);

    if (res.totalSize > 0) {
        return res.records[0] as { Id: string, AccountId?: string };
    }
    return null;
};
