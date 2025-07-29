"use client";

import { useState, useEffect } from 'react';
import { Subject, TimetableEntry } from '@/types/timetable';

interface EditEntryModalProps {
  isOpen: boolean;
  entry: TimetableEntry | null;
  subjects: Subject[];
  onClose: () => void;
  onSave: (entryId: string, updates: Partial<TimetableEntry>) => string[]; // Returns conflict messages
  onDelete: (entryId: string) => void;
}

export default function EditEntryModal({ 
  isOpen, 
  entry, 
  subjects, 
  onClose, 
  onSave, 
  onDelete 
}: EditEntryModalProps) {
  const [formState, setFormState] = useState<{
    subjectId: string;
    teacherId: string;
    roomId: string;
  }>({ subjectId: '', teacherId: '', roomId: '' });
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    if (entry) {
      const subject = subjects.find(s => s.id === entry.subjectId);
      setFormState({
        subjectId: entry.subjectId,
        teacherId: entry.teacherId || subject?.teacher || '',
        roomId: entry.roomId || subject?.room || '',
      });
      setConflicts([]);
    }
  }, [entry, subjects]);

  if (!isOpen || !entry) {
    return null;
  }

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    setFormState({
      subjectId,
      teacherId: subject?.teacher || '',
      roomId: subject?.room || '',
    });
  };
  
  const handleSave = () => {
    console.log('Edit modal save clicked', { entryId: entry.id, formState });
    const updateConflicts = onSave(entry.id, {
      subjectId: formState.subjectId,
      teacherId: formState.teacherId.trim() || undefined,
      roomId: formState.roomId.trim() || undefined,
    });
    
    console.log('Edit conflicts received:', updateConflicts);
    
    if (updateConflicts.length > 0) {
      setConflicts(updateConflicts);
    } else {
      console.log('No conflicts, closing modal');
      onClose();
    }
  };

  const handleDelete = () => {
    console.log('Delete button clicked for entry:', entry.id);
    if (confirm('Are you sure you want to delete this class? This cannot be undone.')) {
      onDelete(entry.id);
      onClose();
    }
  };

  const subjectDetails = subjects.find(s => s.id === formState.subjectId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-2xl p-8 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-foreground">
            Edit Class
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors cursor-pointer">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {/* Slot Info */}
          <div className="text-center text-muted-foreground p-3 rounded-xl bg-secondary/30">
            {entry.day} • {entry.startTime} - {entry.endTime}
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
            <select
              value={formState.subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Teacher Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Teacher</label>
            <input
              type="text"
              value={formState.teacherId}
              onChange={(e) => setFormState({ ...formState, teacherId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border cursor-pointer"
              placeholder={subjectDetails?.teacher || "Teacher's Name"}
            />
          </div>

          {/* Room Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Room</label>
            <input
              type="text"
              value={formState.roomId}
              onChange={(e) => setFormState({ ...formState, roomId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border cursor-pointer"
              placeholder={subjectDetails?.room || "Room Number"}
            />
          </div>
        </div>

        {/* Conflicts Display */}
        {conflicts.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <h4 className="font-semibold text-red-400 mb-2">Update Conflicts</h4>
            <ul className="text-sm text-red-300 space-y-1 font-mono">
              {conflicts.map((conflict, index) => (
                <li key={index}>• {conflict}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleDelete}
            className="px-6 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            Delete Class
          </button>
          <button
            onClick={handleSave}
            className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
} 