"use client";

import { useState } from 'react';
import { Subject, CSP_CONSTRAINTS } from '@/types/timetable';

interface SubjectFormProps {
  onAddSubject: (subject: Subject) => void;
  onRemoveSubject: (id: string) => void;
  subjects: Subject[];
}

export default function SubjectForm({ onAddSubject, onRemoveSubject, subjects }: SubjectFormProps) {
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    duration: 50,
    frequency: 1,
    teacher: '',
    room: ''
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Comprehensive validation function
  const validateSubject = (): string[] => {
    const validationErrors: string[] = [];

    // Name validation
    if (!subjectForm.name.trim()) {
      validationErrors.push('Subject name is required');
    } else if (subjectForm.name.trim().length < 2) {
      validationErrors.push('Subject name must be at least 2 characters');
    } else if (subjects.some(s => s.name.toLowerCase() === subjectForm.name.trim().toLowerCase())) {
      validationErrors.push('Subject name already exists');
    }

    // Teacher validation
    if (!subjectForm.teacher.trim()) {
      validationErrors.push('Teacher name is required');
    } else if (subjectForm.teacher.trim().length < 2) {
      validationErrors.push('Teacher name must be at least 2 characters');
    }

    // Duration validation
    if (subjectForm.duration < CSP_CONSTRAINTS.MIN_SUBJECT_DURATION) {
      validationErrors.push(`Duration must be at least ${CSP_CONSTRAINTS.MIN_SUBJECT_DURATION} minutes`);
    } else if (subjectForm.duration > CSP_CONSTRAINTS.MAX_SUBJECT_DURATION) {
      validationErrors.push(`Duration cannot exceed ${CSP_CONSTRAINTS.MAX_SUBJECT_DURATION} minutes`);
    }

    // Frequency validation
    if (subjectForm.frequency < CSP_CONSTRAINTS.MIN_FREQUENCY) {
      validationErrors.push(`Frequency must be at least ${CSP_CONSTRAINTS.MIN_FREQUENCY}`);
    } else if (subjectForm.frequency > CSP_CONSTRAINTS.MAX_FREQUENCY) {
      validationErrors.push(`Frequency cannot exceed ${CSP_CONSTRAINTS.MAX_FREQUENCY}`);
    }

    // Teacher workload validation
    const teacherName = subjectForm.teacher.trim();
    const existingTeacherLoad = subjects
      .filter(s => s.teacher.toLowerCase() === teacherName.toLowerCase())
      .reduce((sum, s) => sum + s.frequency, 0);
    
    if (existingTeacherLoad + subjectForm.frequency > CSP_CONSTRAINTS.MAX_TEACHER_SLOTS_PER_WEEK) {
      validationErrors.push(`Teacher "${teacherName}" would exceed ${CSP_CONSTRAINTS.MAX_TEACHER_SLOTS_PER_WEEK} slots/week limit (currently has ${existingTeacherLoad}, adding ${subjectForm.frequency})`);
    }

    return validationErrors;
  };

  const handleAddSubject = () => {
    const validationErrors = validateSubject();
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const subject: Subject = {
      id: `subject-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: subjectForm.name.trim(),
      duration: subjectForm.duration,
      frequency: subjectForm.frequency,
      teacher: subjectForm.teacher.trim(),
      room: subjectForm.room.trim() || undefined
    };

    onAddSubject(subject);
    
    // Reset form
    setSubjectForm({
      name: '',
      duration: 50,
      frequency: 1,
      teacher: '',
      room: ''
    });
    setErrors([]);
  };

  // Real-time validation on form changes
  const handleFormChange = (field: string, value: any) => {
    setSubjectForm(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Subject Name *
          </label>
          <input
            type="text"
            value={subjectForm.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="e.g., Discrete Mathematics, Quantum Computing"
            className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Teacher Name *
          </label>
          <input
            type="text"
            value={subjectForm.teacher}
            onChange={(e) => handleFormChange('teacher', e.target.value)}
            placeholder="e.g., Dr. Shahab, Dr. Ali"
            className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={subjectForm.duration}
            onChange={(e) => handleFormChange('duration', parseInt(e.target.value) || 50)}
            min={CSP_CONSTRAINTS.MIN_SUBJECT_DURATION}
            max={CSP_CONSTRAINTS.MAX_SUBJECT_DURATION}
            step="10"
            className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1">Standard: 50 minutes</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Frequency (per week)
          </label>
          <input
            type="number"
            value={subjectForm.frequency}
            onChange={(e) => handleFormChange('frequency', parseInt(e.target.value) || 1)}
            min={CSP_CONSTRAINTS.MIN_FREQUENCY}
            max={CSP_CONSTRAINTS.MAX_FREQUENCY}
            className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1">Max 3 per teacher (CSP constraint)</p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-2">
            Room (optional)
          </label>
          <input
            type="text"
            value={subjectForm.room}
            onChange={(e) => handleFormChange('room', e.target.value)}
            placeholder="e.g., Room 101, Lab A, Auditorium"
            className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <h4 className="font-semibold text-red-400 mb-2">Please fix the following errors:</h4>
          <ul className="text-sm text-red-300 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleAddSubject}
        className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-purple-600 hover:bg-gradient-to-r hover:from-blue-700 hover:to-purple-700"
      >
        Add Subject
      </button>

      {/* Subject List */}
      {subjects.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Added Subjects ({subjects.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex-1">
                  <div className="font-medium text-foreground">{subject.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Teacher: {subject.teacher} • {subject.duration}min • {subject.frequency}x/week
                    {subject.room && ` • Room: ${subject.room}`}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveSubject(subject.id)}
                  className="ml-3 px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Teacher Workload Summary */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <h4 className="font-medium text-blue-400 mb-2">Teacher Workload Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {Array.from(new Set(subjects.map(s => s.teacher))).map(teacher => {
                const load = subjects.filter(s => s.teacher === teacher).reduce((sum, s) => sum + s.frequency, 0);
                const isOverload = load > CSP_CONSTRAINTS.MAX_TEACHER_SLOTS_PER_WEEK;
                const isMaxLoad = load === CSP_CONSTRAINTS.MAX_TEACHER_SLOTS_PER_WEEK;
                
                return (
                  <div key={teacher} className={`flex justify-between ${isOverload ? 'text-red-400' : isMaxLoad ? 'text-yellow-400' : 'text-blue-300'}`}>
                    <span>{teacher}:</span>
                    <span>{load}/{CSP_CONSTRAINTS.MAX_TEACHER_SLOTS_PER_WEEK} slots</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 