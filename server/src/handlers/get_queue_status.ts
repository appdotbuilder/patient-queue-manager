
import { db } from '../db';
import { queueEntriesTable } from '../db/schema';
import { type QueueStatusResponse } from '../schema';
import { eq, max, count, and } from 'drizzle-orm';

export const getQueueStatus = async (): Promise<QueueStatusResponse[]> => {
  try {
    // Get all specialties that have queue entries
    const specialtyStats = await db
      .select({
        specialty: queueEntriesTable.specialty,
        total_waiting: count(queueEntriesTable.id),
        current_queue_number: max(queueEntriesTable.queue_number)
      })
      .from(queueEntriesTable)
      .where(eq(queueEntriesTable.status, 'WAITING'))
      .groupBy(queueEntriesTable.specialty)
      .execute();

    // Calculate estimated wait times (assuming 15 minutes per patient as baseline)
    const AVERAGE_CONSULTATION_TIME = 15; // minutes

    const queueStatuses: QueueStatusResponse[] = specialtyStats.map(stat => ({
      specialty: stat.specialty,
      total_waiting: stat.total_waiting,
      current_queue_number: stat.current_queue_number || 0,
      estimated_wait_time: stat.total_waiting * AVERAGE_CONSULTATION_TIME
    }));

    return queueStatuses;
  } catch (error) {
    console.error('Failed to get queue status:', error);
    throw error;
  }
};
