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
   * Pre-validate configuration before generation to provide early warnings
   */
  validateConfiguration(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Error: No subjects defined
    if (this.config.subjects.length === 0) {
      errors.push("VALIDATION_ERROR: No subjects defined. Please add at least one subject to generate a timetable.");
      return { isValid: false, errors, warnings };
    }
    
    // Error: No time slots available
    if (this.config.timeSlots.length === 0) {
      errors.push("CONFIGURATION_ERROR: No time slots available. Please configure time slots before generation.");
      return { isValid: false, errors, warnings };
    }
    
    // Validate all subjects have required teacher field
    this.config.subjects.forEach(subject => {
      if (!subject.teacher || subject.teacher.trim() === '') {
        errors.push(`CONFIGURATION_ERROR: Subject "${subject.name}" must have a teacher assigned.`);
      }
    });
    
    // Check teacher workload constraints - FIXED: Count total frequency across all subjects per teacher
    const teacherWorkloads = new Map<string, number>();
    this.config.subjects.forEach(subject => {
      if (subject.teacher) {
        const current = teacherWorkloads.get(subject.teacher) || 0;
        teacherWorkloads.set(subject.teacher, current + subject.frequency);
      }
    });
    
    // Error: Teachers exceeding maximum slots
    teacherWorkloads.forEach((totalSlots, teacher) => {
      if (totalSlots > 3) {
        errors.push(`CONSTRAINT_VIOLATION: Teacher "${teacher}" assigned ${totalSlots} slots/week (Maximum: 3). Please redistribute subjects or reduce frequency.`);
      }
    });
    
    // Warning: Teachers at maximum capacity
    teacherWorkloads.forEach((totalSlots, teacher) => {
      if (totalSlots === 3) {
        warnings.push(`CAPACITY_WARNING: Teacher "${teacher}" at maximum capacity (3/3 slots). No additional subjects can be assigned.`);
      }
    });
    
    // Check for duration mismatches
    this.config.subjects.forEach(subject => {
      const compatibleSlots = this.config.timeSlots.filter(slot => slot.duration >= subject.duration);
      if (compatibleSlots.length === 0) {
        errors.push(`DURATION_MISMATCH: Subject "${subject.name}" requires ${subject.duration} minutes but no time slots are long enough. Please adjust subject duration or add longer time slots.`);
      }
    });
    
    // Warning: Limited scheduling options
    this.config.subjects.forEach(subject => {
      const availableSlots = this.config.timeSlots.filter(slot => slot.duration >= subject.duration);
      const requiredSlots = subject.frequency;
      const daysAvailable = Array.from(new Set(availableSlots.map(slot => slot.day))).length;
      
      if (requiredSlots > daysAvailable) {
        warnings.push(`SCHEDULING_RISK: Subject "${subject.name}" needs ${requiredSlots} slots but only ${daysAvailable} days available. May result in same-day assignments.`);
      }
    });
    
    // FIXED: Check room conflicts potential - Calculate total slots available per day
    const roomAssignments = new Map<string, string[]>();
    this.config.subjects.forEach(subject => {
      if (subject.room) {
        const subjects = roomAssignments.get(subject.room) || [];
        subjects.push(subject.name);
        roomAssignments.set(subject.room, subjects);
      }
    });
    
    roomAssignments.forEach((subjects, room) => {
      if (subjects.length > 1) {
        const totalFrequency = this.config.subjects
          .filter(s => s.room === room)
          .reduce((sum, s) => sum + s.frequency, 0);
        
        // FIXED: Count unique time slots per day, not total time slots
        const slotsPerDay = this.config.timeSlots.filter(slot => slot.day === 'Monday').length; // Use one day as reference
        const availableDays = Array.from(new Set(this.config.timeSlots.map(slot => slot.day))).length;
        const totalRoomSlots = slotsPerDay * availableDays;
        
        if (totalFrequency > totalRoomSlots) {
          warnings.push(`ROOM_CONFLICT_RISK: Room "${room}" assigned to ${subjects.length} subjects (${totalFrequency} total slots needed vs ${totalRoomSlots} available). May cause scheduling conflicts.`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate timetable using constraint satisfaction with backtracking
   */
  generateTimetable(): GeneratedTimetable {
    // FIXED: Clear previous state properly
    this.assignments = [];
    this.conflicts = [];

    // Sort subjects by priority (fewer available slots first)
    const sortedSubjects = this.prioritizeSubjects();
    
    let totalAssignments = 0;
    let successfulAssignments = 0;

    // FIXED: Process each subject completely before moving to next
    for (const subject of sortedSubjects) {
      console.log(`\n=== Processing Subject: ${subject.name} (Teacher: ${subject.teacher}, Frequency: ${subject.frequency}) ===`);
      
      for (let i = 0; i < subject.frequency; i++) {
        console.log(`\nAttempt ${i + 1}/${subject.frequency} for ${subject.name}`);
        totalAssignments++;
        
        const assignment = this.assignSubject(subject);
        if (assignment) {
          this.assignments.push(assignment);
          successfulAssignments++;
          console.log(`✓ Successfully assigned ${subject.name} (${i + 1}/${subject.frequency})`);
        } else {
          console.log(`✗ Failed to assign ${subject.name} (${i + 1}/${subject.frequency})`);
        }
      }
    }

    const completionRate = totalAssignments > 0 ? (successfulAssignments / totalAssignments) * 100 : 0;

    console.log(`\n=== Final Results ===`);
    console.log(`Total assignments attempted: ${totalAssignments}`);
    console.log(`Successful assignments: ${successfulAssignments}`);
    console.log(`Completion rate: ${completionRate.toFixed(1)}%`);
    console.log(`Conflicts: ${this.conflicts.length}`);

    return {
      entries: this.assignments,
      conflicts: this.conflicts,
      success: this.conflicts.length === 0 && completionRate === 100,
      completionRate
    };
  }

  /**
   * Priority-based subject sorting for better assignment success with CSP constraints and day distribution
   */
  private prioritizeSubjects(): Subject[] {
    return [...this.config.subjects].sort((a, b) => {
      // First priority: teachers with fewer assigned days (better distribution potential)
      const aTeacherDays = this.getTeacherAssignedDays(a.teacher).length;
      const bTeacherDays = this.getTeacherAssignedDays(b.teacher).length;
      
      if (aTeacherDays !== bTeacherDays) {
        return aTeacherDays - bTeacherDays; // Fewer assigned days = higher priority for better distribution
      }
      
      // Second priority: subjects with teachers who have fewer total weekly slots
      const aTeacherLoad = this.getTeacherTotalLoad(a.teacher);
      const bTeacherLoad = this.getTeacherTotalLoad(b.teacher);
      
      if (aTeacherLoad !== bTeacherLoad) {
        return aTeacherLoad - bTeacherLoad; // Lower teacher load = higher priority
      }
      
      // Third priority: subjects with more available slots on new days
      const aNewDaySlots = this.getAvailableSlots(a).filter(slot => 
        !this.getTeacherAssignedDays(a.teacher).includes(slot.day)
      ).length;
      const bNewDaySlots = this.getAvailableSlots(b).filter(slot => 
        !this.getTeacherAssignedDays(b.teacher).includes(slot.day)
      ).length;
      
      if (aNewDaySlots !== bNewDaySlots) {
        return bNewDaySlots - aNewDaySlots; // More new day slots = higher priority
      }
      
      // Fourth priority: fewer total available slots (more constrained)
      const aSlots = this.getAvailableSlots(a).length;
      const bSlots = this.getAvailableSlots(b).length;
      
      if (aSlots !== bSlots) {
        return aSlots - bSlots; // Fewer available slots = higher priority
      }
      
      // Fifth priority: higher frequency subjects
      return b.frequency - a.frequency;
    });
  }

  /**
   * Calculate total weekly load for a teacher across all subjects
   */
  private getTeacherTotalLoad(teacherName: string): number {
    return this.config.subjects
      .filter(subject => subject.teacher === teacherName)
      .reduce((total, subject) => total + subject.frequency, 0);
  }

  /**
   * FIXED: Calculate current weekly load for a teacher from actual assignments
   */
  private getTeacherCurrentLoad(teacherName: string): number {
    return this.assignments.filter(assignment => assignment.teacherId === teacherName).length;
  }

  /**
   * Assign a subject to an available time slot with enhanced conflict reporting and day distribution
   */
  private assignSubject(subject: Subject): TimetableEntry | null {
    const availableSlots = this.getAvailableSlots(subject);
    const allConflicts: string[] = [];
    const conflictsBySlot: Map<string, string[]> = new Map();
    
    // Log day distribution info for debugging
    if (subject.teacher) {
      const assignedDays = this.getTeacherAssignedDays(subject.teacher);
      const currentLoad = this.getTeacherCurrentLoad(subject.teacher);
      const availableDays = Array.from(new Set(availableSlots.map(slot => slot.day)));
      const newDays = availableDays.filter(day => !assignedDays.includes(day));
      
      console.log(`Teacher ${subject.teacher} - Current load: ${currentLoad}/3, Already assigned days: ${assignedDays.join(', ') || 'none'}, Available new days: ${newDays.join(', ') || 'none'}`);
    }
    
    for (const slot of availableSlots) {
      const slotConflicts = this.detectConflicts(subject, slot);
      
      if (slotConflicts.length === 0) {
        const entry: TimetableEntry = {
          id: `${subject.id}-${slot.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
          subjectId: subject.id,
          timeSlotId: slot.id,
          teacherId: subject.teacher, // FIXED: Always set teacherId from subject.teacher
          roomId: subject.room,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime
        };

        // Log successful assignment with day distribution info
        if (subject.teacher) {
          const assignedDays = this.getTeacherAssignedDays(subject.teacher);
          const isNewDay = !assignedDays.includes(slot.day);
          console.log(`✓ Assigned ${subject.name} to ${subject.teacher} on ${slot.day} ${slot.startTime}-${slot.endTime} ${isNewDay ? '(NEW DAY)' : '(EXISTING DAY)'}`);
        }

        return entry;
      } else {
        // Collect conflicts for this slot
        conflictsBySlot.set(`${slot.day} ${slot.startTime}-${slot.endTime}`, slotConflicts);
        allConflicts.push(...slotConflicts);
      }
    }

    // Generate detailed conflict report with day distribution suggestions
    const conflictDescription = this.generateConflictReport(subject, conflictsBySlot, availableSlots);
    
    this.conflicts.push({
      type: 'scheduling_conflict',
      description: conflictDescription,
      affectedEntries: []
    });

    return null;
  }

  /**
   * Generate detailed conflict report with suggestions including day distribution
   */
  private generateConflictReport(
    subject: Subject, 
    conflictsBySlot: Map<string, string[]>, 
    availableSlots: TimeSlot[]
  ): string {
    let report = `Unable to schedule "${subject.name}"`;
    
    // Add teacher day distribution context
    if (subject.teacher) {
      const assignedDays = this.getTeacherAssignedDays(subject.teacher);
      if (assignedDays.length > 0) {
        report += ` (Teacher ${subject.teacher} currently assigned on: ${assignedDays.join(', ')})`;
      }
    }
    
    report += ":\n\n";
    
    if (availableSlots.length === 0) {
      report += "No compatible time slots found. ";
      
      // Suggest solutions
      const suggestions: string[] = [];
      if (subject.duration > 50) {
        suggestions.push("Consider reducing subject duration to 50 minutes (standard period)");
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

    // Generate suggestions based on conflict types and day distribution
    const allConflicts = Array.from(conflictsBySlot.values()).flat();
    const suggestions = this.generateSuggestions(subject, allConflicts);
    
    // Add day distribution specific suggestions
    if (subject.teacher) {
      const assignedDays = this.getTeacherAssignedDays(subject.teacher);
      const totalAssignments = this.assignments.filter(a => a.teacherId === subject.teacher).length;
      
      if (assignedDays.length === 1 && totalAssignments >= 2) {
        suggestions.push(`Consider redistributing ${subject.teacher}'s existing assignments across different days for better balance`);
      }
      
      if (assignedDays.length >= 3) {
        suggestions.push(`Teacher ${subject.teacher} is already spread across ${assignedDays.length} days. Consider using fewer days or different teacher`);
      }
    }
    
    if (suggestions.length > 0) {
      report += `\nSuggestions: ${suggestions.join(', ')}.`;
    }

    return report;
  }

  /**
   * Generate suggestions based on conflict types with enhanced CSP guidance
   */
  private generateSuggestions(subject: Subject, conflicts: string[]): string[] {
    const suggestions: string[] = [];
    
    if (conflicts.some(c => c.includes('Teacher') && c.includes('already assigned'))) {
      suggestions.push("Assign a different teacher or adjust teacher's schedule");
    }
    
    if (conflicts.some(c => c.includes('maximum weekly limit'))) {
      suggestions.push(`Teacher ${subject.teacher} has reached 3 slots/week limit. Consider: (1) Assign different teacher, (2) Reduce subject frequency, (3) Distribute slots across multiple teachers`);
    }
    
    if (conflicts.some(c => c.includes('Room'))) {
      suggestions.push("Assign a different room or create additional room slots");
    }
    
    if (conflicts.some(c => c.includes('Time slot already occupied'))) {
      suggestions.push("Add more parallel time slots or reschedule conflicting subjects");
    }
    
    if (conflicts.some(c => c.includes('Insufficient time slot duration'))) {
      suggestions.push(`Extend time slots to at least ${subject.duration} minutes or reduce subject duration to 50 minutes (standard period)`);
    }

    if (subject.frequency > 1) {
      suggestions.push("Consider reducing subject frequency per week to better fit teacher constraints");
    }

    // CSP-specific suggestions
    if (subject.teacher) {
      const teacherSubjects = this.config.subjects.filter(s => s.teacher === subject.teacher);
      const totalFrequency = teacherSubjects.reduce((sum, s) => sum + s.frequency, 0);
      
      if (totalFrequency > 3) {
        suggestions.push(`Teacher ${subject.teacher} is assigned ${totalFrequency} total slots across subjects. Consider redistributing to stay within 3 slots/week limit`);
      }
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
   * Enhanced conflict detection with detailed reporting including teacher workload constraints
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

    // Check teacher availability and workload constraints
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

      // FIXED: Check teacher weekly workload constraint using current assignments
      const teacherWeeklyAssignments = this.assignments.filter(assignment => 
        assignment.teacherId === subject.teacher
      );

      if (teacherWeeklyAssignments.length >= 3) {
        conflicts.push(`Teacher ${subject.teacher} has reached maximum weekly limit (3 slots). Current assignments: ${teacherWeeklyAssignments.length}`);
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
   * Get available time slots for a subject with enhanced day distribution for teachers
   */
  private getAvailableSlots(subject: Subject): TimeSlot[] {
    let slots = [...this.config.timeSlots];

    // Filter by preferred time slots if specified
    if (subject.preferredTimeSlots && subject.preferredTimeSlots.length > 0) {
      slots = slots.filter(slot => subject.preferredTimeSlots!.includes(slot.id));
    }

    // Filter by duration
    slots = slots.filter(slot => slot.duration >= subject.duration);

    // Enhanced day distribution logic for teachers
    if (subject.teacher) {
      const teacherAssignedDays = this.getTeacherAssignedDays(subject.teacher);
      
      // Separate slots into two categories: new days vs existing days
      const slotsOnNewDays = slots.filter(slot => !teacherAssignedDays.includes(slot.day));
      const slotsOnExistingDays = slots.filter(slot => teacherAssignedDays.includes(slot.day));
      
      // Priority 1: Slots on days where teacher has no assignments yet
      // Priority 2: Slots on days where teacher already has assignments
      const prioritizedSlots = [...slotsOnNewDays, ...slotsOnExistingDays];
      
      return prioritizedSlots;
    }

    return slots;
  }

  /**
   * Get days where a teacher already has assignments
   */
  private getTeacherAssignedDays(teacherName: string): string[] {
    const assignedDays = this.assignments
      .filter(assignment => assignment.teacherId === teacherName)
      .map(assignment => assignment.day);
    
    return Array.from(new Set(assignedDays)); // Remove duplicates
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
   * Generate default time slots for a standard week with 50-minute periods
   * Schedule: 8:30-9:20, 9:20-10:10, 10:10-11:00, [BREAK], 11:30-12:20, 12:20-1:10, [NAMAZ BREAK], 2:00-2:50, 2:50-3:40, 3:40-4:30
   */
  static generateDefaultTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const periods = [
      { start: '08:30', end: '09:20', duration: 50 }, // Period 1
      { start: '09:20', end: '10:10', duration: 50 }, // Period 2
      { start: '10:10', end: '11:00', duration: 50 }, // Period 3
      // 11:00 - 11:30 Break (30 minutes)
      { start: '11:30', end: '12:20', duration: 50 }, // Period 4
      { start: '12:20', end: '13:10', duration: 50 }, // Period 5
      // 13:10 - 14:00 Namaz Break (50 minutes)
      { start: '14:00', end: '14:50', duration: 50 }, // Period 6
      { start: '14:50', end: '15:40', duration: 50 }, // Period 7
      { start: '15:40', end: '16:30', duration: 50 }  // Period 8
    ];

    const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    workDays.forEach(day => {
      periods.forEach((period, index) => {
        slots.push({
          id: `${day.toLowerCase()}-period-${index + 1}`,
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