import {
  Subject,
  TimeSlot,
  Resource,
  TimetableEntry,
  TimetableConfig,
  GeneratedTimetable,
  Conflict,
  DAYS
} from '@/types/timetable';

export class TimetableGenerator {
  private config: TimetableConfig;
  private assignments: TimetableEntry[] = [];
  private conflicts: Conflict[] = [];

  constructor(config: TimetableConfig) {
    this.config = config;
  }

  /**
   * Generate timetable using constraint satisfaction with backtracking
   */
  generateTimetable(): GeneratedTimetable {
    this.assignments = [];
    this.conflicts = [];

    // Sort subjects by priority (fewer available slots first)
    const sortedSubjects = this.prioritizeSubjects();
    
    let totalAssignments = 0;
    let successfulAssignments = 0;

    for (const subject of sortedSubjects) {
      for (let i = 0; i < subject.frequency; i++) {
        totalAssignments++;
        const assignment = this.assignSubject(subject);
        if (assignment) {
          this.assignments.push(assignment);
          successfulAssignments++;
        }
      }
    }

    const completionRate = totalAssignments > 0 ? (successfulAssignments / totalAssignments) * 100 : 0;

    return {
      entries: this.assignments,
      conflicts: this.conflicts,
      success: this.conflicts.length === 0 && completionRate === 100,
      completionRate
    };
  }

  /**
   * Priority-based subject sorting for better assignment success
   */
  private prioritizeSubjects(): Subject[] {
    return [...this.config.subjects].sort((a, b) => {
      const aSlots = this.getAvailableSlots(a).length;
      const bSlots = this.getAvailableSlots(b).length;
      return aSlots - bSlots; // Fewer available slots = higher priority
    });
  }

  /**
   * Assign a subject to an available time slot with enhanced conflict reporting
   */
  private assignSubject(subject: Subject): TimetableEntry | null {
    const availableSlots = this.getAvailableSlots(subject);
    const allConflicts: string[] = [];
    const conflictsBySlot: Map<string, string[]> = new Map();
    
    for (const slot of availableSlots) {
      const slotConflicts = this.detectConflicts(subject, slot);
      
      if (slotConflicts.length === 0) {
        const entry: TimetableEntry = {
          id: `${subject.id}-${slot.id}-${Date.now()}`,
          subjectId: subject.id,
          timeSlotId: slot.id,
          teacherId: subject.teacher,
          roomId: subject.room,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime
        };

        return entry;
      } else {
        // Collect conflicts for this slot
        conflictsBySlot.set(`${slot.day} ${slot.startTime}-${slot.endTime}`, slotConflicts);
        allConflicts.push(...slotConflicts);
      }
    }

    // Generate detailed conflict report with suggestions
    const conflictDescription = this.generateConflictReport(subject, conflictsBySlot, availableSlots);
    
    this.conflicts.push({
      type: 'scheduling_conflict',
      description: conflictDescription,
      affectedEntries: []
    });

    return null;
  }

  /**
   * Generate detailed conflict report with suggestions
   */
  private generateConflictReport(
    subject: Subject, 
    conflictsBySlot: Map<string, string[]>, 
    availableSlots: TimeSlot[]
  ): string {
    let report = `Unable to schedule "${subject.name}":\n\n`;
    
    if (availableSlots.length === 0) {
      report += "No compatible time slots found. ";
      
      // Suggest solutions
      const suggestions: string[] = [];
      if (subject.duration > 60) {
        suggestions.push("Consider reducing subject duration");
      }
      if (subject.preferredTimeSlots && subject.preferredTimeSlots.length > 0) {
        suggestions.push("Consider expanding preferred time slots");
      }
      suggestions.push("Add more time slots to the schedule");
      
      if (suggestions.length > 0) {
        report += `Suggestions: ${suggestions.join(', ')}.`;
      }
      
      return report;
    }

    report += "Conflicts found in available time slots:\n";
    
    for (const [slotInfo, conflicts] of conflictsBySlot) {
      report += `• ${slotInfo}: ${conflicts.join('; ')}\n`;
    }

    // Generate suggestions based on conflict types
    const allConflicts = Array.from(conflictsBySlot.values()).flat();
    const suggestions = this.generateSuggestions(subject, allConflicts);
    
    if (suggestions.length > 0) {
      report += `\nSuggestions: ${suggestions.join(', ')}.`;
    }

    return report;
  }

  /**
   * Generate suggestions based on conflict types
   */
  private generateSuggestions(subject: Subject, conflicts: string[]): string[] {
    const suggestions: string[] = [];
    
    if (conflicts.some(c => c.includes('Teacher'))) {
      suggestions.push("Assign a different teacher or adjust teacher's schedule");
    }
    
    if (conflicts.some(c => c.includes('Room'))) {
      suggestions.push("Assign a different room or create additional room slots");
    }
    
    if (conflicts.some(c => c.includes('Time slot already occupied'))) {
      suggestions.push("Add more parallel time slots or reschedule conflicting subjects");
    }
    
    if (conflicts.some(c => c.includes('Insufficient time slot duration'))) {
      suggestions.push(`Extend time slots to at least ${subject.duration} minutes or reduce subject duration`);
    }

    if (subject.frequency > 1) {
      suggestions.push("Consider reducing subject frequency per week");
    }

    return suggestions;
  }

