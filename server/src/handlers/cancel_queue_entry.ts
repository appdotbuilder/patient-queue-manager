
import { db } from '../db';
import { queueEntriesTable, displayBoardEntriesTable } from '../db/schema';
import { type QueueEntry } from '../schema';
import { eq } from 'drizzle-orm';

export const cancelQueueEntry = async (queueEntryId: number): Promise<QueueEntry> => {
  try {
    // Update the queue entry status to 'CANCELLED'
    const result = await db.update(queueEntriesTable)
      .set({ status: 'CANCELLED' })
      .where(eq(queueEntriesTable.id, queueEntryId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Queue entry with id ${queueEntryId} not found`);
    }

    const updatedEntry = result[0];

    // Remove from display board if currently displayed
    await db.delete(displayBoardEntriesTable)
      .where(eq(displayBoardEntriesTable.patient_id, updatedEntry.patient_id))
      .execute();

    return updatedEntry;
  } catch (error) {
    console.error('Queue entry cancellation failed:', error);
    throw error;
  }
};
