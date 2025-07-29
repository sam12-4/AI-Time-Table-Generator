"use client";

import { useState, useEffect } from 'react';
import { TimetableGenerator } from '@/lib/timetable-generator';
import { Subject, TimeSlot, TimetableConfig, GeneratedTimetable, TimetableEntry } from '@/types/timetable';
import { SavedTimetable } from '@/lib/mongodb';
import { generateTimetablePDF } from '@/lib/pdf-generator';
import SubjectForm from '@/components/SubjectForm';
import TimeSlotForm from '@/components/TimeSlotForm';
import TimetableGrid from '@/components/TimetableGrid';
import SavedTimetables from '@/components/SavedTimetables';
import EditEntryModal from '@/components/EditEntryModal';
import AddEntryModal from '@/components/AddEntryModal';

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(TimetableGenerator.generateDefaultTimeSlots());
  const [generatedTimetable, setGeneratedTimetable] = useState<GeneratedTimetable | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dbReloadTrigger, setDbReloadTrigger] = useState(0); // Trigger to reload saved timetables
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [addingToSlot, setAddingToSlot] = useState<{ day: string; startTime: string; endTime: string } | null>(null);
  
  // ADDED: Track loaded timetable and unsaved changes
  const [loadedTimetable, setLoadedTimetable] = useState<SavedTimetable | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new-timetable' | null>(null);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  // ADDED: Compare current state with loaded timetable to detect changes
  const checkForUnsavedChanges = () => {
    if (!loadedTimetable || !generatedTimetable) {
      setHasUnsavedChanges(false);
      return;
    }

    // Compare entries by converting to comparable format
    const currentEntries = generatedTimetable.entries.map((e: TimetableEntry) => ({
      subjectId: e.subjectId,
      teacherId: e.teacherId,
      roomId: e.roomId,
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime
    })).sort((a: any, b: any) => `${a.day}-${a.startTime}`.localeCompare(`${b.day}-${b.startTime}`));

    const savedEntries = loadedTimetable.generatedTimetable.entries.map((e: TimetableEntry) => ({
      subjectId: e.subjectId,
      teacherId: e.teacherId,
      roomId: e.roomId,
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime
    })).sort((a: any, b: any) => `${a.day}-${a.startTime}`.localeCompare(`${b.day}-${b.startTime}`));

    const hasChanges = JSON.stringify(currentEntries) !== JSON.stringify(savedEntries);
    setHasUnsavedChanges(hasChanges);
  };

  // ADDED: Check for changes whenever timetable is modified
  useEffect(() => {
    checkForUnsavedChanges();
  }, [generatedTimetable, loadedTimetable]);

  // Handle timetable entry updates
  const handleUpdateEntry = (entryId: string, updates: Partial<TimetableEntry>): string[] => {
    console.log('Main app handleUpdateEntry called:', { entryId, updates });
    if (!generatedTimetable) return ['No timetable generated.'];
    
    // Check for conflicts before updating
    const conflicts = checkUpdateConflicts(entryId, updates);
    console.log('Update conflicts found:', conflicts);
    
    if (conflicts.length > 0) {
      return conflicts; // Return conflicts to be shown in the modal
    }
    
    const updatedEntries = generatedTimetable.entries.map(entry => 
      entry.id === entryId ? { ...entry, ...updates } : entry
    );
    
    console.log('Updating timetable with new entries');
    setGeneratedTimetable({
      ...generatedTimetable,
      entries: updatedEntries,
      conflicts: [] // Clear old main conflicts, as the state is now manually managed
    });

    return []; // No conflicts
  };

  // Handle timetable entry deletion
  const handleDeleteEntry = (entryId: string) => {
    console.log('Main app handleDeleteEntry called:', entryId);
    if (!generatedTimetable) return;
    
    const updatedEntries = generatedTimetable.entries.filter(entry => entry.id !== entryId);
    
    console.log('Deleting entry from timetable');
    setGeneratedTimetable({
      ...generatedTimetable,
      entries: updatedEntries
    });
  };

  // Handle adding new timetable entry
  const handleAddEntry = (newEntry: Omit<TimetableEntry, 'id'>): string[] => {
    console.log('Main app handleAddEntry called:', newEntry);
    if (!generatedTimetable) return ['No timetable generated.'];
    
    // Check for conflicts before adding
    const conflicts = checkAddConflicts(newEntry);
    console.log('Add conflicts found:', conflicts);
    
    if (conflicts.length > 0) {
      return conflicts; // Return conflicts to be shown in modal
    }
    
    const entryWithId: TimetableEntry = {
      ...newEntry,
      id: `manual-${Date.now()}`
    };
    
    const updatedEntries = [...generatedTimetable.entries, entryWithId];
    
    console.log('Adding new entry to timetable');
    setGeneratedTimetable({
      ...generatedTimetable,
      entries: updatedEntries
    });

    return []; // No conflicts
  };

  // Check conflicts when updating entries
  const checkUpdateConflicts = (entryId: string, updates: Partial<TimetableEntry>): string[] => {
    if (!generatedTimetable) return [];
    
    const conflicts: string[] = [];
    const currentEntry = generatedTimetable.entries.find(e => e.id === entryId);
    if (!currentEntry) return conflicts;

    // FIXED: Check for time slot conflicts if day or time is being changed
    if ((updates.day && updates.day !== currentEntry.day) || 
        (updates.startTime && updates.startTime !== currentEntry.startTime)) {
      const newDay = updates.day || currentEntry.day;
      const newStartTime = updates.startTime || currentEntry.startTime;
      
      const timeConflicts = generatedTimetable.entries.filter(entry => 
        entry.id !== entryId &&
        entry.day === newDay &&
        entry.startTime === newStartTime
      );
      
      if (timeConflicts.length > 0) {
        conflicts.push(`TIME_CONFLICT: Time slot ${newDay} ${newStartTime} is already occupied`);
      }
    }

    // Check teacher conflicts if teacher is being changed
    if (updates.teacherId && updates.teacherId !== currentEntry.teacherId) {
      const newDay = updates.day || currentEntry.day;
      const newStartTime = updates.startTime || currentEntry.startTime;
      
      const teacherConflicts = generatedTimetable.entries.filter(entry => 
        entry.id !== entryId &&
        entry.teacherId === updates.teacherId &&
        entry.day === newDay &&
        entry.startTime === newStartTime
      );
      
      if (teacherConflicts.length > 0) {
        conflicts.push(`TEACHER_CONFLICT: ${updates.teacherId} is already assigned at ${newDay} ${newStartTime}`);
      }

      // FIXED: Check teacher weekly limit - exclude current entry from count
      const teacherWeeklyCount = generatedTimetable.entries.filter(entry => 
        entry.id !== entryId && entry.teacherId === updates.teacherId
      ).length;

      if (teacherWeeklyCount >= 3) {
        conflicts.push(`WORKLOAD_VIOLATION: Teacher ${updates.teacherId} would exceed 3 slots/week limit (currently ${teacherWeeklyCount})`);
      }
    }

    // Check room conflicts if room is being changed
    if (updates.roomId && updates.roomId !== currentEntry.roomId) {
      const newDay = updates.day || currentEntry.day;
      const newStartTime = updates.startTime || currentEntry.startTime;
      
      const roomConflicts = generatedTimetable.entries.filter(entry => 
        entry.id !== entryId &&
        entry.roomId === updates.roomId &&
        entry.day === newDay &&
        entry.startTime === newStartTime
      );
      
      if (roomConflicts.length > 0) {
        conflicts.push(`ROOM_CONFLICT: Room ${updates.roomId} is already occupied at ${newDay} ${newStartTime}`);
      }
    }

    // FIXED: Validate subject existence if subjectId is being changed
    if (updates.subjectId && updates.subjectId !== currentEntry.subjectId) {
      const subject = subjects.find(s => s.id === updates.subjectId);
      if (!subject) {
        conflicts.push(`INVALID_SUBJECT: Subject with ID "${updates.subjectId}" does not exist`);
      }
    }

    return conflicts;
  };

  // Check conflicts when adding new entries
  const checkAddConflicts = (newEntry: Omit<TimetableEntry, 'id'>): string[] => {
    if (!generatedTimetable) return [];
    
    const conflicts: string[] = [];

    // Check for time slot conflicts
    const timeConflicts = generatedTimetable.entries.filter(entry => 
      entry.day === newEntry.day &&
      entry.startTime === newEntry.startTime
    );
    
    if (timeConflicts.length > 0) {
      conflicts.push(`TIME_CONFLICT: Time slot ${newEntry.day} ${newEntry.startTime} is already occupied`);
    }

    // Check teacher conflicts
    if (newEntry.teacherId) {
      const teacherConflicts = generatedTimetable.entries.filter(entry => 
        entry.teacherId === newEntry.teacherId &&
        entry.day === newEntry.day &&
        entry.startTime === newEntry.startTime
      );
      
      if (teacherConflicts.length > 0) {
        conflicts.push(`TEACHER_CONFLICT: ${newEntry.teacherId} is already assigned at this time`);
      }

      // Check teacher weekly limit
      const teacherWeeklyCount = generatedTimetable.entries.filter(entry => 
        entry.teacherId === newEntry.teacherId
      ).length;

      if (teacherWeeklyCount >= 3) {
        conflicts.push(`WORKLOAD_VIOLATION: Teacher ${newEntry.teacherId} would exceed 3 slots/week limit`);
      }
    }

    // Check room conflicts
    if (newEntry.roomId) {
      const roomConflicts = generatedTimetable.entries.filter(entry => 
        entry.roomId === newEntry.roomId &&
        entry.day === newEntry.day &&
        entry.startTime === newEntry.startTime
      );
      
      if (roomConflicts.length > 0) {
        conflicts.push(`ROOM_CONFLICT: Room ${newEntry.roomId} is already occupied at this time`);
      }
    }

    // FIXED: Validate subject existence
    if (newEntry.subjectId) {
      const subject = subjects.find(s => s.id === newEntry.subjectId);
      if (!subject) {
        conflicts.push(`INVALID_SUBJECT: Subject with ID "${newEntry.subjectId}" does not exist`);
      }
    }

    // FIXED: Validate required fields
    if (!newEntry.subjectId || newEntry.subjectId.trim() === '') {
      conflicts.push(`MISSING_SUBJECT: Subject is required`);
    }
    
    if (!newEntry.teacherId || newEntry.teacherId.trim() === '') {
      conflicts.push(`MISSING_TEACHER: Teacher is required`);
    }

    return conflicts;
  };

  const generateTimetable = async () => {
    // Clear previous validation messages
    setValidationErrors([]);
    setValidationWarnings([]);
    
    if (subjects.length === 0) {
      setValidationErrors(['VALIDATION_ERROR: No subjects defined. Please add at least one subject to generate a timetable.']);
      return;
    }

    const config: TimetableConfig = {
      subjects,
      timeSlots,
      resources: [],
      constraints: []
    };

    const generator = new TimetableGenerator(config);
    
    // Pre-validation step
    const validation = generator.validateConfiguration();
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      return;
    }
    
    // Show warnings but continue if no errors
    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
    }

    setIsGenerating(true);
    
    // Simulate AI processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = generator.generateTimetable();
    
    setGeneratedTimetable(result);
    setIsGenerating(false);
  };

  const clearAll = () => {
    setSubjects([]);
    setGeneratedTimetable(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setSaveMessage(null);
  };

  // Handle save timetable to database
  const handleSaveTimetable = async () => {
    if (!generatedTimetable) {
      setSaveMessage({ type: 'error', text: 'No timetable to save' });
      return;
    }

    if (!saveForm.name.trim()) {
      setSaveMessage({ type: 'error', text: 'Please enter a name for the timetable' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/timetables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: saveForm.name.trim(),
          description: saveForm.description.trim(),
          subjects,
          timeSlots,
          generatedTimetable
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveMessage({ 
          type: 'success', 
          text: `Timetable "${saveForm.name}" saved successfully to database!` 
        });
        setShowSaveDialog(false);
        setSaveForm({ name: '', description: '' });
        setDbReloadTrigger(prev => prev + 1); // Trigger reload of saved list
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage({ 
          type: 'error', 
          text: result.error || 'Failed to save timetable' 
        });
      }
    } catch (error) {
      console.error('Error saving timetable:', error);
      setSaveMessage({ 
        type: 'error', 
        text: 'Network error: Could not connect to database' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ADDED: Save changes to the currently loaded timetable
  const handleSaveChangesToDatabase = async () => {
    if (!loadedTimetable || !generatedTimetable) return;

    setIsSavingChanges(true);
    try {
      const updatedTimetable = {
        ...loadedTimetable,
        generatedTimetable: {
          ...loadedTimetable.generatedTimetable,
          entries: generatedTimetable.entries
        },
        updatedAt: new Date(),
        metadata: {
          ...loadedTimetable.metadata,
          totalEntries: generatedTimetable.entries.length
        }
      };

      const response = await fetch(`/api/timetables/${loadedTimetable._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTimetable)
      });

      if (response.ok) {
        setLoadedTimetable(updatedTimetable);
        setHasUnsavedChanges(false);
        alert('Timetable changes saved successfully!');
      } else {
        throw new Error('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSavingChanges(false);
    }
  };

  // ADDED: Handle creating new timetable with unsaved changes check
  const handleCreateNewTimetable = () => {
    if (hasUnsavedChanges) {
      setPendingAction('new-timetable');
      setShowUnsavedModal(true);
    } else {
      executeCreateNewTimetable();
    }
  };

  // ADDED: Execute creating new timetable
  const executeCreateNewTimetable = () => {
    setLoadedTimetable(null);
    setGeneratedTimetable(null);
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    setPendingAction(null);
  };

  // ADDED: Handle unsaved changes modal actions
  const handleUnsavedModalSave = async () => {
    await handleSaveChangesToDatabase();
    if (pendingAction === 'new-timetable') {
      executeCreateNewTimetable();
    }
  };

  const handleUnsavedModalDiscard = () => {
    if (pendingAction === 'new-timetable') {
      executeCreateNewTimetable();
    }
  };

  const handleUnsavedModalCancel = () => {
    setShowUnsavedModal(false);
    setPendingAction(null);
  };

  // MODIFIED: Update the load timetable function to set loaded state
  const handleLoadTimetable = (timetable: SavedTimetable) => {
    if (hasUnsavedChanges) {
      // Store the timetable to load after handling unsaved changes
      const loadTimetableAfterConfirm = () => {
        // FIXED: Set subjects and timeSlots from loaded timetable
        setSubjects(timetable.subjects);
        setTimeSlots(timetable.timeSlots);
        setLoadedTimetable(timetable);
        setGeneratedTimetable({
          entries: timetable.generatedTimetable.entries,
          conflicts: [],
          success: true,
          completionRate: 100
        });
        setHasUnsavedChanges(false);
        
        // Clear any validation messages
        setValidationErrors([]);
        setValidationWarnings([]);
        
        console.log('Loaded timetable with subjects:', timetable.subjects.length, 'timeSlots:', timetable.timeSlots.length, 'entries:', timetable.generatedTimetable.entries.length);
      };
      
      // Show confirmation dialog
      if (confirm('You have unsaved changes. Loading a different timetable will discard them. Continue?')) {
        loadTimetableAfterConfirm();
      }
    } else {
      // FIXED: Set subjects and timeSlots from loaded timetable
      setSubjects(timetable.subjects);
      setTimeSlots(timetable.timeSlots);
      setLoadedTimetable(timetable);
      setGeneratedTimetable({
        entries: timetable.generatedTimetable.entries,
        conflicts: [],
        success: true,
        completionRate: 100
      });
      setHasUnsavedChanges(false);
      
      // Clear any validation messages
      setValidationErrors([]);
      setValidationWarnings([]);
      
      console.log('Loaded timetable with subjects:', timetable.subjects.length, 'timeSlots:', timetable.timeSlots.length, 'entries:', timetable.generatedTimetable.entries.length);
    }
  };

  // Handle deleting a timetable from the database
  const handleDeleteTimetableFromDB = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/timetables/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Timetable deleted successfully.' });
        return true;
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to delete timetable.' });
        return false;
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Network error while deleting.' });
      return false;
    }
  };

  // Handle downloading current timetable as PDF
  const handleDownloadCurrentPDF = async () => {
    if (!generatedTimetable) {
      setSaveMessage({ type: 'error', text: 'No timetable to download' });
      return;
    }

    setIsDownloadingPDF(true);
    
    try {
      // Create a temporary SavedTimetable object for PDF generation
      const tempTimetableData: SavedTimetable = {
        _id: 'temp-download',
        name: saveForm.name.trim() || 'Generated Timetable',
        description: saveForm.description.trim() || 'AI-generated timetable',
        subjects,
        timeSlots,
        generatedTimetable,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          totalSubjects: subjects.length,
          totalTimeSlots: timeSlots.length,
          completionRate: generatedTimetable.completionRate,
          conflictCount: generatedTimetable.conflicts.length
        }
      };

      // Generate and download the PDF
      generateTimetablePDF(tempTimetableData);
      
      setSaveMessage({ 
        type: 'success', 
        text: 'PDF downloaded successfully!' 
      });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setSaveMessage({ 
        type: 'error', 
        text: 'Failed to generate PDF. Please try again.' 
      });
    } finally {
      // Small delay to show the loading state
      setTimeout(() => {
        setIsDownloadingPDF(false);
      }, 1000);
    }
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
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              CSP-based scheduling with 50-minute periods • Max 3 slots per teacher/week • Intelligent conflict resolution
            </p>
            <div className="mt-4 flex justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>8 Daily Periods (8:30-16:30)</span>
              </div>
                             <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                 <span>Day Distribution Priority</span>
               </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Break Integration</span>
              </div>
            </div>
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
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-400">
                  <strong>CSP Algorithm:</strong> Max 3 slots per teacher/week with day distribution priority. Teacher slots are spread across different days when possible.
                </p>
              </div>
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
              <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-sm text-purple-400">
                  <strong>50-minute periods:</strong> 8:30-9:20, 9:20-10:10, 10:10-11:00, [Break], 11:30-12:20, 12:20-13:10, [Namaz], 14:00-14:50, 14:50-15:40, 15:40-16:30
                </p>
              </div>
              <TimeSlotForm 
                timeSlots={timeSlots}
                onUpdateTimeSlots={setTimeSlots}
              />
            </div>

            {/* Validation Messages */}
            {(validationErrors.length > 0 || validationWarnings.length > 0) && (
              <div className="space-y-3">
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Validation Errors ({validationErrors.length})
                    </h4>
                    <div className="space-y-2">
                      {validationErrors.map((error, index) => (
                        <div key={index} className="p-3 rounded-lg bg-red-500/20 border border-red-500/40">
                          <div className="text-sm text-red-300 font-mono">{error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation Warnings */}
                {validationWarnings.length > 0 && (
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <h4 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.684-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Validation Warnings ({validationWarnings.length})
                    </h4>
                    <div className="space-y-2">
                      {validationWarnings.map((warning, index) => (
                        <div key={index} className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/40">
                          <div className="text-sm text-yellow-300 font-mono">{warning}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <div className="text-sm text-blue-400">
                        <strong>Note:</strong> Warnings indicate potential issues but will not prevent timetable generation. Review and adjust if needed.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={generateTimetable}
                  disabled={isGenerating || subjects.length === 0 || validationErrors.length > 0}
                  className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 translate-y-full transition-transform duration-300 group-hover:translate-y-0"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2 hover:cursor-pointer">
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin cursor-not-allowed"></div>
                        Generating...
                      </>
                    ) : validationErrors.length > 0 ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                        </svg>
                        Fix Errors First
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

              {/* Save Button */}
              {generatedTimetable && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-700 to-emerald-700 translate-y-full transition-transform duration-300 group-hover:translate-y-0"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Save to Database
                  </span>
                </button>
              )}

              {/* Download PDF Button */}
              {generatedTimetable && (
                <button
                  onClick={handleDownloadCurrentPDF}
                  disabled={isDownloadingPDF}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 translate-y-full transition-transform duration-300 group-hover:translate-y-0"></div>
                  <span className="">
                    {isDownloadingPDF ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </>
                    )}
                  </span>
                </button>
              )}

              {/* Save Success/Error Message */}
              {saveMessage && (
                <div className={`p-4 rounded-xl border ${
                  saveMessage.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className={`text-sm font-medium ${
                    saveMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {saveMessage.text}
                  </div>
                </div>
              )}

              {/* PDF Info */}
              {generatedTimetable && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-purple-400">Professional PDF Export</span>
                  </div>
                  <p className="text-xs text-purple-300">
                    Download industry-standard academic timetables ready for university/college use. 
                    PDFs include proper formatting, institution branding area, and complete metadata.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-8">
            {/* Timetable Display */}
            {generatedTimetable && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">Generated Timetable</h2>
                  
                  <div className="flex gap-3">
                    {/* Create New Timetable Button - shown when viewing loaded timetable */}
                    {loadedTimetable && (
                      <button
                        onClick={handleCreateNewTimetable}
                        className="group relative overflow-hidden rounded-xl bg-indigo-600 to-blue-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create New Timetable
                        </span>
                      </button>
                    )}

                    {/* PDF Download Button */}
                    <button
                      onClick={handleDownloadCurrentPDF}
                      disabled={isDownloadingPDF}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {isDownloadingPDF ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Loaded Timetable Info */}
                {loadedTimetable && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-400 mb-1">
                          📋 Viewing: {loadedTimetable.name}
                          {hasUnsavedChanges && <span className="ml-2 text-amber-400">• Unsaved Changes</span>}
                        </h3>
                        <p className="text-sm text-blue-300">
                          {loadedTimetable.description || 'No description'}
                        </p>
                      </div>
                      {hasUnsavedChanges && (
                        <div className="text-amber-400 text-sm">
                          ⚠️ You have unsaved changes
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Completion Summary */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
                    <h3 className="font-semibold text-green-400 mb-2">Generation Results</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-green-300">
                        <span>Completion Rate:</span>
                        <span>{generatedTimetable.completionRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-green-300">
                        <span>Total Entries:</span>
                        <span>{generatedTimetable.entries.length}</span>
                      </div>
                      <div className="flex justify-between text-green-300">
                        <span>Status:</span>
                        <span className={generatedTimetable.success ? 'text-green-400' : 'text-yellow-400'}>
                          {generatedTimetable.success ? 'Complete' : 'Partial'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                    <h3 className="font-semibold text-blue-400 mb-2">Conflicts</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-blue-300">
                        <span>Total Conflicts:</span>
                        <span className={generatedTimetable.conflicts.length === 0 ? 'text-green-400' : 'text-red-400'}>
                          {generatedTimetable.conflicts.length}
                        </span>
                      </div>
                      {generatedTimetable.conflicts.length > 0 && (
                        <div className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded-lg max-h-20 overflow-y-auto">
                          {generatedTimetable.conflicts.slice(0, 2).map((conflict, index) => (
                            <div key={index} className="truncate">{conflict.type}: {conflict.description.split('\n')[0]}</div>
                          ))}
                          {generatedTimetable.conflicts.length > 2 && (
                            <div className="text-blue-400">... and {generatedTimetable.conflicts.length - 2} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timetable Grid */}
                <TimetableGrid
                  timetable={generatedTimetable}
                  timeSlots={timeSlots}
                  subjects={subjects}
                  onUpdateEntry={handleUpdateEntry}
                  onDeleteEntry={handleDeleteEntry}
                  onAddEntry={handleAddEntry}
                />

                {/* Save Changes Button - only shown when timetable is loaded from database */}
                {loadedTimetable && (
                  <div className="flex justify-center pt-6">
                    <button
                      onClick={handleSaveChangesToDatabase}
                      disabled={!hasUnsavedChanges || isSavingChanges}
                      className={`group relative overflow-hidden rounded-xl px-8 py-4 font-semibold text-white transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                        hasUnsavedChanges 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-green-500/25' 
                          : 'bg-gradient-to-r from-gray-600 to-gray-700'
                      }`}
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        {isSavingChanges ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            Saving Changes...
                          </>
                        ) : hasUnsavedChanges ? (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Save Changes to Database
                            <div className="px-2 py-1 text-xs bg-white/20 rounded-lg">
                              Unsaved
                            </div>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            All Changes Saved
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                )}
              </section>
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

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-semibold text-foreground mb-6">Save Timetable</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Timetable Name *
                </label>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                  placeholder="e.g., Computer Science Semester 1"
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={saveForm.description}
                  onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                  placeholder="Brief description of this timetable..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                />
              </div>

              {/* Save Stats */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <h4 className="font-medium text-foreground mb-2">Timetable Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Subjects</div>
                    <div className="text-foreground font-medium">{subjects.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Time Slots</div>
                    <div className="text-foreground font-medium">{timeSlots.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Completion Rate</div>
                    <div className="text-foreground font-medium">
                      {generatedTimetable?.completionRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Conflicts</div>
                    <div className="text-foreground font-medium">
                      {generatedTimetable?.conflicts.length || 0}
                    </div>
                  </div>
                </div>
              </div>

              {saveMessage && saveMessage.type === 'error' && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="text-sm text-red-400">{saveMessage.text}</div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveTimetable}
                disabled={isSaving || !saveForm.name.trim()}
                className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Save to Database
                    </>
                  )}
                </span>
              </button>
              
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveForm({ name: '', description: '' });
                  setSaveMessage(null);
                }}
                disabled={isSaving}
                className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Timetables Section */}
      <section className="container mx-auto px-6 py-12">
        <SavedTimetables 
          onLoadTimetable={handleLoadTimetable}
          onDeleteTimetable={handleDeleteTimetableFromDB}
          triggerReload={dbReloadTrigger}
        />
      </section>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <EditEntryModal
          isOpen={!!editingEntry}
          entry={editingEntry}
          subjects={subjects}
          onSave={handleUpdateEntry}
          onDelete={handleDeleteEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Add Entry Modal */}
      {addingToSlot && (
        <AddEntryModal
          isOpen={!!addingToSlot}
          slot={addingToSlot ? {
            id: `slot-${addingToSlot.day}-${addingToSlot.startTime}`,
            day: addingToSlot.day,
            startTime: addingToSlot.startTime,
            endTime: addingToSlot.endTime,
            duration: 50
          } : null}
          subjects={subjects}
          onAdd={handleAddEntry}
          onClose={() => setAddingToSlot(null)}
        />
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-semibold text-foreground mb-6">Unsaved Changes</h3>
            <p className="text-muted-foreground mb-4">
              You have unsaved changes. Creating a new timetable will discard them.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleUnsavedModalSave}
                disabled={isSavingChanges}
                className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSavingChanges ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </span>
              </button>
              <button
                onClick={handleUnsavedModalDiscard}
                disabled={isSavingChanges}
                className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                onClick={handleUnsavedModalCancel}
                disabled={isSavingChanges}
                className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
