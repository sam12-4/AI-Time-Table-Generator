"use client";

import { useState } from 'react';
import { Subject, TimeSlot, GeneratedTimetable, TimetableEntry } from '@/types/timetable';
import EditEntryModal from './EditEntryModal';
import AddEntryModal from './AddEntryModal';

interface TimetableGridProps {
  timetable: GeneratedTimetable;
  subjects: Subject[];
  timeSlots: TimeSlot[];
  onUpdateEntry?: (entryId: string, updates: Partial<TimetableEntry>) => string[];
  onDeleteEntry?: (entryId: string) => void;
  onAddEntry?: (entry: Omit<TimetableEntry, 'id'>) => string[];
}



export default function TimetableGrid({ 
  timetable, 
  subjects, 
  timeSlots, 
  onUpdateEntry, 
  onDeleteEntry, 
  onAddEntry 
}: TimetableGridProps) {
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [addingToSlot, setAddingToSlot] = useState<TimeSlot | null>(null);
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Get unique time periods from time slots
  const timePeriods = Array.from(
    new Set(timeSlots.map(slot => `${slot.startTime}-${slot.endTime}`))
  ).sort();

  // Create a map of entries for quick lookup
  const entryMap = new Map();
  timetable.entries.forEach(entry => {
    const key = `${entry.day}-${entry.startTime}-${entry.endTime}`;
    entryMap.set(key, entry);
  });

  // Get subject details by ID
  const getSubject = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId);
  };

  // Color scheme for different subjects
  const subjectColors = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-green-500/20 text-green-400 border-green-500/30',
    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'bg-red-500/20 text-red-400 border-red-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ];

  const getSubjectColor = (subjectId: string) => {
    const index = subjects.findIndex(s => s.id === subjectId);
    return subjectColors[index % subjectColors.length];
  };

  // Filter days that have time slots
  const activeDays = days.filter(day => 
    timeSlots.some(slot => slot.day === day)
  );

  // Handle edit entry
  const handleEditEntry = (entry: TimetableEntry) => {
    console.log('Opening edit modal for entry:', entry);
    setEditingEntry(entry);
  };

  // Handle save edit
  const handleSaveEdit = (entryId: string, updates: Partial<TimetableEntry>): string[] => {
    console.log('Saving edit for entry:', entryId, 'Updates:', updates);
    if (onUpdateEntry) {
      const conflicts = onUpdateEntry(entryId, updates);
      console.log('Update conflicts:', conflicts);
      return conflicts;
    }
    return [];
  };

  // Handle delete entry
  const handleDeleteEntry = (entryId: string) => {
    console.log('Deleting entry:', entryId);
    if (onDeleteEntry) {
      onDeleteEntry(entryId);
    }
  };

  // Handle add entry to empty slot
  const handleAddEntry = (slot: TimeSlot) => {
    console.log('Opening add modal for slot:', slot);
    setAddingToSlot(slot);
  };

  // Handle adding new entry from modal
  const handleAddNewEntry = (entry: Omit<TimetableEntry, 'id'>): string[] => {
    console.log('Adding new entry:', entry);
    if (onAddEntry) {
      const conflicts = onAddEntry(entry);
      console.log('Add conflicts:', conflicts);
      return conflicts;
    }
    return [];
  };

  // Check for conflicts when editing
  // This logic now lives in `app/page.tsx` and is passed down.

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{timetable.entries.length}</div>
          <div className="text-sm text-blue-300">Classes Scheduled</div>
        </div>
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{subjects.length}</div>
          <div className="text-sm text-green-300">Total Subjects</div>
        </div>
        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <div className="text-2xl font-bold text-purple-400">{activeDays.length}</div>
          <div className="text-sm text-purple-300">Active Days</div>
        </div>
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">{timetable.conflicts.length}</div>
          <div className="text-sm text-yellow-300">Conflicts</div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]"> {/* Ensure minimum width for horizontal scroll */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left font-medium text-muted-foreground border-b border-border min-w-[120px] sticky left-0  z-10">
                  Time
                </th>
                {activeDays.map(day => (
                  <th
                    key={day}
                    className="p-3 text-center font-medium text-foreground border-b border-border min-w-[200px]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timePeriods.map(period => {
                const [startTime, endTime] = period.split('-');
                return (
                  <tr key={period} className="border-b border-border/50">
                    <td className="p-3 text-sm text-muted-foreground font-medium bg-secondary/20 sticky left-0 z-10">
                      <div className="text-foreground">{startTime}</div>
                      <div className="text-xs">{endTime}</div>
                    </td>
                    {activeDays.map(day => {
                      const key = `${day}-${startTime}-${endTime}`;
                      const entry = entryMap.get(key);
                      const subject = entry ? getSubject(entry.subjectId) : null;

                      return (
                        <td key={`${day}-${period}`} className="p-2 min-w-[200px]">
                          {entry && subject ? (
                            // Filled Slot - Click to Edit
                            <div
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Clicked filled slot:', entry);
                                handleEditEntry(entry);
                              }}
                              className={`group relative p-3 rounded-lg border text-center transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm hover:shadow-md ${getSubjectColor(
                                entry.subjectId
                              )}`}
                              title="Click to edit this class"
                            >
                              <div className="font-medium text-sm">{subject.name}</div>
                              {entry.teacherId && (
                                <div className="text-xs opacity-80 mt-1">
                                  👨‍🏫 {entry.teacherId}
                                </div>
                              )}
                              {entry.roomId && (
                                <div className="text-xs opacity-80">
                                  🏫 {entry.roomId}
                                </div>
                              )}
                              <div className="text-xs opacity-60 mt-1">
                                {subject.duration}min
                              </div>
                              
                              {/* Edit indicator - appears on hover */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-5 h-5 rounded bg-blue-500 text-white text-xs flex items-center justify-center shadow-lg" title="Click to edit">
                                  ✎
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Empty Slot - Click to Add
                            <div 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const slot = timeSlots.find(s => s.startTime === startTime && s.endTime === endTime && s.day === day);
                                console.log('Clicked empty slot:', slot);
                                if (slot && subjects.length > 0) {
                                  handleAddEntry(slot);
                                } else if (subjects.length === 0) {
                                  alert('Please add subjects first before scheduling classes.');
                                }
                              }}
                              className="h-20 rounded-lg border border-dashed border-border/30 flex items-center justify-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group relative"
                              title="Click to add a new class"
                            >
                              <span className="text-xs text-muted-foreground group-hover:text-blue-400 transition-colors">Click to add class</span>
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <span className="text-blue-400 text-xl">+</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EditEntryModal 
        isOpen={!!editingEntry}
        entry={editingEntry}
        subjects={subjects}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEntry}
      />

      <AddEntryModal 
        isOpen={!!addingToSlot}
        slot={addingToSlot}
        subjects={subjects}
        onClose={() => {
          console.log('Closing add modal');
          setAddingToSlot(null);
        }}
        onAdd={handleAddNewEntry}
      />

      {/* Subject Legend */}
      {subjects.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Subject Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className={`p-3 rounded-lg border text-center ${getSubjectColor(subject.id)}`}
              >
                <div className="font-medium text-sm">{subject.name}</div>
                <div className="text-xs opacity-80 mt-1">
                  {subject.frequency}x/week • {subject.duration}min
                </div>
                {subject.teacher && (
                  <div className="text-xs opacity-70 mt-1">
                    👨‍🏫 {subject.teacher}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Daily Schedule Summary</h4>
          <div className="space-y-2">
            {activeDays.map(day => {
              const dayEntries = timetable.entries.filter(entry => entry.day === day);
              const totalHours = dayEntries.reduce((total, entry) => {
                const subject = getSubject(entry.subjectId);
                return total + (subject?.duration || 0);
              }, 0);

              return (
                <div
                  key={day}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                >
                  <span className="font-medium text-foreground">{day}</span>
                  <div className="text-right">
                    <div className="text-sm text-foreground">{dayEntries.length} classes</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.floor(totalHours / 60)}h {totalHours % 60}m
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teacher Workload Summary */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Teacher Workload (CSP: Max 3/week)</h4>
          <div className="space-y-2">
            {Array.from(new Set(subjects.map(s => s.teacher))).map(teacher => {
              const teacherEntries = timetable.entries.filter(entry => entry.teacherId === teacher);
              const teacherSubjects = subjects.filter(s => s.teacher === teacher);
              const totalRequiredSlots = teacherSubjects.reduce((sum, s) => sum + s.frequency, 0);
              const allocatedSlots = teacherEntries.length;
              const workloadPercentage = (allocatedSlots / 3) * 100; // Max 3 slots per week
              
              // Calculate day distribution
              const assignedDays = Array.from(new Set(teacherEntries.map(entry => entry.day)));
              const dayDistributionScore = assignedDays.length; // More days = better distribution

              return (
                <div
                  key={teacher}
                  className="p-3 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground text-sm">{teacher}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{allocatedSlots}/3 slots</span>
                      <span className="text-xs">•</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        dayDistributionScore >= 3 ? 'bg-green-500/20 text-green-400' :
                        dayDistributionScore === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                        dayDistributionScore === 1 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {dayDistributionScore} day{dayDistributionScore !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        workloadPercentage <= 100
                          ? workloadPercentage >= 80
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
                    ></div>
                  </div>
                  {/* Day distribution visualization */}
                  {assignedDays.length > 0 && (
                    <div className="flex gap-1 mb-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(dayShort => {
                        const fullDay = dayShort === 'Mon' ? 'Monday' : 
                                       dayShort === 'Tue' ? 'Tuesday' : 
                                       dayShort === 'Wed' ? 'Wednesday' : 
                                       dayShort === 'Thu' ? 'Thursday' : 'Friday';
                        const hasAssignment = assignedDays.includes(fullDay);
                        return (
                          <div
                            key={dayShort}
                            className={`w-8 h-4 rounded text-xs flex items-center justify-center ${
                              hasAssignment 
                                ? 'bg-blue-500/30 text-blue-300' 
                                : 'bg-gray-500/20 text-gray-500'
                            }`}
                          >
                            {dayShort.charAt(0)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(workloadPercentage)}% capacity</span>
                    {totalRequiredSlots > allocatedSlots && (
                      <span className="text-red-400">
                        {totalRequiredSlots - allocatedSlots} pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Subject Allocation</h4>
          <div className="space-y-2">
            {subjects.map(subject => {
              const subjectEntries = timetable.entries.filter(
                entry => entry.subjectId === subject.id
              );
              const allocatedFrequency = subjectEntries.length;
              const completionPercentage = (allocatedFrequency / subject.frequency) * 100;

              return (
                <div
                  key={subject.id}
                  className="p-3 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground text-sm">{subject.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {allocatedFrequency}/{subject.frequency}
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        completionPercentage === 100
                          ? 'bg-green-500'
                          : completionPercentage >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {completionPercentage.toFixed(0)}% allocated
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 