'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/utils/formatTime';

interface TimerContextType {
  displayTime: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  togglePiP: () => Promise<void>;
  isPiPActive: boolean;
  isIdlePopupOpen: boolean;
  setIsIdlePopupOpen: (open: boolean) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const timer = useTimer();
  const [isPiPActive, setIsPiPActive] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize hidden elements for PiP
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    canvasRef.current = canvas;

    // Create Video
    const video = document.createElement('video');
    video.muted = true;
    video.style.position = 'absolute';
    video.style.top = '-9999px'; // Hide visually but keep in layout/DOM
    video.style.left = '-9999px';
    document.body.appendChild(video);
    videoRef.current = video;

    return () => {
        // Cleanup
        if (document.body.contains(video)) {
            document.body.removeChild(video);
        }
    };
  }, []);

  // Draw to canvas loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const draw = () => {
      // Clear with dark blue-slate background
      ctx.fillStyle = '#0f172a'; 
      ctx.fillRect(0, 0, 300, 150);

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const timeStr = formatDuration(timer.displayTime);
      ctx.fillText(timeStr, 150, 75);

       // Status text
       ctx.font = 'bold 16px sans-serif';
       ctx.fillStyle = timer.isRunning ? '#4ade80' : '#fbbf24'; // Green or Amber
       ctx.fillText(timer.isRunning ? "RUNNING" : "PAUSED", 150, 115);

      if (isPiPActive) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    if (isPiPActive) {
      draw();
    } else {
        // Draw once even if not active so it's ready
        draw();
        cancelAnimationFrame(animationFrame!);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [timer.displayTime, timer.isRunning, isPiPActive]);

  const togglePiP = async () => {
    if (isPiPActive && document.pictureInPictureElement) {
      // Exit PiP
      await document.exitPictureInPicture();
      // State updated via event listener
    } else {
      // Enter PiP
      try {
        if (!canvasRef.current || !videoRef.current) return;

        // Ensure canvas has content before capturing
        const stream = canvasRef.current.captureStream(30); // 30 FPS
        videoRef.current.srcObject = stream;
        
        // Must play video to get frames
        await videoRef.current.play();

        // Request PiP
        await videoRef.current.requestPictureInPicture();
        // State updated via event listener

      } catch (err: any) {
        console.error("Failed to enter PiP mode:", err);
        // alert(`PiP Failed: ${err.message}`);
      }
    }
  };

  // Inactivity Logic
  const [isIdlePopupOpen, setIsIdlePopupOpen] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes
  const POPUP_TIMEOUT = 3 * 60 * 1000; // 3 minutes

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (popupDismissTimerRef.current) clearTimeout(popupDismissTimerRef.current);
    
    // Only set idle timer if timer is currently running and popup is NOT open
    if (timer.isRunning && !isIdlePopupOpen) {
        idleTimerRef.current = setTimeout(() => {
            // Inactivity Detected
            timer.stop(); // Pause timer
            setIsIdlePopupOpen(true); // Show popup
        }, IDLE_TIMEOUT);
    }
  }, [timer.isRunning, isIdlePopupOpen, timer.stop]);

  // Listen for user activity
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // Initial start
    resetIdleTimer();

    return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (popupDismissTimerRef.current) clearTimeout(popupDismissTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Auto-dismiss popup after timeout
  useEffect(() => {
    if (isIdlePopupOpen) {
        popupDismissTimerRef.current = setTimeout(() => {
            setIsIdlePopupOpen(false); // Close popup, timer stays paused
        }, POPUP_TIMEOUT);
    }
    return () => {
        if (popupDismissTimerRef.current) clearTimeout(popupDismissTimerRef.current);
    };
  }, [isIdlePopupOpen]);

  return (
    <TimerContext.Provider value={{ ...timer, togglePiP, isPiPActive, isIdlePopupOpen, setIsIdlePopupOpen }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimerContext = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
};
