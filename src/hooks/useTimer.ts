import { useState, useRef, useEffect, useCallback } from 'react';

export interface TimerState {
    isRunning: boolean;
    startTime: number | null;
    accumulatedTime: number; // Time in milliseconds
}

export const useTimer = (initialTime: number = 0) => {
    const [accumulatedTime, setAccumulatedTime] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Function to start the timer
    const start = useCallback(() => {
        if (isRunning) return;

        setIsRunning(true);
        startTimeRef.current = Date.now();

        intervalRef.current = setInterval(() => {
            // We don't rely on the interval for accuracy, just for UI updates
            // The actual time calculation happens on pause/stop or when needed
            // But for display, we add the delta
            setAccumulatedTime((prev) => {
                // Just force a re-render with "current" elapsed time? 
                // Actually, better strategy: 
                // We keep track of accumulatedTime (previously saved chunks)
                // And we calculate "current session duration" = Date.now() - startTimeRef.current
                return prev; // This logic is slightly improved below
            });
        }, 1000);
    }, [isRunning]);

    // Use a derived value for rendering
    const [displayTime, setDisplayTime] = useState(initialTime);

    useEffect(() => {
        let animationFrameId: number;

        const updateDisplay = () => {
            if (isRunning && startTimeRef.current) {
                const currentSession = Date.now() - startTimeRef.current;
                setDisplayTime(accumulatedTime + currentSession);
                animationFrameId = requestAnimationFrame(updateDisplay);
            } else {
                setDisplayTime(accumulatedTime);
            }
        };

        if (isRunning) {
            updateDisplay();
        } else {
            setDisplayTime(accumulatedTime);
            if (typeof window !== 'undefined') { // Check if window exists (client-side)
                cancelAnimationFrame(animationFrameId!);
            }
        }

        return () => {
            if (typeof window !== 'undefined') {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isRunning, accumulatedTime]);


    const stop = useCallback(() => {
        if (!isRunning || !startTimeRef.current) return;

        const endTime = Date.now();
        const sessionDuration = endTime - startTimeRef.current;

        setAccumulatedTime((prev) => prev + sessionDuration);
        setIsRunning(false);
        startTimeRef.current = null;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [isRunning]);

    const reset = useCallback(() => {
        setIsRunning(false);
        setAccumulatedTime(0);
        setDisplayTime(0);
        startTimeRef.current = null;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    return {
        displayTime,
        isRunning,
        start,
        stop,
        reset,
        setAccumulatedTime // In case we load from history
    };
};