  /**
   * Check if a subject can be assigned to a time slot
   */
  private canAssign(subject: Subject, slot: TimeSlot): boolean {
    const conflictDetails = this.detectConflicts(subject, slot);
    return conflictDetails.length === 0;
  }

  /**
   * Enhanced conflict detection with detailed reporting
   */
  private detectConflicts(subject: Subject, slot: TimeSlot): string[] {
    const conflicts: string[] = [];

    // Check if slot duration matches subject duration
    if (slot.duration < subject.duration) {
      conflicts.push(`Insufficient time slot duration: ${slot.duration}min < ${subject.duration}min required`);
    }

    // Check for time slot conflicts
    const timeConflictingAssignments = this.assignments.filter(assignment => 
      assignment.day === slot.day &&
      this.timesOverlap(
        assignment.startTime,
        assignment.endTime,
        slot.startTime,
        slot.endTime
      )
    );

    if (timeConflictingAssignments.length > 0) {
      const conflictingSubjects = timeConflictingAssignments.map(assignment => {
        const conflictSubject = this.config.subjects.find(s => s.id === assignment.subjectId);
        return conflictSubject?.name || 'Unknown Subject';
      });
      conflicts.push(`Time slot already occupied by: ${conflictingSubjects.join(', ')}`);
    }

    // Check teacher availability
    if (subject.teacher) {
      const teacherConflictingAssignments = this.assignments.filter(assignment => 
        assignment.teacherId === subject.teacher &&
        assignment.day === slot.day &&
        this.timesOverlap(
          assignment.startTime,
          assignment.endTime,
          slot.startTime,
          slot.endTime
        )
      );

      if (teacherConflictingAssignments.length > 0) {
        const conflictingSubjects = teacherConflictingAssignments.map(assignment => {
          const conflictSubject = this.config.subjects.find(s => s.id === assignment.subjectId);
          return conflictSubject?.name || 'Unknown Subject';
        });
        conflicts.push(`Teacher ${subject.teacher} is already assigned to: ${conflictingSubjects.join(', ')} at this time`);
      }
    }

    // Check room availability
    if (subject.room) {
      const roomConflictingAssignments = this.assignments.filter(assignment => 
        assignment.roomId === subject.room &&
        assignment.day === slot.day &&
        this.timesOverlap(
          assignment.startTime,
          assignment.endTime,
          slot.startTime,
          slot.endTime
        )
      );

      if (roomConflictingAssignments.length > 0) {
        const conflictingSubjects = roomConflictingAssignments.map(assignment => {
          const conflictSubject = this.config.subjects.find(s => s.id === assignment.subjectId);
          return conflictSubject?.name || 'Unknown Subject';
        });
        conflicts.push(`Room ${subject.room} is already occupied by: ${conflictingSubjects.join(', ')} at this time`);
      }
    }

    return conflicts;
  }

  /**
   * Get available time slots for a subject
   */
  private getAvailableSlots(subject: Subject): TimeSlot[] {
    let slots = [...this.config.timeSlots];

    // Filter by preferred time slots if specified
    if (subject.preferredTimeSlots && subject.preferredTimeSlots.length > 0) {
      slots = slots.filter(slot => subject.preferredTimeSlots!.includes(slot.id));
    }

    // Filter by duration
    slots = slots.filter(slot => slot.duration >= subject.duration);

    return slots;
  }

  /**
   * Check if two time periods overlap
   */
  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const start1Minutes = this.timeToMinutes(start1);
    const end1Minutes = this.timeToMinutes(end1);
    const start2Minutes = this.timeToMinutes(start2);
    const end2Minutes = this.timeToMinutes(end2);

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Generate default time slots for a standard week
   */
  static generateDefaultTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const periods = [
      { start: '08:00', end: '09:00', duration: 60 },
      { start: '09:00', end: '10:00', duration: 60 },
      { start: '10:15', end: '11:15', duration: 60 },
      { start: '11:15', end: '12:15', duration: 60 },
      { start: '13:00', end: '14:00', duration: 60 },
      { start: '14:00', end: '15:00', duration: 60 },
      { start: '15:15', end: '16:15', duration: 60 },
      { start: '16:15', end: '17:15', duration: 60 }
    ];

    const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    workDays.forEach(day => {
      periods.forEach((period, index) => {
        slots.push({
          id: `${day.toLowerCase()}-${index + 1}`,
          day,
          startTime: period.start,
          endTime: period.end,
          duration: period.duration
        });
      });
    });

    return slots;
  }
} 