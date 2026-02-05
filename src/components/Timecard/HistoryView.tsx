'use client';

import React, { useState, useMemo } from 'react';
import { Download, Search, Trash2, AlertCircle } from 'lucide-react';
import { formatDecimalHours } from '@/utils/formatTime';

interface TimeEntry {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  summary?: string;
  date: string;
  isLocked?: boolean; // Example of "completed" status
}

interface HistoryViewProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ entries, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'duration'>('recent');

  // Dashboard Metrics
  const totalHoursMonth = useMemo(() => {
    // Current month filter
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((acc, curr) => acc + curr.duration, 0);
  }, [entries]);

  // Filter & Sort
  const filteredEntries = useMemo(() => {
    let result = [...entries];
    
    if (searchTerm) {
      result = result.filter(e => 
        new Date(e.date).toLocaleDateString().includes(searchTerm) ||
        e.id.includes(searchTerm) // Fallback search
      );
    }
    
    if (sortOrder === 'recent') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      result.sort((a, b) => b.duration - a.duration);
    }
    
    return result;
  }, [entries, searchTerm, sortOrder]);


  const handleExport = () => {
    const headers = ['ID', 'Date', 'Start Time', 'End Time', 'Duration (ms)', 'Duration (hrs)'];
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(e => [
        e.id,
        new Date(e.date).toLocaleDateString(),
        new Date(e.startTime).toLocaleTimeString(),
        new Date(e.endTime).toLocaleTimeString(),
        e.duration,
        formatDecimalHours(e.duration)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'timecard_history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[600px] overflow-hidden">
      {/* Header / Dashboard */}
      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <div className="flex justify-between items-start mb-4">
             <div>
                <h2 className="text-xl font-bold text-gray-800">History</h2>
                <p className="text-sm text-gray-500">Manage your past timecards</p>
             </div>
             <div className="text-right">
                <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">This Month</div>
                <div className="text-3xl font-bold text-blue-600">
                    {formatDecimalHours(totalHoursMonth)} <span className="text-base font-normal text-gray-400">hrs</span>
                </div>
             </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search by date..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <select 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
            >
                <option value="recent">Most Recent</option>
                <option value="duration">Longest Duration</option>
            </select>

            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
            >
                <Download size={16} />
                Export
            </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEntries.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
                <p>No entries found.</p>
            </div>
        ) : (
            filteredEntries.map(entry => (
                <div key={entry.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-shadow hover:border-blue-100 gap-4 sm:gap-0">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-16 h-12 rounded-lg bg-blue-50 text-blue-600 flex flex-col items-center justify-center shrink-0 px-1">
                            <span className="font-bold text-lg leading-none">{formatDecimalHours(entry.duration)}</span>
                            <span className="text-[10px] font-medium uppercase text-blue-400">Hours</span>
                        </div>
                        <div>
                            <div className="font-medium text-gray-800">
                                {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
                            </div>
                            <div className="text-xs text-gray-500">
                                {new Date(entry.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'America/New_York'})} - 
                                {new Date(entry.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'America/New_York'})} EST
                            </div>
                            {entry.summary && (
                                <div className="text-sm text-gray-600 mt-1 italic">
                                    "{entry.summary}"
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                       <span className="text-sm font-mono text-gray-500 sm:hidden">{/* Mobile only duration detail */}
                            {formatDecimalHours(entry.duration) + ' hrs'}
                       </span>

                       <button 
                         onClick={() => onDelete(entry.id)}
                         className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" // Always visible on mobile
                         title="Delete Entry"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;
