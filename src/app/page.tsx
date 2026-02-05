'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import DraggableTimecard from '@/components/Timecard/DraggableTimecard';
import HistoryView from '@/components/Timecard/HistoryView';
import { formatReadableDuration } from '@/utils/formatTime';
import { CheckCircle, X, Loader2 } from 'lucide-react';
import { useTimerContext } from '@/context/TimerContext';

interface TimeEntry {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  summary?: string;
  date: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<{name: string, duration: string} | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasAutoStarted = React.useRef(false);

  const { start, isRunning, isIdlePopupOpen, setIsIdlePopupOpen } = useTimerContext();

  // Fetch entries from API
  const fetchEntries = useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    try {
        const res = await fetch('/api/time-entries');
        if (res.ok) {
            const data = await res.json();
            setEntries(data);
        }
    } catch (err) {
        console.error("Failed to fetch entries", err);
    } finally {
        setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
        fetchEntries();
        // Auto-start timer if not running and hasn't auto-started yet
        if (!hasAutoStarted.current && !isRunning) {
            start();
            hasAutoStarted.current = true;
        }
    }
  }, [status, fetchEntries, isRunning, start]);

  // Handle Sign Out Delay
  useEffect(() => {
    if (isSigningOut && status === 'unauthenticated') {
        const timer = setTimeout(() => {
            setIsSigningOut(false);
            window.location.reload(); // Refresh to clean state completely
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [status, isSigningOut]);

  const handleSaveEntry = async (entry: TimeEntry) => {
    // Optimistic update
    const previous = [...entries];
    setEntries(prev => [entry, ...prev]);

    try {
        const res = await fetch('/api/time-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        
        if (!res.ok) throw new Error('Failed to save');
        
        // Show Success Modal
        const firstName = session?.user?.name?.split(' ')[0] || 'User';
        setLastSaved({
            name: firstName,
            duration: formatReadableDuration(entry.duration)
        });
        setShowModal(true);

        // Could refresh from server to get real ID if needed, but for now we trust the flow
        fetchEntries(); 
    } catch (err) {
        console.error(err);
        alert("Failed to save entry to backend");
        setEntries(previous); // Rollback
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    
    const previous = [...entries];
    setEntries(prev => prev.filter(e => e.id !== id));

    try {
         const res = await fetch(`/api/time-entries?id=${id}`, { method: 'DELETE' });
         if (!res.ok) throw new Error('Delete failed');
    } catch (err) {
        console.error(err);
        alert("Failed to delete entry from backend");
        setEntries(previous);
    }
  };

  if (status === 'loading' || isSigningOut) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center animate-pulse">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-8">
                    Timecard<span className="font-light text-gray-400">App</span>
                </h1>
            </div>
            <div className="flex items-center gap-3 text-blue-600">
                <Loader2 className="animate-spin" size={24} />
                <span className="font-medium text-gray-600">
                    {isSigningOut ? 'Signing out...' : 'Preparing your workspace...'}
                </span>
            </div>
        </div>
      );
  }

  if (status === 'unauthenticated') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
              <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                  <h1 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      A Free Bird TimeCard
                  </h1>
                  <p className="text-gray-500 mb-6">Please sign in to track your hours.</p>
                  <button 
                    onClick={() => signIn('google')}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Sign in with Google</span>
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      
      {/* Background UI to show Draggable context */}
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Timecard<span className="font-light text-gray-400">App</span>
            </h1>
            <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700 font-medium hidden sm:block">
                    {session?.user?.name || session?.user?.email}
                </div>
                {session?.user?.image ? (
                    <img 
                        src={session.user.image} 
                        alt="User" 
                        className="w-8 h-8 rounded-full border border-gray-200" 
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-200">
                        {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
                    </div>
                )}
                <button 
                    onClick={() => {
                        setIsSigningOut(true);
                        signOut({ redirect: false });
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                    Sign Out
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid lg:grid-cols-3 gap-8 pb-24 sm:pb-8">
        
        {/* Left Column: Context / Instructions */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Drag the Timecard window anywhere.</li>
                    <li>• Use Minimize to keep it in view while multitasking.</li>
                    <li>• Click Save to automatically log your hours.</li>
                </ul>
            </div>
            
            <div className="p-4 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm">
                <strong>Connected:</strong> Your time entries are securely saved to Salesforce.
            </div>
        </div>

        {/* Right Column: History & Main Content */}
        <div className="lg:col-span-2">
            {loading ? (
                <div className="p-10 text-center text-gray-400">Loading history...</div>
            ) : (
                <HistoryView entries={entries} onDelete={handleDeleteEntry} />
            )}
        </div>

      </main>

      {/* The Draggable Component exists at root level (visually) but logic flows here */}
      <DraggableTimecard onSaveEntry={handleSaveEntry} />

      {/* Success Modal */}
      {showModal && lastSaved && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600 animate-scale-up">
                        <CheckCircle size={32} strokeWidth={2.5} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Time card for {lastSaved.name}
                    </h3>
                    
                    <p className="text-gray-600 mb-6">
                        Time card submitted successfully!<br/>
                        <span className="font-medium text-gray-900 mt-2 block">
                            Total Hours: {lastSaved.duration}
                        </span>
                    </p>
                    
                    <button 
                        onClick={() => setShowModal(false)}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* Inactivity Modal */}
      {isIdlePopupOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200 border-l-4 border-orange-500">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600 animate-pulse">
                        <Loader2 size={32} strokeWidth={2.5} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Are you still there?
                    </h3>
                    
                    <p className="text-gray-600 mb-6">
                        Timer paused due to inactivity.
                    </p>
                    
                    <button 
                        onClick={() => {
                            start(); // Resume timer
                            setIsIdlePopupOpen(false);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                         Resume Session
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
