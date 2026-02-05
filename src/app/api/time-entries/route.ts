import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveTimeEntryToSalesforce, getTimeEntriesFromSalesforce, deleteTimeEntryFromSalesforce } from '@/lib/salesforce';
// import { saveMockEntry, getMockEntries, deleteMockEntry } from '@/lib/mock-db';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result: any = await getTimeEntriesFromSalesforce(session.user.email);
        const entries = result.records || [];

        // Map Salesforce format back to App format
        const mapped = entries.map((r: any) => ({
            id: r.Id,
            startTime: new Date(r.Start_Time__c).getTime(),
            endTime: new Date(r.End_Time__c).getTime(),
            // Salesforce stores Hours (e.g. 1.5), App uses ms. 
            // 1.5 hrs * 60 min * 60 sec * 1000 ms = ms
            duration: (r.Duration_Hours__c || 0) * 3600000,
            summary: r.Summary__c || '',
            date: r.Start_Time__c,
            userEmail: r.User_Email__c
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error("API GET Error:", error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { startTime, endTime, duration, summary } = body;

        // Create a descriptive name: "email - YYYY-MM-DD HH:mm" (EST)
        const dateStr = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/New_York'
        }).format(new Date(startTime));

        // Format from "MM/DD/YYYY, HH:mm" to "YYYY-MM-DD HH:mm" for sorting/readability if desired, 
        // or just keep standard US format. Let's use standard ISO-like for sorting:
        // Actually Intl output is "02/04/2026, 10:30"
        // Let's keep it simple or parse it. 
        // Providing a cleaner format:
        const estDate = new Date(startTime).toLocaleString('en-US', { timeZone: 'America/New_York' });
        const nameToUse = session.user.name || session.user.email;
        const entryName = `${nameToUse} - ${estDate} EST`;

        // Save to Salesforce
        // Convert duration (ms) to Hours (e.g. 1.5)
        // ms / 1000 / 60 / 60
        const durationHours = duration / 3600000;

        const sfEntry = {
            Name: entryName,
            Start_Time__c: new Date(startTime).toISOString(),
            End_Time__c: new Date(endTime).toISOString(),
            Duration_Hours__c: parseFloat(durationHours.toFixed(2)), // Round to 2 decimals
            Summary__c: summary || '',
            User_Email__c: session.user.email
        };

        const res: any = await saveTimeEntryToSalesforce(sfEntry);

        if (!res.success) {
            throw new Error('Salesforce create failed: ' + JSON.stringify(res.errors));
        }

        return NextResponse.json({ success: true, id: res.id });
    } catch (error: any) {
        console.error("API POST Error:", error);
        return NextResponse.json({ error: 'Failed to save', details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse ID from URL query params
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        await deleteTimeEntryFromSalesforce(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API DELETE Error:", error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
