import fs from 'fs';
import path from 'path';

// Define the shape of our data
export interface MockTimeEntry {
    id: string;
    startTime: string; // ISO
    endTime: string; // ISO
    duration: string; // Readable string "1mins 30secs"
    durationMs: number; // Numeric milliseconds for calculation
    summary?: string; // Optional work summary
    userEmail: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'time-entries.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

export const getMockEntries = async (email: string) => {
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const entries: any[] = JSON.parse(fileContent); // Use any to handle migration

        // Filter by user email and sort by start time desc
        return entries
            .filter(e => e.userEmail === email)
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .map(e => ({
                ...e,
                // Ensure durationMs exists for old entries
                durationMs: e.durationMs || (typeof e.duration === 'number' ? e.duration : 0),
                // Ensure duration string exists
                duration: typeof e.duration === 'string' ? e.duration : '0secs'
            })) as MockTimeEntry[];

    } catch (error) {
        console.error('MockDB Read Error:', error);
        return [];
    }
};

export const saveMockEntry = async (entry: Omit<MockTimeEntry, 'id'>) => {
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const entries: MockTimeEntry[] = JSON.parse(fileContent);

        const newEntry: MockTimeEntry = {
            ...entry,
            id: Math.random().toString(36).substring(2, 15) // Simple random ID
        };

        entries.push(newEntry);
        fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));

        return { success: true, id: newEntry.id };
    } catch (error) {
        console.error('MockDB Write Error:', error);
        return { success: false, error };
    }
};

export const deleteMockEntry = async (id: string) => {
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        let entries: MockTimeEntry[] = JSON.parse(fileContent);

        entries = entries.filter(e => e.id !== id);

        fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
        return { success: true };
    } catch (error) {
        console.error('MockDB Delete Error:', error);
        return { success: false, error };
    }
};
