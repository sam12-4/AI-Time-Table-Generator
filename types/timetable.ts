// Core data types for the timetable generator

export interface Subject {
  id: string;
  name: string;
  duration: number; // Duration in minutes
  frequency: number; // Number of times per week
  preferredTimeSlots?: string[]; // Optional preferred time slots
  teacher?: string;
  room?: string;
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

export interface TimetableEntry {
  id: string;
  subjectId: string;
  timeSlotId: string;
  teacherId?: string;
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
  type: 'no_clash' | 'teacher_availability' | 'room_availability' | 'subject_frequency';
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

// Common time periods
export const TIME_PERIODS = {
  MORNING: { start: '08:00', end: '12:00' },
  AFTERNOON: { start: '13:00', end: '17:00' },
  EVENING: { start: '18:00', end: '21:00' }
} as const; 