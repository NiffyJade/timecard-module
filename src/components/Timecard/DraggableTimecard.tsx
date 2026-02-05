'use client';

import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable'; // react-draggable
import { X, Minus, Maximize2, Play, Square, Pause, ExternalLink, Calendar, Clock } from 'lucide-react';
import { clsx } from 'clsx';
// import { useTimer } from '@/hooks/useTimer';
import { useTimerContext } from '@/context/TimerContext';
import { formatDuration, formatDecimalHours } from '@/utils/formatTime';

interface TimeEntry {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  summary?: string;
  date: string;
}

interface DraggableTimecardProps {
  onSaveEntry: (entry: TimeEntry) => void;
}

const DraggableTimecard: React.FC<DraggableTimecardProps> = ({ onSaveEntry }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { displayTime, isRunning, start, stop, reset, togglePiP, isPiPActive } = useTimerContext();
  const [mounted, setMounted] = useState(false);

  const nodeRef = React.useRef(null);

  // Avoid hydration mismatch for Draggable
  useEffect(() => {
    setMounted(true);
  }, []);

  // Custom wrapper likely not needed if we stick to the UI buttons provided
  
  const [summary, setSummary] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Manual Entry State
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualStart, setManualStart] = useState('09:00');
  const [manualEnd, setManualEnd] = useState('17:00');

  const handleSave = () => {
    let entryDuration = displayTime;
    let entryStartTime = Date.now() - displayTime;
    let entryEndTime = Date.now();

    if (mode === 'manual') {
        const startDateTime = new Date(`${manualDate}T${manualStart}`);
        const endDateTime = new Date(`${manualDate}T${manualEnd}`);
        const diff = endDateTime.getTime() - startDateTime.getTime();

        if (isNaN(diff) || diff <= 0) {
            alert("Invalid time range. End time must be after start time.");
            return;
        }
        
        entryDuration = diff;
        entryStartTime = startDateTime.getTime();
        entryEndTime = endDateTime.getTime();
    } else {
        if (displayTime === 0) return;
    }
    
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      startTime: entryStartTime,
      endTime: entryEndTime,
      duration: entryDuration,
      summary: summary,
      date: new Date().toISOString()
    };
    
    onSaveEntry(entry);
    
    if (mode === 'timer') {
        reset();
    } else {
        // Optional: Reset manual fields or keep them? Keeping them might be easier for bulk entry.
        // Let's just clear summary.
    }
    setSummary(''); 
  };

  if (!mounted) return null;
  if (!isVisible) return null;

  // Render logic
  return (
    <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="body">
      <div ref={nodeRef} className={clsx(
        "fixed z-50 bg-white shadow-2xl rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 ease-in-out",
        isMinimized 
            ? "w-[280px] h-[60px]" // Minimized: wider to fit controls, fixed height
            : "w-[350px] resize-x min-w-[300px] max-w-[95vw]" 
      )} style={{ 
          top: '100px', 
          left: '20px',
          // Important: When minimized, force dimensions to override any user-resize
          width: isMinimized ? '280px' : undefined,
          height: isMinimized ? '60px' : 'auto' 
      }}>
        
        {/* Header */}
        <div className="drag-handle bg-gray-50/80 backdrop-blur p-3 flex items-center justify-between cursor-move select-none border-b border-gray-100">
          <div className="font-semibold text-gray-700 text-sm flex items-center gap-2">
            ⏱️ Timecard
            {isMinimized && <span className="text-xs text-blue-600 font-mono">{formatDuration(displayTime)}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={togglePiP}
              className={clsx(
                "p-1 hover:bg-gray-200 rounded text-gray-500",
                isPiPActive && "text-blue-600 bg-blue-50"
              )}
              title="Pop out timer (Picture-in-Picture)"
            >
              <ExternalLink size={14} />
            </button>
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-red-100 hover:text-red-500 rounded text-gray-500"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* content */}
        {!isMinimized && (
          <div className="p-6 flex flex-col items-center gap-6">
            
            {/* Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-full">
                <button
                    onClick={() => setMode('timer')}
                    className={clsx(
                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                        mode === 'timer' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    <Clock size={14} /> Timer
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={clsx(
                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                        mode === 'manual' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    <Calendar size={14} /> Manual
                </button>
            </div>

            {/* Timer Display (Only in Timer Mode) */}
            {mode === 'timer' && (
                <div className="text-center">
                <div className="text-5xl font-mono font-bold text-gray-800 tracking-wider">
                    {formatDuration(displayTime)}
                </div>
                <div className="text-sm text-gray-500 mt-1 font-medium">
                    {formatDecimalHours(displayTime)} hrs
                </div>
                </div>
            )}

            {/* Manual Inputs (Only in Manual Mode) */}
            {mode === 'manual' && (
                <div className="w-full space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                        <input 
                            type="date" 
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Start Time</label>
                            <input 
                                type="time" 
                                value={manualStart}
                                onChange={(e) => setManualStart(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">End Time</label>
                            <input 
                                type="time" 
                                value={manualEnd}
                                onChange={(e) => setManualEnd(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Input */}
            <div className="w-full">
                <input 
                    type="text" 
                    placeholder="What are you working on?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 w-full justify-center">
              {mode === 'timer' && (
                  !isRunning ? (
                    <button 
                    onClick={start}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95 w-full justify-center sm:w-auto"
                    >
                    <Play size={20} fill="currentColor" />
                    Start
                    </button>
                ) : (
                    <button 
                    onClick={stop}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95 w-full justify-center sm:w-auto"
                    >
                    <Pause size={20} fill="currentColor" />
                    Stop
                    </button>
                )
              )}
              
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center sm:w-auto"
                disabled={mode === 'timer' ? (displayTime < 1000 || isRunning) : false} 
                title={isRunning ? "Stop timer first" : "Save Entry"}
              >
                <Square size={20} fill="currentColor" />
                Save
              </button>
            </div>
            
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default DraggableTimecard;
