// Core data types for the CSP-based timetable generator with 50-minute periods

export interface Subject {
  id: string;
  name: string;
  duration: number; // Duration in minutes (default: 50 minutes)
  frequency: number; // Number of times per week (max 3 per teacher due to CSP constraints)
  preferredTimeSlots?: string[]; // Optional preferred time slots
  teacher: string; // Required: Teacher name for CSP constraint satisfaction
  room?: string; // Optional: Room assignment
}

export interface TimeSlot {
  id: string;
  day: string;
  startTime: string; // Format: "HH:MM"
  endTime: string;   // Format: "HH:MM"
  duration: number;  // Duration in minutes
}

export interface Resource {
  id: string;
  name: string;
  type: 'teacher' | 'room' | 'equipment';
  availability: string[]; // Array of time slot IDs when available
}

// FIXED: Make teacherId required to ensure consistency with Subject.teacher
export interface TimetableEntry {
  id: string;
  subjectId: string;
  timeSlotId: string;
  teacherId: string; // Required: Must match Subject.teacher
  roomId?: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface TimetableConfig {
  subjects: Subject[];
  timeSlots: TimeSlot[];
  resources: Resource[];
  constraints: Constraint[];
}

export interface Constraint {
  id: string;
  type: 'no_clash' | 'teacher_availability' | 'room_availability' | 'subject_frequency' | 'teacher_workload';
  description: string;
  data: any; // Flexible data for different constraint types
}

export interface GeneratedTimetable {
  entries: TimetableEntry[];
  conflicts: Conflict[];
  success: boolean;
  completionRate: number; // Percentage of subjects successfully scheduled
}

export interface Conflict {
  type: string;
  description: string;
  affectedEntries: string[]; // Array of TimetableEntry IDs
}

// Days of the week
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type Day = typeof DAYS[number];

// Standard 50-minute time periods with breaks
export const TIME_PERIODS = {
  PERIOD_1: { start: '08:30', end: '09:20', duration: 50 },
  PERIOD_2: { start: '09:20', end: '10:10', duration: 50 },
  PERIOD_3: { start: '10:10', end: '11:00', duration: 50 },
  BREAK_1: { start: '11:00', end: '11:30', duration: 30 }, // Morning break
  PERIOD_4: { start: '11:30', end: '12:20', duration: 50 },
  PERIOD_5: { start: '12:20', end: '13:10', duration: 50 },
  NAMAZ_BREAK: { start: '13:10', end: '14:00', duration: 50 }, // Prayer break
  PERIOD_6: { start: '14:00', end: '14:50', duration: 50 },
  PERIOD_7: { start: '14:50', end: '15:40', duration: 50 },
  PERIOD_8: { start: '15:40', end: '16:30', duration: 50 }
} as const;

// CSP Constraints for timetable generation
export const CSP_CONSTRAINTS = {
  MAX_TEACHER_SLOTS_PER_WEEK: 3,
  STANDARD_PERIOD_DURATION: 50,
  WORKING_DAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  // FIXED: Add validation constants
  MIN_SUBJECT_DURATION: 30,
  MAX_SUBJECT_DURATION: 120,
  MIN_FREQUENCY: 1,
  MAX_FREQUENCY: 5
} as const;

// FIXED: Add utility type for safe partial updates
export type SafeTimetableEntryUpdate = Partial<Pick<TimetableEntry, 'subjectId' | 'teacherId' | 'roomId'>>; 