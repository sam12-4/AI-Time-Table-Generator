import { NextRequest, NextResponse } from 'next/server';
import { loadTimetable, updateTimetable, deleteTimetable } from '@/lib/mongodb';

// GET - Load specific timetable by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const timetable = await loadTimetable(id);

    if (!timetable) {
      return NextResponse.json(
        { success: false, error: 'Timetable not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: timetable });
  } catch (error: any) {
    console.error('Error in GET /api/timetables/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load timetable' },
      { status: 500 }
    );
  }
}

// PUT - Update specific timetable
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates = await request.json();

    const success = await updateTimetable(id, updates);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Timetable not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Timetable updated successfully' 
    });
  } catch (error: any) {
    console.error('Error in PUT /api/timetables/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update timetable' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific timetable
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const success = await deleteTimetable(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Timetable not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Timetable deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/timetables/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete timetable' },
      { status: 500 }
    );
  }
} 