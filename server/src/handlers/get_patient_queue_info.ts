
import { db } from '../db';
import { queueEntriesTable } from '../db/schema';
import { type PatientQueueInfo } from '../schema';
import { eq, and, lt } from 'drizzle-orm';

export const getPatientQueueInfo = async (patientId: string): Promise<PatientQueueInfo | null> => {
  try {
    // Find the patient's current queue entry (not completed or cancelled)
    const queueEntries = await db.select()
      .from(queueEntriesTable)
      .where(
        and(
          eq(queueEntriesTable.patient_id, patientId),
          eq(queueEntriesTable.status, 'WAITING')
        )
      )
      .execute();

    if (queueEntries.length === 0) {
      return null;
    }

    const queueEntry = queueEntries[0];

    // Count how many patients are ahead in the same specialty queue
    const patientsAhead = await db.select()
      .from(queueEntriesTable)
      .where(
        and(
          eq(queueEntriesTable.specialty, queueEntry.specialty),
          eq(queueEntriesTable.status, 'WAITING'),
          lt(queueEntriesTable.queue_number, queueEntry.queue_number)
        )
      )
      .execute();

    const positionInQueue = patientsAhead.length + 1; // +1 because position is 1-based

    // Simple estimation: 15 minutes per patient ahead
    const estimatedWaitTime = patientsAhead.length * 15;

    return {
      queue_entry: queueEntry,
      position_in_queue: positionInQueue,
      estimated_wait_time: estimatedWaitTime
    };
  } catch (error) {
    console.error('Failed to get patient queue info:', error);
    throw error;
  }
};
