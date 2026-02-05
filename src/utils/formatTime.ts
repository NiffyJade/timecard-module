/**
 * Format milliseconds into HH:MM:SS
 */
export const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Convert milliseconds to decimal hours, rounded to 2 decimal places.
 * Example: 30 min -> 0.50
 */
export const formatDecimalHours = (milliseconds: number): string => {
    const hours = milliseconds / (1000 * 60 * 60);
    // Round to 2 decimal places then convert to number to drop trailing zeros (e.g. "5.00" -> 5)
    return parseFloat((Math.round(hours * 100) / 100).toFixed(2)).toString();
};

/**
 * Format milliseconds into readable string, e.g. "1mins 19secs"
 * Omit hours if 0.
 */
export const formatReadableDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (hours > 0) parts.push(`${hours}hrs`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}mins`);
    parts.push(`${seconds}secs`);

    return parts.join(' ');
};
