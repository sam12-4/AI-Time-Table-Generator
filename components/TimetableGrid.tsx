"use client";

import { Subject, TimeSlot, GeneratedTimetable } from '@/types/timetable';

interface TimetableGridProps {
  timetable: GeneratedTimetable;
  subjects: Subject[];
  timeSlots: TimeSlot[];
}

export default function TimetableGrid({ timetable, subjects, timeSlots }: TimetableGridProps) {
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
        <div className="min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left font-medium text-muted-foreground border-b border-border min-w-[120px]">
                  Time
                </th>
                {activeDays.map(day => (
                  <th
                    key={day}
                    className="p-3 text-center font-medium text-foreground border-b border-border min-w-[150px]"
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
                    <td className="p-3 text-sm text-muted-foreground font-medium bg-secondary/20">
                      <div className="text-foreground">{startTime}</div>
                      <div className="text-xs">{endTime}</div>
                    </td>
                    {activeDays.map(day => {
                      const key = `${day}-${startTime}-${endTime}`;
                      const entry = entryMap.get(key);
                      const subject = entry ? getSubject(entry.subjectId) : null;

                      return (
                        <td key={`${day}-${period}`} className="p-2">
                          {entry && subject ? (
                            <div
                              className={`p-3 rounded-lg border text-center transition-all duration-200 hover:scale-105 cursor-pointer ${getSubjectColor(
                                entry.subjectId
                              )}`}
                            >
                              <div className="font-medium text-sm">{subject.name}</div>
                              {subject.teacher && (
                                <div className="text-xs opacity-80 mt-1">
                                  👨‍🏫 {subject.teacher}
                                </div>
                              )}
                              {subject.room && (
                                <div className="text-xs opacity-80">
                                  🏫 {subject.room}
                                </div>
                              )}
                              <div className="text-xs opacity-60 mt-1">
                                {subject.duration}min
                              </div>
                            </div>
                          ) : (
                            <div className="h-16 rounded-lg border border-dashed border-border/30 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">Free</span>
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
      <div className="grid md:grid-cols-2 gap-6">
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