"use client";

import { useState } from 'react';
import { Subject } from '@/types/timetable';

interface SubjectFormProps {
  onAddSubject: (subject: Subject) => void;
  onRemoveSubject: (id: string) => void;
  subjects: Subject[];
}

export default function SubjectForm({ onAddSubject, onRemoveSubject, subjects }: SubjectFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    duration: 60,
    frequency: 1,
    teacher: '',
    room: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const subject: Subject = {
      id: `subject-${Date.now()}`,
      name: formData.name.trim(),
      duration: formData.duration,
      frequency: formData.frequency,
      teacher: formData.teacher.trim() || undefined,
      room: formData.room.trim() || undefined
    };

    onAddSubject(subject);
    setFormData({
      name: '',
      duration: 60,
      frequency: 1,
      teacher: '',
      room: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Add Subject Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Subject Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="e.g., Mathematics"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              min="30"
              max="180"
              step="15"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Frequency (per week)
            </label>
            <input
              type="number"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              min="1"
              max="7"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Teacher (optional)
            </label>
            <input
              type="text"
              value={formData.teacher}
              onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="Teacher name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Room (optional)
            </label>
            <input
              type="text"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="Room number"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600/80 to-purple-600/80 px-6 py-3 font-medium text-white transition-all duration-300 hover:from-blue-600 hover:to-purple-600 hover:shadow-lg hover:shadow-blue-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 translate-x-full transition-transform duration-300 group-hover:translate-x-0"></div>
          <span className="relative z-10 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Subject
          </span>
        </button>
      </form>

      {/* Subject List */}
      {subjects.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Added Subjects ({subjects.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="group flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <h4 className="font-medium text-foreground">{subject.name}</h4>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400">
                        {subject.duration}min
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400">
                        {subject.frequency}x/week
                      </span>
                      {subject.teacher && (
                        <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400">
                          {subject.teacher}
                        </span>
                      )}
                      {subject.room && (
                        <span className="px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400">
                          {subject.room}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveSubject(subject.id)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 