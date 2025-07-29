"use client";

import { useState, useEffect } from 'react';
import { Subject, TimeSlot, TimetableEntry } from '@/types/timetable';

interface AddEntryModalProps {
  isOpen: boolean;
  slot: TimeSlot | null;
  subjects: Subject[];
  onClose: () => void;
  onAdd: (entry: Omit<TimetableEntry, 'id'>) => string[]; // Returns conflict messages
}

export default function AddEntryModal({ 
  isOpen, 
  slot, 
  subjects, 
  onClose, 
  onAdd 
}: AddEntryModalProps) {
  const [formState, setFormState] = useState<{
    subjectId: string;
    teacherId: string;
    roomId: string;
  }>({ subjectId: '', teacherId: '', roomId: '' });
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    if (slot && subjects.length > 0) {
      const firstSubject = subjects[0];
      setFormState({
        subjectId: firstSubject.id,
        teacherId: firstSubject.teacher || '',
        roomId: firstSubject.room || '',
      });
      setConflicts([]);
    }
  }, [slot, subjects]);

  if (!isOpen || !slot) {
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
  
  const handleAdd = () => {
    console.log('Add modal save clicked', { slot, formState });
    const newEntry = {
      subjectId: formState.subjectId,
      timeSlotId: slot.id,
      teacherId: formState.teacherId.trim() || undefined,
      roomId: formState.roomId.trim() || undefined,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime
    };
    
    console.log('Creating new entry:', newEntry);
    const addConflicts = onAdd(newEntry);
    console.log('Add conflicts received:', addConflicts);
    
    if (addConflicts.length > 0) {
      setConflicts(addConflicts);
    } else {
      console.log('No conflicts, closing modal');
      onClose();
    }
  };

  const subjectDetails = subjects.find(s => s.id === formState.subjectId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-2xl p-8 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-foreground">
            Add New Class
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-secondary transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {/* Slot Info */}
          <div className="text-center text-muted-foreground p-3 rounded-xl bg-secondary/30">
            {slot.day} • {slot.startTime} - {slot.endTime} ({slot.duration} minutes)
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Subject *</label>
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
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
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
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder={subjectDetails?.room || "Room Number"}
            />
          </div>
        </div>

        {/* Conflicts Display */}
        {conflicts.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <h4 className="font-semibold text-red-400 mb-2">Scheduling Conflicts</h4>
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
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-green-500/25 cursor-pointer"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Class
            </span>
          </button>
        </div>
      </div>
    </div>
  );
} 