
import { db } from '../db';
import { queueEntriesTable, doctorsTable, displayBoardEntriesTable } from '../db/schema';
import { type CompletePatientInput, type QueueEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const completePatient = async (input: CompletePatientInput): Promise<QueueEntry> => {
  try {
    // First, verify the queue entry exists and is assigned to the doctor
    const existingEntries = await db.select()
      .from(queueEntriesTable)
      .where(
        and(
          eq(queueEntriesTable.id, input.queue_entry_id),
          eq(queueEntriesTable.doctor_id, input.doctor_id)
        )
      )
      .execute();

    if (existingEntries.length === 0) {
      throw new Error('Queue entry not found or not assigned to this doctor');
    }

    const existingEntry = existingEntries[0];

    // Update the queue entry to completed status
    const updatedEntries = await db.update(queueEntriesTable)
      .set({
        status: 'COMPLETED',
        completed_at: new Date()
      })
      .where(eq(queueEntriesTable.id, input.queue_entry_id))
      .returning()
      .execute();

    const updatedEntry = updatedEntries[0];

    // Remove from display board if present
    await db.delete(displayBoardEntriesTable)
      .where(eq(displayBoardEntriesTable.patient_id, existingEntry.patient_id))
      .execute();

    // Update doctor status to available
    await db.update(doctorsTable)
      .set({
        status: 'AVAILABLE'
      })
      .where(eq(doctorsTable.id, input.doctor_id))
      .execute();

    return updatedEntry;
  } catch (error) {
    console.error('Complete patient failed:', error);
    throw error;
  }
};
