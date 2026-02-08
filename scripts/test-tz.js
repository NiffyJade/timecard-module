
const testTimezoneFix = () => {
    const tz = 'America/New_York';
    
    // Sample "Wall Clock" time we expect from Salesforce
    const dateStr = '2026-02-08';
    const timeStr = '15:05:01.000'; // 3:05:01 PM EST
    const isoStr = `${dateStr}T${timeStr}`;

    // Helper logic from route.ts
    const getEpochFromWallClock = (dtStr, tz) => {
        const tempDate = new Date(dtStr);
        console.log('  [Debug] Initial parse (local):', tempDate.toISOString());
        
        // Parts: [month, day, year, hour, minute, second]
        const estStrLong = tempDate.toLocaleString('en-US', { timeZone: tz, hour12: false });
        console.log('  [Debug] EST Wall Clock String:', estStrLong);
        
        const parts = estStrLong.split(/[/, :]+/);
        console.log('  [Debug] Split Parts:', parts);
        
        const m = parts[0].padStart(2, '0');
        const d = parts[1].padStart(2, '0');
        const y = parts[2];
        const h = parts[3].padStart(2, '0');
        const min = parts[4].padStart(2, '0');
        const s = parts[5].padStart(2, '0');
        
        const estDate = new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
        console.log('  [Debug] Reconstructed EST Date (UTC):', estDate.toISOString());
        
        const diff = tempDate.getTime() - estDate.getTime();
        console.log('  [Debug] Diff (ms):', diff);
        
        return tempDate.getTime() + diff;
    };

    const epochValue = getEpochFromWallClock(isoStr, tz);
    const resultDate = new Date(epochValue);
    
    console.log('\n--- RESULTS ---');
    console.log('Input Wall Clock:', isoStr);
    console.log('Computed Epoch:', epochValue);
    console.log('Result in UTC:', resultDate.toUTCString());
    console.log('Result in EST:', resultDate.toLocaleString('en-US', { timeZone: tz }));

    // Verify
    const finalEst = resultDate.toLocaleString('en-US', { timeZone: tz, hour12: false });
    if (finalEst.includes('15:05:01')) {
        console.log('✅ SUCCESS: Epoch correctly represents 15:05:01 EST');
    } else {
        console.log('❌ FAILURE: Resulting time is incorrect');
    }
};

testTimezoneFix();
