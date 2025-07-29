import { MongoClient, Db, ObjectId } from 'mongodb';
import { GeneratedTimetable, Subject, TimeSlot } from '@/types/timetable';

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_timetable_generator';

let client: MongoClient | null = null;
let db: Db | null = null;

// Connect to MongoDB
export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB successfully');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Disconnect from MongoDB
export async function disconnectFromDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('Disconnected from MongoDB');
  }
}

// Timetable interface for database storage
export interface SavedTimetable {
  _id: string | ObjectId; // Use string for client, ObjectId for server
  name: string;
  description?: string;
  subjects: Subject[];
  timeSlots: TimeSlot[];
  generatedTimetable: GeneratedTimetable;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    totalSubjects: number;
    totalTimeSlots: number;
    completionRate: number;
    conflictCount: number;
  };
}

// Save timetable to database
export async function saveTimetable(timetableData: {
  name: string;
  description?: string;
  subjects: Subject[];
  timeSlots: TimeSlot[];
  generatedTimetable: GeneratedTimetable;
}): Promise<string> {
  try {
    const database = await connectToDatabase();
    const collection = database.collection<Omit<SavedTimetable, '_id'>>('timetables');

    const savedTimetable: Omit<SavedTimetable, '_id'> = {
      ...timetableData,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        totalSubjects: timetableData.subjects.length,
        totalTimeSlots: timetableData.timeSlots.length,
        completionRate: timetableData.generatedTimetable.completionRate,
        conflictCount: timetableData.generatedTimetable.conflicts.length
      }
    };

    const result = await collection.insertOne(savedTimetable);
    console.log('Timetable saved successfully with ID:', result.insertedId);
    return result.insertedId.toHexString();
  } catch (error) {
    console.error('Error saving timetable:', error);
    throw new Error('Failed to save timetable to database');
  }
}

// Load all timetables from database
export async function loadAllTimetables(): Promise<SavedTimetable[]> {
  try {
    const database = await connectToDatabase();
    const collection = database.collection<SavedTimetable>('timetables');

    const timetables = await collection
      .find({})
      .sort({ updatedAt: -1 })
      .toArray();

    console.log(`Loaded ${timetables.length} timetables from database`);
    // Convert ObjectId to string for client-side usage
    return timetables.map(t => ({ ...t, _id: t._id!.toString() as any }));
  } catch (error) {
    console.error('Error loading timetables:', error);
    throw new Error('Failed to load timetables from database');
  }
}

// Load specific timetable by ID
export async function loadTimetable(id: string): Promise<SavedTimetable | null> {
  try {
    if (!ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format:', id);
      return null;
    }
    const database = await connectToDatabase();
    const collection = database.collection<SavedTimetable>('timetables');
    
    const timetable = await collection.findOne({ _id: new ObjectId(id) });
    
    if (timetable) {
      console.log('Timetable loaded successfully:', id);
      // Convert ObjectId to string before sending to client
      return { ...timetable, _id: timetable._id!.toString() };
    } else {
      console.log('Timetable not found:', id);
      return null;
    }
  } catch (error) {
    console.error('Error loading timetable:', error);
    throw new Error('Failed to load timetable from database');
  }
}

// Update existing timetable
export async function updateTimetable(
  id: string, 
  updates: Partial<SavedTimetable>
): Promise<boolean> {
  try {
    if (!ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format for update:', id);
      return false;
    }
    const database = await connectToDatabase();
    const collection = database.collection<SavedTimetable>('timetables');

    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    delete (updateData as any)._id;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating timetable:', error);
    throw new Error('Failed to update timetable in database');
  }
}

// Delete timetable from database
export async function deleteTimetable(id: string): Promise<boolean> {
  try {
    if (!ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format for delete:', id);
      return false;
    }
    const database = await connectToDatabase();
    const collection = database.collection<SavedTimetable>('timetables');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting timetable:', error);
    throw new Error('Failed to delete timetable from database');
  }
}

// Get timetable statistics
export async function getTimetableStats(): Promise<{
  totalTimetables: number;
  averageCompletionRate: number;
  totalSubjects: number;
  totalConflicts: number;
  lastUpdated: Date | null;
}> {
  try {
    const database = await connectToDatabase();
    const collection = database.collection<SavedTimetable>('timetables');

    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalTimetables: { $sum: 1 },
          averageCompletionRate: { $avg: '$metadata.completionRate' },
          totalSubjects: { $sum: '$metadata.totalSubjects' },
          totalConflicts: { $sum: '$metadata.conflictCount' },
          lastUpdated: { $max: '$updatedAt' }
        }
      }
    ]).toArray();

    if (stats.length > 0) {
      const result = stats[0];
      return {
        totalTimetables: result.totalTimetables || 0,
        averageCompletionRate: result.averageCompletionRate || 0,
        totalSubjects: result.totalSubjects || 0,
        totalConflicts: result.totalConflicts || 0,
        lastUpdated: result.lastUpdated || null
      };
    }

    return {
      totalTimetables: 0,
      averageCompletionRate: 0,
      totalSubjects: 0,
      totalConflicts: 0,
      lastUpdated: null
    };
  } catch (error) {
    console.error('Error getting timetable stats:', error);
    throw new Error('Failed to get timetable statistics');
  }
} 