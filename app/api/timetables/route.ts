import { NextRequest, NextResponse } from 'next/server';
import { saveTimetable, loadAllTimetables, getTimetableStats } from '@/lib/mongodb';
import { GeneratedTimetable, Subject, TimeSlot } from '@/types/timetable';

// GET - Load all timetables or get statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getTimetableStats();
      return NextResponse.json({ success: true, data: stats });
    } else {
      const timetables = await loadAllTimetables();
      return NextResponse.json({ success: true, data: timetables });
    }
  } catch (error: any) {
    console.error('Error in GET /api/timetables:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch timetables' },
      { status: 500 }
    );
  }
}

// POST - Save new timetable
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, subjects, timeSlots, generatedTimetable } = body;

    // Validate required fields
    if (!name || !subjects || !timeSlots || !generatedTimetable) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, subjects, timeSlots, generatedTimetable' },
        { status: 400 }
      );
    }

    const timetableId = await saveTimetable({
      name,
      description,
      subjects,
      timeSlots,
      generatedTimetable
    });

    return NextResponse.json({ 
      success: true, 
      data: { id: timetableId },
      message: 'Timetable saved successfully'
    });
  } catch (error: any) {
    console.error('Error in POST /api/timetables:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save timetable' },
      { status: 500 }
    );
  }
} 