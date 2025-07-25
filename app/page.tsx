"use client";

import { useState } from 'react';
import { TimetableGenerator } from '@/lib/timetable-generator';
import { Subject, TimeSlot, TimetableConfig, GeneratedTimetable } from '@/types/timetable';
import SubjectForm from '@/components/SubjectForm';
import TimeSlotForm from '@/components/TimeSlotForm';
import TimetableGrid from '@/components/TimetableGrid';

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(TimetableGenerator.generateDefaultTimeSlots());
  const [generatedTimetable, setGeneratedTimetable] = useState<GeneratedTimetable | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTimetable = async () => {
    if (subjects.length === 0) {
      alert('Please add at least one subject');
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    const config: TimetableConfig = {
      subjects,
      timeSlots,
      resources: [],
      constraints: []
    };

    const generator = new TimetableGenerator(config);
    const result = generator.generateTimetable();
    
    setGeneratedTimetable(result);
    setIsGenerating(false);
  };

  const clearAll = () => {
    setSubjects([]);
    setGeneratedTimetable(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Futuristic Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 futuristic-grid opacity-20"></div>
        <div className="relative z-10 container mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
              AI Timetable Generator
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced constraint-based scheduling with intelligent conflict resolution
            </p>
            <div className="flex justify-center mt-6">
              <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Input Section */}
          <div className="space-y-8">
            {/* Subject Management */}
            <div className="glass-morphism rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Subjects & Courses
              </h2>
              <SubjectForm 
                onAddSubject={(subject) => setSubjects([...subjects, subject])}
                onRemoveSubject={(id) => setSubjects(subjects.filter(s => s.id !== id))}
                subjects={subjects}
              />
            </div>

            {/* Time Slots Management */}
            <div className="glass-morphism rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                Time Configuration
              </h2>
              <TimeSlotForm 
                timeSlots={timeSlots}
                onUpdateTimeSlots={setTimeSlots}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={generateTimetable}
                disabled={isGenerating || subjects.length === 0}
                className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 translate-y-full transition-transform duration-300 group-hover:translate-y-0"></div>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Timetable
                    </>
                  )}
                </span>
              </button>
              
              <button
                onClick={clearAll}
                className="px-6 py-4 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-8">
            {generatedTimetable && (
              <div className="glass-morphism rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Generated Timetable
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      generatedTimetable.success 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {generatedTimetable.completionRate.toFixed(1)}% Complete
                    </div>
                  </div>
                </div>
                
                <TimetableGrid 
                  timetable={generatedTimetable}
                  subjects={subjects}
                  timeSlots={timeSlots}
                />
                
                {generatedTimetable.conflicts.length > 0 && (
                  <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <h3 className="font-semibold text-yellow-400 mb-2">Conflicts Detected:</h3>
                    <ul className="text-sm text-yellow-300 space-y-1">
                      {generatedTimetable.conflicts.map((conflict, index) => (
                        <li key={index}>{conflict.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!generatedTimetable && (
              <div className="glass-morphism rounded-2xl p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No Timetable Generated</h3>
                <p className="text-muted-foreground">Add subjects and generate your timetable to see it here</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
