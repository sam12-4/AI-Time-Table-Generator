"use client";

import { useEffect, useState } from 'react';
import { SavedTimetable } from '@/lib/mongodb';
import { generateTimetablePDF } from '@/lib/pdf-generator';

interface SavedTimetablesProps {
  onLoadTimetable: (timetable: SavedTimetable) => void;
  onDeleteTimetable: (id: string) => Promise<boolean>;
  triggerReload: number;
}

export default function SavedTimetables({ onLoadTimetable, onDeleteTimetable, triggerReload }: SavedTimetablesProps) {
  const [savedTimetables, setSavedTimetables] = useState<SavedTimetable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimetables = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/timetables');
        if (!response.ok) {
          throw new Error('Failed to connect to the database. Is MongoDB running?');
        }
        const result = await response.json();
        if (result.success) {
          setSavedTimetables(result.data);
        } else {
          throw new Error(result.error || 'Failed to load timetables.');
        }
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetables();
  }, [triggerReload]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the timetable "${name}"? This action cannot be undone.`)) {
      const success = await onDeleteTimetable(id);
      if (success) {
        setSavedTimetables(savedTimetables.filter(t => t._id !== id));
      }
    }
  };

  const handleDownloadPDF = async (timetable: SavedTimetable) => {
    try {
      setDownloadingId(timetable._id.toString());
      
      // Generate and download the PDF
      generateTimetablePDF(timetable);
      
      // Small delay to show the loading state
      setTimeout(() => {
        setDownloadingId(null);
      }, 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setDownloadingId(null);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="glass-morphism rounded-2xl p-8">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        Saved Timetables
      </h2>

      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <p><strong>Error:</strong> {error}</p>
          <p className="text-sm mt-2">Please ensure your MongoDB server is running and accessible at `mongodb://localhost:27017`.</p>
        </div>
      )}

      {!isLoading && !error && savedTimetables.length === 0 && (
        <div className="text-center text-muted-foreground p-8">
          No saved timetables found.
        </div>
      )}

      {!isLoading && !error && savedTimetables.length > 0 && (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {savedTimetables.map((timetable) => (
            <div key={timetable._id.toString()} className="group p-4 rounded-xl bg-secondary/30 border border-border hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-emerald-400">{timetable.name}</h3>
                  <p className="text-sm text-muted-foreground">{timetable.description || 'No description'}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onLoadTimetable(timetable)}
                    className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm transition-colors cursor-pointer"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(timetable)}
                    disabled={downloadingId === timetable._id.toString()}
                    className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    {downloadingId === timetable._id.toString() ? (
                      <>
                        <div className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                        PDF
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(timetable._id.toString(), timetable.name)}
                    className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground grid grid-cols-3 gap-2">
                <div>
                  <span className="font-medium text-foreground">{timetable.metadata.totalSubjects}</span> Subjects
                </div>
                <div>
                  <span className="font-medium text-foreground">{timetable.metadata.completionRate.toFixed(1)}%</span> Complete
                </div>
                <div>
                  <span className="font-medium text-foreground">{timetable.metadata.conflictCount}</span> Conflicts
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Saved on: {new Date(timetable.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Download Info */}
      {!isLoading && !error && savedTimetables.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-purple-400">PDF Download</span>
          </div>
          <p className="text-xs text-purple-300">
            Click the PDF button to download a professional academic timetable in PDF format. 
            Perfect for printing and sharing with university/college administration.
          </p>
        </div>
      )}
    </div>
  );
} 