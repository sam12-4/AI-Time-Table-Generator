"use client";

import { useState } from 'react';
import { TimeSlot } from '@/types/timetable';

interface TimeSlotFormProps {
  timeSlots: TimeSlot[];
  onUpdateTimeSlots: (timeSlots: TimeSlot[]) => void;
}

export default function TimeSlotForm({ timeSlots, onUpdateTimeSlots }: TimeSlotFormProps) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00'
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const calculateDuration = (start: string, end: string): number => {
    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    return endTotal - startTotal;
  };

  const addTimeSlot = () => {
    const duration = calculateDuration(newSlot.startTime, newSlot.endTime);
    if (duration <= 0) {
      alert('End time must be after start time');
      return;
    }

    const slot: TimeSlot = {
      id: `custom-${Date.now()}`,
      day: newSlot.day,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      duration
    };

    onUpdateTimeSlots([...timeSlots, slot]);
    setNewSlot({
      day: 'Monday',
      startTime: '08:00',
      endTime: '09:00'
    });
  };

  const removeTimeSlot = (id: string) => {
    onUpdateTimeSlots(timeSlots.filter(slot => slot.id !== id));
  };

  const resetToDefault = () => {
    const { TimetableGenerator } = require('@/lib/timetable-generator');
    onUpdateTimeSlots(TimetableGenerator.generateDefaultTimeSlots());
    setIsCustomizing(false);
  };

  const groupedSlots = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = [];
    acc[slot.day].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  // Sort slots by start time for each day
  Object.values(groupedSlots).forEach(daySlots => {
    daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return (
    <div className="space-y-6">
      {/* Configuration Overview */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {timeSlots.length} time slots configured across {Object.keys(groupedSlots).length} days
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="px-4 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-sm"
          >
            {isCustomizing ? 'Hide Custom' : 'Customize'}
          </button>
          <button
            onClick={resetToDefault}
            className="px-4 py-2 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors text-sm"
          >
            Reset Default
          </button>
        </div>
      </div>

      {/* Custom Time Slot Addition */}
      {isCustomizing && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-4">
          <h4 className="font-medium text-foreground">Add Custom Time Slot</h4>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Day</label>
              <select
                value={newSlot.day}
                onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Start Time</label>
              <input
                type="time"
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">End Time</label>
              <input
                type="time"
                value={newSlot.endTime}
                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addTimeSlot}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white hover:from-blue-600 hover:to-purple-600 transition-colors"
              >
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Slots Display */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map(day => {
          const daySlots = groupedSlots[day] || [];
          return (
            <div key={day} className="space-y-2">
              <h4 className="font-medium text-foreground text-sm">{day}</h4>
              <div className="space-y-1 min-h-[100px] max-h-48 overflow-y-auto">
                {daySlots.length > 0 ? (
                  daySlots.map(slot => (
                    <div
                      key={slot.id}
                      className="group flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="text-sm">
                        <div className="text-foreground">{slot.startTime} - {slot.endTime}</div>
                        <div className="text-xs text-muted-foreground">{slot.duration}min</div>
                      </div>
                      {isCustomizing && slot.id.startsWith('custom-') && (
                        <button
                          onClick={() => removeTimeSlot(slot.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                    No slots
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 