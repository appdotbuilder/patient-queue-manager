
import { db } from '../db';
import { queueEntriesTable } from '../db/schema';
import { type JoinQueueInput, type QueueEntry } from '../schema';
import { eq, max } from 'drizzle-orm';

export const joinQueue = async (input: JoinQueueInput): Promise<QueueEntry> => {
  try {
    // Get the highest queue number for this specialty to generate the next number
    const maxQueueResult = await db.select({ 
      maxNumber: max(queueEntriesTable.queue_number) 
    })
      .from(queueEntriesTable)
      .where(eq(queueEntriesTable.specialty, input.specialty))
      .execute();

    // Calculate next queue number (start from 1 if no entries exist)
    const nextQueueNumber = (maxQueueResult[0]?.maxNumber || 0) + 1;

    // Insert new queue entry
    const result = await db.insert(queueEntriesTable)
      .values({
        patient_id: input.patient_id,
        specialty: input.specialty,
        queue_number: nextQueueNumber,
        status: 'WAITING',
        doctor_id: null,
        room_number: null,
        called_at: null,
        completed_at: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Failed to join queue:', error);
    throw error;
  }
};
